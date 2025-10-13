from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
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
from sqlalchemy.orm import Session
from database import get_db, create_tables
from models.user import User
from schemas.auth import UserCreate, UserLogin, UserResponse, Token
from auth_utils import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    get_user_by_username,
    get_user_by_email
)

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

# Create database tables
create_tables()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\\.github\\.io$",
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

# Force-add CORS headers for allowed origins as a safety net.
class CorsOverrideMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Handle preflight explicitly to be robust across proxies
        if request.method == 'OPTIONS':
            origin = request.headers.get('origin')
            allowed = False
            try:
                allowed = origin in settings.CORS_ORIGINS or (origin and origin.endswith('.github.io'))
            except Exception:
                allowed = False
            headers = {
                'Access-Control-Allow-Methods': 'DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT',
                'Access-Control-Max-Age': '600',
                'Access-Control-Allow-Headers': request.headers.get('access-control-request-headers', '*') or '*',
            }
            if allowed and origin:
                headers['Access-Control-Allow-Origin'] = origin
                headers['Access-Control-Allow-Credentials'] = 'true'
                headers['Vary'] = 'Origin'
            return Response(status_code=204, headers=headers)

        response = await call_next(request)
        try:
            origin = request.headers.get('origin')
            if origin and (origin in settings.CORS_ORIGINS or origin.endswith('.github.io')):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                # Preserve existing Vary values while ensuring Origin is present
                vary = response.headers.get('Vary')
                response.headers['Vary'] = f"{vary}, Origin" if vary and 'Origin' not in vary else (vary or 'Origin')
        except Exception:
            pass
        return response

app.add_middleware(CorsOverrideMiddleware)

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

def fetch_stock_data(symbol, full: bool = False):
    """Fetch historical stock data from Alpha Vantage.
    When full=True, requests the full history instead of the compact (~100 days).
    """
    t0 = time.perf_counter()
    cache_key = f"av:daily:{'full' if full else 'compact'}:{symbol}"
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

    outsize = 'full' if full else 'compact'
    url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}&outputsize={outsize}'
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

    # Prefer Finnhub when available
    if FINNHUB_API_KEY:
        try:
            url = f"https://finnhub.io/api/v1/quote?symbol={symbol.upper()}&token={FINNHUB_API_KEY}"
            js = requests.get(url, timeout=12).json()
            price = float(js.get('c') or 0)
            prev_close = float(js.get('pc') or 0)
            if price > 0 and prev_close > 0:
                _cache_set(cache_key, json.dumps({"price": price, "previousClose": prev_close}), ttl_seconds=10 * 60)
                print(json.dumps({"route": "fh_quote", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000)}))
                return price, prev_close
        except Exception:
            pass

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

    et = ZoneInfo('America/New_York')
    now_et = datetime.now(et)
    session_date = now_et.date()
    open_time = datetime.combine(session_date, datetime.min.time(), et).replace(hour=9, minute=30)
    close_time = datetime.combine(session_date, datetime.min.time(), et).replace(hour=16, minute=0)

    # Helper: determine if a day's intraday series appears complete (near session close)
    def _is_full_session(points_list):
        try:
            if not points_list or len(points_list) < 10:
                return False
            last_iso = points_list[-1].get('date')
            if not last_iso:
                return False
            last_dt = datetime.fromisoformat(last_iso)
            # Normalize tzinfo to ET if missing
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=et)
            # Session close for that day in ET
            day = last_dt.date()
            day_close = datetime.combine(day, datetime.min.time(), et).replace(hour=16, minute=0)
            # Consider session full if we have data within the last 2 minutes before/at close
            return last_dt >= (day_close - timedelta(minutes=2))
        except Exception:
            return False

    # Prefer Finnhub when available
    if FINNHUB_API_KEY:
        def fetch_candles(day_date):
            day_open = datetime.combine(day_date, datetime.min.time(), et).replace(hour=9, minute=30)
            day_close = datetime.combine(day_date, datetime.min.time(), et).replace(hour=16, minute=0)
            start = int(day_open.timestamp())
            end_ts = min(day_close, now_et)
            end = int(end_ts.timestamp())
            url = f"https://finnhub.io/api/v1/stock/candle?symbol={symbol.upper()}&resolution=1&from={start}&to={end}&token={FINNHUB_API_KEY}"
            js = requests.get(url, timeout=15).json()
            if js.get('s') != 'ok':
                return []
            times = js.get('t') or []
            closes = js.get('c') or []
            out = []
            for ts_i, c_i in zip(times, closes):
                ts = datetime.fromtimestamp(int(ts_i), tz=et)
                if ts < day_open or ts > day_close:
                    continue
                out.append({"time": ts.strftime('%H:%M'), "price": float(c_i), "date": ts.isoformat()})
            return out

        points = sorted(fetch_candles(session_date), key=lambda x: x['time'])
        # Always prefer a completed prior trading day if today's session isn't complete yet
        if not _is_full_session(points):
            for delta in range(1, 6):
                prev_day = session_date - timedelta(days=delta)
                pts = sorted(fetch_candles(prev_day), key=lambda x: x['time'])
                if _is_full_session(pts):
                    points = pts
                    break
        # If still empty, fall back to Alpha Vantage below
        if len(points) >= 2:
            market_is_open = (now_et.weekday() < 5 and open_time <= now_et <= close_time)
            state = 'open' if market_is_open else 'closed'
            result = {"points": points, "market": state, "asOf": now_et.isoformat()}
            _cache_set(cache_key, json.dumps(result), ttl_seconds=60)
            try:
                last_dt = points[-1].get('date') or points[-1].get('time')
            except Exception:
                last_dt = None
            print(json.dumps({"route": "fh_intraday", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000), "count": len(points), "last_point": last_dt, "market_open": market_is_open}))
            return result

    throttled = _throttle(f"intraday:{symbol}")

    url = (
        f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY"
        f"&symbol={symbol}&interval={interval}&apikey={ALPHA_VANTAGE_API_KEY}&outputsize=full"
    )
    data = _request_with_backoff(url)
    AV_CALLS.labels(type='intraday').inc()
    # Data key name depends on interval
    key = f"Time Series ({interval})"
    series = data.get(key, {}) if isinstance(data, dict) else {}

    def extract_for_day(day_date):
        out = []
        start = datetime.combine(day_date, datetime.min.time(), et).replace(hour=9, minute=30)
        # IMPORTANT: Clamp today's series to "now" so the chart doesn't extend to 16:00 when market is open
        end = datetime.combine(day_date, datetime.min.time(), et).replace(hour=16, minute=0)
        if day_date == session_date:
            try:
                end = min(end, now_et)
            except Exception:
                pass
        for ts_str, values in series.items():
            try:
                ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=et)
            except Exception:
                continue
            if ts.date() != day_date:
                continue
            if ts < start or ts > end:
                continue
            try:
                price = float(values.get('4. close') or values.get('1. open') or 0)
            except Exception:
                continue
            out.append({"time": ts.strftime('%H:%M'), "price": price, "date": ts.isoformat()})
        return sorted(out, key=lambda x: x['time'])

    # Primary: today's regular session
    points = extract_for_day(session_date)
    # If today's session isn't complete, fallback to the last available full trading day
    if not _is_full_session(points):
        unique_dates = set()
        for ts_str in series.keys():
            try:
                ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=et)
                unique_dates.add(ts.date())
            except Exception:
                continue
        if unique_dates:
            prior_days = sorted([d for d in unique_dates if d < session_date], reverse=True)
            for d in prior_days:
                pts = extract_for_day(d)
                if _is_full_session(pts):
                    points = pts
                    break
    state = 'open' if (now_et.weekday() < 5 and open_time <= now_et <= close_time) else 'closed'
    result = {"points": points, "market": state, "asOf": now_et.isoformat()}
    # Short cache as data moves intraday
    _cache_set(cache_key, json.dumps(result), ttl_seconds=60)
    try:
        last_dt = points[-1].get('date') or points[-1].get('time')
    except Exception:
        last_dt = None
    print(json.dumps({"route": "av_intraday", "symbol": symbol, "cache_hit": False, "latency_ms": int((time.perf_counter()-t0)*1000), "count": len(points), "last_point": last_dt}))
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
async def get_predictions(symbol: str, current_user: User = Depends(get_current_active_user)):
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
        current_price = prices[-1]
        
        # Calculate accuracy (simplified)
        accuracy = 85  # Base accuracy
        recent_volatility = np.std(prices[-10:]) / np.mean(prices[-10:])
        accuracy = max(75, min(95, accuracy - (recent_volatility * 100)))
        
        # Calculate predictions for 1 day, 2 days, and 1 week
        prediction_1d = calculate_prediction(prices, days_ahead=1)
        prediction_2d = calculate_prediction(prices, days_ahead=2)
        prediction_1w = calculate_prediction(prices, days_ahead=7)
        
        response = {
            "predictions": {
                "1_day": {
                    "date": (last_date + timedelta(days=1)).strftime('%Y-%m-%d'),
                    "price": prediction_1d,
                    "change_percent": ((prediction_1d - current_price) / current_price) * 100
                },
                "2_day": {
                    "date": (last_date + timedelta(days=2)).strftime('%Y-%m-%d'),
                    "price": prediction_2d,
                    "change_percent": ((prediction_2d - current_price) / current_price) * 100
                },
                "1_week": {
                    "date": (last_date + timedelta(days=7)).strftime('%Y-%m-%d'),
                    "price": prediction_1w,
                    "change_percent": ((prediction_1w - current_price) / current_price) * 100
                }
            },
            # Legacy field for backwards compatibility (use 1 day prediction)
            "prediction": {
                "date": (last_date + timedelta(days=1)).strftime('%Y-%m-%d'),
                "price": prediction_1d,
                "change_percent": ((prediction_1d - current_price) / current_price) * 100
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


def _compute_start_date(range_key: str, now_dt: datetime) -> datetime:
    if range_key == '1D':
        return now_dt
    if range_key == '1W':
        return now_dt - timedelta(days=7)
    if range_key == '1M':
        return now_dt - timedelta(days=31)
    if range_key == '3M':
        return now_dt - timedelta(days=93)
    if range_key == '6M':
        return now_dt - timedelta(days=186)
    if range_key == 'YTD':
        return now_dt.replace(month=1, day=1)
    if range_key == '1Y':
        return now_dt - timedelta(days=365)
    if range_key == '2Y':
        return now_dt - timedelta(days=365*2)
    if range_key == '5Y':
        return now_dt - timedelta(days=365*5)
    if range_key == '10Y':
        return now_dt - timedelta(days=365*10)
    return now_dt - timedelta(days=365*20)


@app.get("/api/timeseries/{symbol}")
async def get_timeseries(symbol: str, range: str = '1M'):
    """Return timeseries for charting. 1D uses intraday; others use daily prices.
    Response: { points: [{date, price}], range }
    """
    try:
        # Server-side cache (per symbol, range)
        symbol_u = symbol.upper()
        cache_key = f"timeseries:{symbol_u}:{range}:v1"
        # TTL suggestions
        long_ttl = 12 * 60 * 60  # 12h
        mid_ttl = 45 * 60        # 45m
        short_ttl = 10 * 60      # 10m
        intraday_ttl = 60        # 60s
        ttl_map = {
            '1D': intraday_ttl,
            '1W': short_ttl,
            '1M': mid_ttl,
            '3M': mid_ttl,
            '6M': mid_ttl,
            'YTD': long_ttl,
            '1Y': long_ttl,
            '2Y': long_ttl,
            '5Y': long_ttl,
            '10Y': long_ttl,
        }
        ttl_seconds = ttl_map.get(range, long_ttl)

        cached = _cache_get(cache_key)
        if cached:
            try:
                js = json.loads(cached)
                print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": True}))
                return js
            except Exception:
                pass

        et = ZoneInfo('America/New_York')
        now_et = datetime.now(et)
        if range == '1D':
            intr = fetch_intraday(symbol)
            result_1d = {"points": intr.get('points', []), "range": '1D'}
            _cache_set(cache_key, json.dumps(result_1d), ttl_seconds=ttl_seconds)
            print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False}))
            return result_1d

        # Prefer Finnhub candles for broader ranges to avoid AV rate limits
        def finnhub_candles(start_dt: datetime, end_dt: datetime, resolution: str):
            if not FINNHUB_API_KEY:
                return None
            try:
                url = (
                    f"https://finnhub.io/api/v1/stock/candle?symbol={symbol.upper()}"
                    f"&resolution={resolution}&from={int(start_dt.timestamp())}&to={int(end_dt.timestamp())}&token={FINNHUB_API_KEY}"
                )
                js = requests.get(url, timeout=15).json()
                if js.get('s') != 'ok':
                    print(json.dumps({"route": "finnhub_candles", "symbol": symbol, "resolution": resolution, "status": js.get('s'), "error": js.get('error', 'no_data')}))
                    return None
                times = js.get('t') or []
                closes = js.get('c') or []
                out = []
                for ts_i, c_i in zip(times, closes):
                    dt = datetime.fromtimestamp(int(ts_i), tz=et)
                    # Use full timestamp for intraday/hourly resolutions; date-only for D/W/M
                    if resolution in ['1','5','15','30','60']:
                        out.append({"date": dt.isoformat(), "price": float(c_i)})
                    else:
                        out.append({"date": dt.strftime('%Y-%m-%d'), "price": float(c_i)})
                print(json.dumps({"route": "finnhub_candles", "symbol": symbol, "resolution": resolution, "status": "ok", "count": len(out)}))
                return out
            except Exception as e:
                print(json.dumps({"route": "finnhub_candles", "symbol": symbol, "resolution": resolution, "error": str(e)}))
                return None

        start = _compute_start_date(range, now_et)
        # Choose efficient resolutions per range
        def map_resolution(rk: str) -> str:
            # Finnhub free tier: intraday (1,5,15,30,60) only for current day
            # For historical ranges, must use D/W/M
            # Using hourly (60) for 1W, 4-hour blocks for 1M as compromise
            if rk == '1W':
                return '60'   # hourly for past week
            if rk == '1M':
                return 'D'    # daily for past month (intraday not available on free tier)
            if rk in ['3M', '6M']:
                return 'D'    # daily
            if rk in ['YTD', '1Y']:
                return 'D'    # daily
            if rk == '2Y':
                return 'D'    # daily
            if rk == '5Y':
                return 'D'    # daily
            if rk == '10Y':
                return 'D'    # daily
            return 'D'
        res = map_resolution(range)

        # Finnhub doesn't support arbitrary multi-day strings; emulate by using daily and then downsampling when needed
        req_res = res
        if res in ['2D', '5D', '10D']:
            req_res = 'D'

        fh = finnhub_candles(start, now_et, req_res)
        if fh is not None and len(fh) >= 2:
            # If we requested D but caller wants 2D/5D/10D, downsample server-side to reduce payload (keep every Nth)
            if res in ['2D', '5D', '10D']:
                n = 2 if res == '2D' else 5 if res == '5D' else 10
                fh = fh[::n]
            out = {"points": fh, "range": range}
            _cache_set(cache_key, json.dumps(out), ttl_seconds=ttl_seconds)
            print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False}))
            return out

        # Fallback to Alpha Vantage daily when Finnhub down
        try:
            # For long ranges, ask AV for full history
            want_full = range in ['YTD', '1Y', '2Y', '5Y', '10Y']
            data = fetch_stock_data(symbol, full=want_full)
            # Compare dates only (avoid tz-aware vs naive mismatch)
            start_date = start.date()
            pts = [p for p in data if datetime.strptime(p['date'], '%Y-%m-%d').date() >= start_date]
            # If filtering produced too few points (e.g., API cache lag), take a sensible tail slice
            if len(pts) < 2:
                fallback_counts = {
                    '1W': 7,
                    '1M': 22,
                    '3M': 66,
                    '6M': 132,
                    'YTD': 180,
                    '1Y': 252,
                    '2Y': 504,
                    '5Y': 1260,
                    '10Y': 2520,
                }
                n = fallback_counts.get(range, 60)
                pts = data[-min(len(data), n):]
            out2 = {"points": pts, "range": range}
            _cache_set(cache_key, json.dumps(out2), ttl_seconds=ttl_seconds)
            print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False}))
            return out2
        except Exception:
            # As a last resort, return an empty series so the UI doesn't explode
            out_empty = {"points": [], "range": range}
            _cache_set(cache_key, json.dumps(out_empty), ttl_seconds=ttl_seconds)
            print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False, "error": "fallback_empty"}))
            return out_empty
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _format_number(n):
    try:
        n = float(n)
    except Exception:
        return None
    return n


def fetch_overview(symbol: str):
    """Get snapshot stats for the symbol.
    Prefers Finnhub metrics + quote; falls back to Alpha Vantage OVERVIEW + GLOBAL_QUOTE.
    Returns dictionary with common fields.
    """
    # Finnhub path
    if FINNHUB_API_KEY:
        try:
            prof = requests.get(f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol.upper()}&token={FINNHUB_API_KEY}", timeout=12).json()
        except Exception:
            prof = {}
        try:
            met = requests.get(f"https://finnhub.io/api/v1/stock/metric?symbol={symbol.upper()}&metric=all&token={FINNHUB_API_KEY}", timeout=12).json()
        except Exception:
            met = {}
        try:
            q = requests.get(f"https://finnhub.io/api/v1/quote?symbol={symbol.upper()}&token={FINNHUB_API_KEY}", timeout=12).json()
        except Exception:
            q = {}
        metrics = met.get('metric', {}) if isinstance(met, dict) else {}
        result = {
            "marketCap": _format_number(metrics.get('marketCapitalization')),
            "pe": _format_number(metrics.get('peBasicExclExtraTTM') or metrics.get('peTTM')),
            "eps": _format_number(metrics.get('epsBasicExclExtraItemsTTM') or metrics.get('epsTTM')),
            "beta": _format_number(metrics.get('beta')),
            "dividendYield": _format_number(metrics.get('dividendYieldIndicatedAnnual')),
            "fiftyTwoWeekHigh": _format_number(metrics.get('52WeekHigh')),
            "fiftyTwoWeekLow": _format_number(metrics.get('52WeekLow')),
            "open": _format_number(q.get('o')),
            "high": _format_number(q.get('h')),
            "low": _format_number(q.get('l')),
            "prevClose": _format_number(q.get('pc')),
            "volume": _format_number(metrics.get('volume')) or _format_number(q.get('v')),
            "name": prof.get('name') or symbol.upper(),
            "currency": prof.get('currency') or 'USD'
        }
        if any(v is not None for v in result.values()):
            return result
    # Alpha Vantage fallback
    ov = {}
    try:
        ov = _request_with_backoff(f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={symbol}&apikey={ALPHA_VANTAGE_API_KEY}")
    except Exception:
        ov = {}
    price, prev_close = fetch_global_quote(symbol)
    return {
        "marketCap": _format_number(ov.get('MarketCapitalization')),
        "pe": _format_number(ov.get('PERatio')),
        "eps": _format_number(ov.get('EPS')),
        "beta": _format_number(ov.get('Beta')),
        "dividendYield": _format_number(ov.get('DividendYield')),
        "fiftyTwoWeekHigh": _format_number(ov.get('52WeekHigh')),
        "fiftyTwoWeekLow": _format_number(ov.get('52WeekLow')),
        "open": None,
        "high": None,
        "low": None,
        "prevClose": prev_close,
        "volume": _format_number(ov.get('SharesOutstanding')),
        "name": ov.get('Name') or symbol.upper(),
        "currency": ov.get('Currency') or 'USD'
    }


@app.get("/api/overview/{symbol}")
async def get_overview(symbol: str):
    try:
        return fetch_overview(symbol)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Authentication endpoints
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if username already exists
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token."""
    user = authenticate_user(db, user_credentials.username_or_email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@app.get("/api/auth/verify")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """Verify if the current token is valid."""
    return {"valid": True, "user": current_user.username}

@app.post("/api/auth/logout")
async def logout():
    """Logout user (client-side token removal)."""
    return {"message": "Successfully logged out"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 