from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os
from dotenv import load_dotenv
import settings
import time
import json
import hashlib
import redis
from rq import Queue
from rq.job import Job
from datetime import timezone
from storage import storage_health
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4
import logging

# Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

REQUEST_COUNT = Counter(
    'http_requests_total', 'Total HTTP requests', ['route', 'status']
)
AV_CALLS = Counter('alpha_vantage_calls_total', 'Alpha Vantage upstream calls', ['type'])
CACHE_HITS = Counter('cache_hits_total', 'Cache hits', ['key'])
JOB_ENQUEUED = Counter('jobs_enqueued_total', 'Jobs enqueued', ['task'])
JOB_DURATION = Histogram('job_duration_seconds', 'Background job durations', ['task'])

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get('x-request-id') or str(uuid4())
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            if response is None:
                response = Response()
            response.headers['x-request-id'] = request_id


app.add_middleware(RequestIdMiddleware)

logger = logging.getLogger("stockhub")
logging.basicConfig(level=logging.INFO)

# Get Alpha Vantage API key from environment variables
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')
MODEL_VERSION = os.getenv('MODEL_VERSION', 'v1')
ADMIN_API_KEY = os.getenv('ADMIN_API_KEY')
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY')

# Redis
REDIS_URL = os.getenv('REDIS_URL')
redis_client = None
if REDIS_URL:
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        # simple ping to validate
        redis_client.ping()
    except Exception:
        redis_client = None

job_queue = None
if redis_client:
    try:
        job_queue = Queue('default', connection=redis.Redis.from_url(REDIS_URL))
    except Exception:
        job_queue = None

def _cache_get(key: str):
    if not redis_client:
        return None
    try:
        val = redis_client.get(key)
        if val is not None:
            CACHE_HITS.labels(key=key.split(':')[0]).inc()
        return val
    except Exception:
        return None

def _cache_set(key: str, value: str, ttl_seconds: int):
    if not redis_client:
        return
    try:
        redis_client.set(key, value, ex=ttl_seconds)
    except Exception:
        pass

def _throttle(symbol: str, window_seconds: int = 5):
    """Simple per-symbol throttle to protect upstream provider."""
    if not redis_client:
        return
    key = f"throttle:{symbol}"
    try:
        if redis_client.exists(key):
            # within window, skip setting; caller should decide to use cache
            return True
        # set short-lived key
        redis_client.set(key, '1', ex=window_seconds)
        return False
    except Exception:
        return

def _request_with_backoff(url, max_retries=3):
    """Perform a GET with simple exponential backoff for AV rate limits."""
    backoff = 1
    last_err = None
    for _ in range(max_retries):
        try:
            resp = requests.get(url, timeout=15)
            # Alpha Vantage sometimes returns 200 with a "Note" when throttled
            if resp.status_code == 429:
                last_err = HTTPException(status_code=429, detail='Rate limited by provider')
                time.sleep(backoff)
                backoff *= 2
                continue
            data = resp.json()
            if isinstance(data, dict) and data.get('Note'):
                last_err = HTTPException(status_code=429, detail='Rate limited by provider')
                time.sleep(backoff)
                backoff *= 2
                continue
            return data
        except Exception as e:
            last_err = e
            time.sleep(backoff)
            backoff *= 2
    if isinstance(last_err, HTTPException):
        raise last_err
    raise HTTPException(status_code=502, detail=str(last_err) if last_err else 'Upstream error')


def _standardize_articles(items):
    """Map provider-specific items into a standard article dict shape.
    Expected return list entries:
    { id, title, source, url, imageUrl, publishedAt, summary }
    """
    cleaned = []
    for it in items:
        # ensure minimal required fields
        if not it.get('title') or not it.get('url'):
            continue
        cleaned.append({
            "id": it.get('id') or hashlib.md5((it.get('url') or it.get('title')).encode('utf-8')).hexdigest(),
            "title": it.get('title'),
            "source": it.get('source') or 'unknown',
            "url": it.get('url'),
            "imageUrl": it.get('imageUrl') or '',
            "publishedAt": it.get('publishedAt') or datetime.utcnow().isoformat() + 'Z',
            "summary": it.get('summary') or ''
        })
    # sort newest first
    try:
        cleaned.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)
    except Exception:
        pass
    return cleaned


def _fetch_news_finnhub(symbol: Optional[str] = None, limit: int = 6):
    if not FINNHUB_API_KEY:
        return []
    try:
        if symbol:
            # company news for last 14 days
            today = datetime.utcnow().date()
            frm = (today - timedelta(days=14)).isoformat()
            to = today.isoformat()
            url = f"https://finnhub.io/api/v1/company-news?symbol={symbol.upper()}&from={frm}&to={to}&token={FINNHUB_API_KEY}"
            data = requests.get(url, timeout=15).json()
        else:
            url = f"https://finnhub.io/api/v1/news?category=general&token={FINNHUB_API_KEY}"
            data = requests.get(url, timeout=15).json()
        items = []
        for d in data[: max(20, limit)]:
            items.append({
                "id": str(d.get('id') or d.get('datetime') or ''),
                "title": d.get('headline'),
                "source": d.get('source'),
                "url": d.get('url'),
                "imageUrl": d.get('image'),
                "publishedAt": datetime.utcfromtimestamp(int(d.get('datetime', 0))).isoformat() + 'Z' if d.get('datetime') else None,
                "summary": d.get('summary')
            })
        return _standardize_articles(items)[:limit]
    except Exception:
        return []


def _fetch_news_alphavantage(symbol: Optional[str] = None, limit: int = 6):
    if not ALPHA_VANTAGE_API_KEY:
        return []
    try:
        base = "https://www.alphavantage.co/query?function=NEWS_SENTIMENT"
        params = []
        if symbol:
            params.append(f"tickers={symbol.upper()}")
        else:
            # general market topics
            params.append("topics=financial_markets,earnings,technology,ipo")
        params.append("sort=LATEST")
        params.append(f"apikey={ALPHA_VANTAGE_API_KEY}")
        params.append("limit=50")
        url = base + "&" + "&".join(params)
        data = _request_with_backoff(url)
        feed = data.get('feed', []) if isinstance(data, dict) else []
        items = []
        for f in feed:
            # Alpha Vantage time like 20250101T120000
            tp = f.get('time_published')
            iso = None
            if tp and len(tp) >= 8:
                try:
                    iso = datetime.strptime(tp[:15], "%Y%m%dT%H%M%S").isoformat() + 'Z'
                except Exception:
                    try:
                        iso = datetime.strptime(tp[:13], "%Y%m%dT%H%M").isoformat() + 'Z'
                    except Exception:
                        iso = None
            items.append({
                "id": f.get('guid') or f.get('title'),
                "title": f.get('title'),
                "source": f.get('source'),
                "url": f.get('url'),
                "imageUrl": f.get('banner_image'),
                "publishedAt": iso,
                "summary": f.get('summary')
            })
        return _standardize_articles(items)[:limit]
    except Exception:
        return []


def fetch_news(symbol: Optional[str] = None, limit: int = 6):
    """Try multiple providers and return up to limit standardized articles."""
    # Provider priority: Finnhub -> Alpha Vantage
    articles = []
    try:
        articles = _fetch_news_finnhub(symbol, limit)
    except Exception:
        articles = []
    if len(articles) < limit:
        try:
            extra = _fetch_news_alphavantage(symbol, limit)
            # merge de-duplicating by url
            seen = {a['url'] for a in articles}
            for a in extra:
                if a['url'] not in seen:
                    articles.append(a)
                    seen.add(a['url'])
                if len(articles) >= limit:
                    break
        except Exception:
            pass
    return articles[:limit]

def fetch_stock_data(symbol):
    """Fetch historical stock data from Alpha Vantage."""
    t0 = time.perf_counter()
    cache_key = f"av:daily:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            payload = json.loads(cached)
            if isinstance(payload, list) and payload:
                print(json.dumps({"route": "av_daily", "symbol": symbol, "cache_hit": True, "latency_ms": int((time.perf_counter()-t0)*1000)}))
                return payload
        except Exception:
            pass

    # optional throttle to avoid bursts
    throttled = _throttle(f"daily:{symbol}")

    url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}&outputsize=compact'
    data = _request_with_backoff(url)
    AV_CALLS.labels(type='daily').inc()
    
    if "Error Message" in data:
        raise Exception(data["Error Message"])
    
    time_series = data.get('Time Series (Daily)', {})
    historical_data = []
    
    for date, values in time_series.items():
        historical_data.append({
            'date': date,
            'price': float(values['4. close'])
        })
    
    historical_data = sorted(historical_data, key=lambda x: x['date'])
    _cache_set(cache_key, json.dumps(historical_data), ttl_seconds=30 * 60)
    print(json.dumps({"route": "av_daily", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000)}))
    return historical_data

def fetch_global_quote(symbol):
    """Fetch current price and previous close using GLOBAL_QUOTE."""
    t0 = time.perf_counter()
    cache_key = f"av:quote:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            js = json.loads(cached)
            print(json.dumps({"route": "av_quote", "symbol": symbol, "cache_hit": True, "latency_ms": int((time.perf_counter()-t0)*1000)}))
            return float(js['price']), float(js['previousClose'])
        except Exception:
            pass

    throttled = _throttle(f"quote:{symbol}")

    url = f'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}'
    data = _request_with_backoff(url)
    AV_CALLS.labels(type='quote').inc()
    quote = data.get('Global Quote') or {}
    if not quote:
        raise HTTPException(status_code=502, detail='No quote data available')
    try:
        price = float(quote.get('05. price', 0))
        prev_close = float(quote.get('08. previous close', 0))
    except Exception:
        raise HTTPException(status_code=502, detail='Invalid quote data format')
    _cache_set(cache_key, json.dumps({"price": price, "previousClose": prev_close}), ttl_seconds=10 * 60)
    print(json.dumps({"route": "av_quote", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000)}))
    return price, prev_close


def fetch_intraday(symbol: str, interval: str = '1min'):
    """Fetch today's intraday series (ET) and filter to regular session 09:30–16:00.
    Returns a list of { time: 'HH:MM', price: float } sorted by time.
    """
    t0 = time.perf_counter()
    cache_key = f"av:intraday:{interval}:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            payload = json.loads(cached)
            print(json.dumps({"route": "av_intraday", "symbol": symbol, "cache_hit": True, "latency_ms": int((time.perf_counter()-t0)*1000)}))
            return payload
        except Exception:
            pass

    throttled = _throttle(f"intraday:{symbol}")

    url = (
        f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY"
        f"&symbol={symbol}&interval={interval}&apikey={ALPHA_VANTAGE_API_KEY}&outputsize=compact"
    )
    data = _request_with_backoff(url)
    AV_CALLS.labels(type='intraday').inc()
    # Data key name depends on interval
    key = f"Time Series ({interval})"
    series = data.get(key, {}) if isinstance(data, dict) else {}

    et = ZoneInfo('America/New_York')
    now_et = datetime.now(et)
    session_date = now_et.date()
    open_time = datetime.combine(session_date, datetime.min.time(), et).replace(hour=9, minute=30)
    close_time = datetime.combine(session_date, datetime.min.time(), et).replace(hour=16, minute=0)

    points = []
    for ts_str, values in series.items():
        try:
            # Alpha Vantage timestamps are in ET
            ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=et)
        except Exception:
            continue
        if ts.date() != session_date:
            continue
        if ts < open_time or ts > close_time:
            continue
        try:
            price = float(values.get('4. close') or values.get('1. open') or 0)
        except Exception:
            continue
        points.append({"time": ts.strftime('%H:%M'), "price": price})

    points = sorted(points, key=lambda x: x['time'])
    state = 'open' if (now_et.weekday() < 5 and open_time <= now_et <= close_time) else 'closed'
    result = {"points": points, "market": state, "asOf": now_et.isoformat()}
    # Short cache as data moves intraday
    _cache_set(cache_key, json.dumps(result), ttl_seconds=60)
    print(json.dumps({"route": "av_intraday", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000)}))
    return result

def calculate_prediction(prices, days_ahead=1):
    """Simple prediction based on moving average and trend."""
    prices = np.array(prices)
    ma = np.mean(prices[-5:])  # 5-day moving average
    trend = (prices[-1] - prices[-5]) / 5  # Average daily change
    prediction = ma + (trend * days_ahead)
    return max(0, prediction)  # Ensure prediction is not negative

@app.get("/")
async def root():
    REQUEST_COUNT.labels(route='/', status='200').inc()
    return {"status": "API is running", "message": "Hello from Stock Hub API!"}

@app.get("/api/predictions/{symbol}")
async def get_predictions(symbol: str):
    started = time.perf_counter()
    try:
        # Check cached prediction (keyed by model version) BEFORE any upstream calls
        pred_key = f"pred:simple:{MODEL_VERSION}:{symbol}"
        cached_pred = _cache_get(pred_key)
        if cached_pred:
            try:
                js = json.loads(cached_pred)
                print(json.dumps({"route": "/api/predictions", "symbol": symbol, "cache_hit": True, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
                REQUEST_COUNT.labels(route='/api/predictions', status='200').inc()
                return js
            except Exception:
                pass

        # If no cached prediction and we have a queue, enqueue and return 202
        if job_queue:
            try:
                # enqueue callable by reference if possible
                from worker import job_predict_next
                job = job_queue.enqueue(job_predict_next, symbol)
                JOB_ENQUEUED.labels(task='predict_next').inc()
                print(json.dumps({"route": "/api/predictions", "symbol": symbol, "queued": True, "job_id": job.id, "status": 202, "latency_ms": int((time.perf_counter()-started)*1000)}))
                return JSONResponse(content={"job_id": job.id}, status_code=202)
            except Exception:
                # If enqueue fails for any reason (e.g., Redis connectivity), fall back to synchronous compute
                pass

        # Fallback: Calculate prediction synchronously (no queue available)
        # Fetch historical data
        historical_data = fetch_stock_data(symbol)
        if not historical_data:
            return {"error": "No data available for this symbol"}

        # Get closing prices
        prices = [entry['price'] for entry in historical_data]

        # Calculate next day's date
        last_date = datetime.strptime(historical_data[-1]['date'], '%Y-%m-%d')
        next_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')

        predicted_price = calculate_prediction(prices)
        current_price = prices[-1]
        change_percent = ((predicted_price - current_price) / current_price) * 100
        
        # Calculate accuracy (simplified)
        accuracy = 85  # Base accuracy
        recent_volatility = np.std(prices[-10:]) / np.mean(prices[-10:])
        accuracy = max(75, min(95, accuracy - (recent_volatility * 100)))
        
        response = {
            "prediction": {
                "date": next_date,
                "price": predicted_price,
                "change_percent": change_percent
            },
            "accuracy": accuracy,
            "historicalData": historical_data
        }

        _cache_set(pred_key, json.dumps(response), ttl_seconds=60 * 60)
        print(json.dumps({"route": "/api/predictions", "symbol": symbol, "cache_hit": False, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
        REQUEST_COUNT.labels(route='/api/predictions', status='200').inc()
        return response
    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(route='/api/predictions', status='500').inc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    if not job_queue:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    try:
        job = Job.fetch(job_id, connection=job_queue.connection)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.is_finished:
        return {"status": "done", "result": job.result}
    if job.is_failed:
        return {"status": "failed", "error": str(job.exc_info) if job.exc_info else "unknown"}
    if job.get_status() == 'started':
        return {"status": "running"}
    return {"status": job.get_status()}

@app.get("/api/stock/{symbol}")
async def get_stock_data(symbol: str):
    started = time.perf_counter()
    try:
        # Return current price and previous close; include historical for UI charting
        price, previous_close = fetch_global_quote(symbol)
        historical_data = fetch_stock_data(symbol)
        print(json.dumps({"route": "/api/stock", "symbol": symbol, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
        REQUEST_COUNT.labels(route='/api/stock', status='200').inc()
        return {"price": price, "previousClose": previous_close, "historicalData": historical_data}
    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(route='/api/stock', status='500').inc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status")
async def api_status():
    now = datetime.now(timezone.utc).isoformat()
    redis_ok = False
    queue_ok = False
    try:
        if redis_client and redis_client.ping():
            redis_ok = True
    except Exception:
        redis_ok = False
    try:
        if job_queue and job_queue.connection.ping():
            queue_ok = True
    except Exception:
        queue_ok = False
    storage_ok = storage_health()
    result = {
        "time": now,
        "redis": "ok" if redis_ok else "err",
        "queue": "ok" if queue_ok else "err",
        "storage": "ok" if storage_ok else "err"
    }
    REQUEST_COUNT.labels(route='/api/status', status='200').inc()
    return result


@app.post("/api/precompute")
async def precompute(symbols: str, api_key: Optional[str] = None):
    """Enqueue prediction jobs for a comma-separated list of symbols.
    Example: POST /api/precompute?symbols=AAPL,MSFT,TSLA&api_key=XYZ
    """
    if ADMIN_API_KEY:
        if not api_key or api_key != ADMIN_API_KEY:
            raise HTTPException(status_code=401, detail="invalid api key")
    if not job_queue:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    if not symbols:
        raise HTTPException(status_code=400, detail="symbols required")
    raw = [s.strip().upper() for s in symbols.split(',') if s.strip()]
    unique_symbols = sorted(set(raw))
    jobs = []
    try:
        from worker import job_predict_next
        for sym in unique_symbols:
            job = job_queue.enqueue(job_predict_next, sym)
            jobs.append({"symbol": sym, "job_id": job.id})
            JOB_ENQUEUED.labels(task='predict_next').inc()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    REQUEST_COUNT.labels(route='/api/precompute', status='200').inc()
    return {"enqueued": jobs}


@app.get('/metrics')
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


@app.get("/api/news")
async def get_news(symbol: Optional[str] = None, limit: int = 6):
    """Return up to 6 recent market or symbol-specific news articles.
    Results cached in Redis for 12 hours.
    """
    started = time.perf_counter()
    key = f"news:{'symbol:'+symbol.upper() if symbol else 'market'}:v1"
    cached = _cache_get(key)
    if cached:
        try:
            js = json.loads(cached)
            print(json.dumps({"route": "/api/news", "symbol": symbol or "_market", "cache_hit": True, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
            REQUEST_COUNT.labels(route='/api/news', status='200').inc()
            return js
        except Exception:
            pass

    articles = fetch_news(symbol, limit=limit)
    result = {"articles": articles, "refreshedAt": datetime.utcnow().isoformat() + 'Z'}
    # Cache for 1 hour to allow frequent refresh without stressing providers
    _cache_set(key, json.dumps(result), ttl_seconds=60 * 60)
    print(json.dumps({"route": "/api/news", "symbol": symbol or "_market", "cache_hit": False, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
    REQUEST_COUNT.labels(route='/api/news', status='200').inc()
    return result


@app.get("/api/intraday/{symbol}")
async def get_intraday(symbol: str):
    started = time.perf_counter()
    try:
        payload = fetch_intraday(symbol)
        print(json.dumps({"route": "/api/intraday", "symbol": symbol, "status": 200, "latency_ms": int((time.perf_counter()-started)*1000)}))
        REQUEST_COUNT.labels(route='/api/intraday', status='200').inc()
        return payload
    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(route='/api/intraday', status='500').inc()
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 