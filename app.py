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
from polygon import RESTClient

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

# Force-add CORS headers for allowed origins - MUST be first middleware
class CorsOverrideMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get('origin', '')
        
        # Handle preflight explicitly to be robust across proxies
        if request.method == 'OPTIONS':
            allowed = origin in settings.CORS_ORIGINS or origin.endswith('.github.io')
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
        
        # Add CORS headers to all responses from allowed origins
        if origin and (origin in settings.CORS_ORIGINS or origin.endswith('.github.io')):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            vary = response.headers.get('Vary', '')
            if 'Origin' not in vary:
                response.headers['Vary'] = f"{vary}, Origin".strip(', ') if vary else 'Origin'
        
        return response

app.add_middleware(CorsOverrideMiddleware)

# NOTE: Built-in CORSMiddleware is DISABLED because it conflicts with our custom override
# The custom middleware above handles all CORS for *.github.io origins


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get('x-request-id') or str(uuid4())
        response = await call_next(request)
        response.headers['x-request-id'] = request_id
        return response


app.add_middleware(RequestIdMiddleware)

logger = logging.getLogger("stockhub")
logging.basicConfig(level=logging.INFO)

# Get API keys from environment variables
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')
MODEL_VERSION = os.getenv('MODEL_VERSION', 'v1')
ADMIN_API_KEY = os.getenv('ADMIN_API_KEY')
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY')
POLYGON_API_KEY = os.getenv('POLYGON_API_KEY')

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

# Polygon.io client
polygon_client = None
if POLYGON_API_KEY:
    try:
        polygon_client = RESTClient(api_key=POLYGON_API_KEY)
    except Exception:
        polygon_client = None

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

def polygon_rate_limit():
    """Enforce 5 calls per minute rate limit using Redis sliding window"""
    if not redis_client or not polygon_client:
        return False
    
    try:
        # Get current minute timestamp
        current_minute = int(time.time() // 60)
        key = f"polygon:rate:{current_minute}"
        
        # Increment counter for this minute
        count = redis_client.incr(key)
        redis_client.expire(key, 60)  # Expire after 1 minute
        
        if count > 5:
            print(json.dumps({"route": "polygon_rate_limit", "rate_limited": True, "count": count}))
            return True
        
        return False
    except Exception as e:
        print(json.dumps({"route": "polygon_rate_limit", "error": str(e)}))
        return False

def is_market_hours() -> bool:
    """Check if US stock market is currently open"""
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo('America/New_York'))
    weekday = now.weekday()
    
    # Market closed on weekends
    if weekday >= 5:  # Saturday = 5, Sunday = 6
        return False
    
    # Market hours: 9:30 AM - 4:00 PM ET
    market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
    
    return market_open <= now <= market_close

def get_smart_cache_ttl() -> int:
    """Return appropriate TTL based on market hours"""
    if is_market_hours():
        return 10 * 60  # 10 minutes during market hours
    else:
        return 24 * 60 * 60  # 24 hours when market is closed

def get_ticker_cache_key(symbol: str) -> str:
    """Generate cache key for ticker data with date-based invalidation"""
    today = datetime.now().strftime('%Y-%m-%d')
    return f"ticker:5day:{symbol}:{today}"

def is_trading_day(date_str: str) -> bool:
    """Check if a date string is a trading day (not weekend)"""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.weekday() < 5  # Monday = 0, Friday = 4
    except:
        return False

def get_last_closed_trading_day() -> datetime:
    """Get the last closed trading day (previous trading day, skipping weekends)
    Always returns the most recent closed trading day (yesterday or before)
    """
    et = ZoneInfo('America/New_York')
    now = datetime.now(et)
    
    # Always use yesterday as the starting point to ensure we get a closed day
    candidate = now - timedelta(days=1)
    
    # Go back until we find a weekday (Monday=0, Friday=4)
    while candidate.weekday() >= 5:  # Saturday=5, Sunday=6
        candidate = candidate - timedelta(days=1)
    
    return candidate

def precompute_ticker_data(symbol: str) -> dict:
    """Precompute the exact 5-day data format for frontend"""
    try:
        # Get 1 week of data to ensure we have 5 trading days
        raw_data = fetch_stock_data(symbol, full=False)
        
        # Process to get exactly 5 trading days
        trading_days = [d for d in raw_data if is_trading_day(d['date'])]
        last_5_days = trading_days[-5:]
        
        if len(last_5_days) < 2:
            raise Exception("Insufficient trading days")
        
        return {
            "symbol": symbol,
            "points": [
                {
                    "timestamp": datetime.strptime(d['date'], '%Y-%m-%d').isoformat(),
                    "close": d['price']
                }
                for d in last_5_days
            ],
            "current_price": last_5_days[-1]['price'],
            "previous_price": last_5_days[-2]['price'],
            "computed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error precomputing data for {symbol}: {e}")
        raise

def get_ticker_data_cached(symbol: str):
    """Get 5-day ticker data with smart caching"""
    cache_key = get_ticker_cache_key(symbol)
    cached = _cache_get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            print(json.dumps({"route": "ticker_cached", "symbol": symbol, "cache_hit": True}))
            return data
        except Exception:
            pass
    
    # Cache miss - fetch and precompute data
    try:
        data = precompute_ticker_data(symbol)
        ttl = get_smart_cache_ttl()
        _cache_set(cache_key, json.dumps(data), ttl_seconds=ttl)
        print(json.dumps({"route": "ticker_cached", "symbol": symbol, "cache_hit": False, "ttl_seconds": ttl}))
        return data
    except Exception as e:
        print(f"Failed to get ticker data for {symbol}: {e}")
        raise

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
    """Fetch historical daily stock data using Polygon.io, clamped to last closed trading day.
    When full=True, fetches more historical data (2 years max).
    Returns [{date: YYYY-MM-DD, price: float}] sorted by date.
    """
    t0 = time.perf_counter()
    
    if not polygon_client:
        raise HTTPException(status_code=503, detail="Polygon.io client not available")
    
    # Check rate limit
    if polygon_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded (5 calls/min)")
    
    # Get last closed trading day for clamping
    last_closed = get_last_closed_trading_day()
    closed_date_str = last_closed.strftime('%Y-%m-%d')
    
    # Cache key includes date for auto-invalidation
    cache_key = f"polygon:daily:{'full' if full else 'compact'}:{symbol}:{closed_date_str}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            payload = json.loads(cached)
            if isinstance(payload, list) and payload:
                print(json.dumps({"route": "polygon_daily", "symbol": symbol, "cache_hit": True, "date": closed_date_str, "latency_ms": int((time.perf_counter()-t0)*1000)}))
                return payload
        except Exception:
            pass
    
    try:
        # Calculate date range - max 2 years for Polygon.io
        end_date = last_closed + timedelta(days=1)  # End date exclusive
        if full:
            # Full history: 2 years max
            start_date = end_date - timedelta(days=365*2)
        else:
            # Compact: ~100 days  
            start_date = end_date - timedelta(days=100)
        
        # Format dates for Polygon API
        from_date = start_date.strftime('%Y-%m-%d')
        to_date = end_date.strftime('%Y-%m-%d')
        
        # Fetch daily aggregates from Polygon
        aggs = polygon_client.get_aggs(
            ticker=symbol,
            multiplier=1,
            timespan="day",
            from_=from_date,
            to=to_date,
            adjusted=True
        )
        
        # Convert to list if it's an iterator
        aggs_list = list(aggs) if aggs else []
        
        if not aggs_list:
            raise Exception(f"No data available for {symbol}")
        
        historical_data = []
        
        # Convert to required format and clamp to last closed day
        for result in aggs_list:
            # Convert timestamp to date
            dt = datetime.fromtimestamp(result.timestamp / 1000, tz=ZoneInfo('America/New_York'))
            date_str = dt.strftime('%Y-%m-%d')
            
            # Only include data up to and including last closed trading day
            if date_str <= closed_date_str:
                historical_data.append({
                    'date': date_str,
                    'price': float(result.close)
                })
        
        # Sort by date
        historical_data = sorted(historical_data, key=lambda x: x['date'])
        
        # Cache with market-aware TTL
        ttl = get_smart_cache_ttl()
        _cache_set(cache_key, json.dumps(historical_data), ttl_seconds=ttl)
        
        print(json.dumps({
            "route": "polygon_daily",
            "symbol": symbol,
            "cache_hit": False,
            "date": closed_date_str,
            "count": len(historical_data),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        
        return historical_data
        
    except Exception as e:
        print(json.dumps({
            "route": "polygon_daily",
            "symbol": symbol,
            "error": str(e),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock data: {str(e)}")

def fetch_global_quote(symbol):
    """Fetch current price and previous close using Polygon.io.
    Returns (price, previousClose) tuple.
    """
    t0 = time.perf_counter()
    
    if not polygon_client:
        raise HTTPException(status_code=503, detail="Polygon.io client not available")
    
    # Check rate limit
    if polygon_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded (5 calls/min)")
    
    cache_key = f"polygon:quote:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            js = json.loads(cached)
            print(json.dumps({"route": "polygon_quote", "symbol": symbol, "cache_hit": True, "latency_ms": int((time.perf_counter()-t0)*1000)}))
            return float(js['price']), float(js['previousClose'])
        except Exception:
            pass
    
    try:
        # Get previous close from Polygon
        prev_close_data = polygon_client.get_previous_close_agg(ticker=symbol)
        
        # Convert to list if it's an iterator
        results_list = list(prev_close_data) if prev_close_data else []
        
        if not results_list:
            raise Exception("No previous close data available")
        
        # Get the most recent result
        result = results_list[0]
        price = float(result.close)
        prev_close = float(result.close)  # For previous close, we use the same value
        
        # Try to get a second result for actual previous close
        if len(results_list) > 1:
            prev_result = results_list[1]
            prev_close = float(prev_result.close)
        
        if price <= 0 or prev_close <= 0:
            raise Exception("Invalid price data")
        
        # Cache with 10-minute TTL for quote data (used for display, not charts)
        _cache_set(cache_key, json.dumps({"price": price, "previousClose": prev_close}), ttl_seconds=10 * 60)
        
        print(json.dumps({
            "route": "polygon_quote",
            "symbol": symbol,
            "cache_hit": False,
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        
        return price, prev_close
        
    except Exception as e:
        print(json.dumps({
            "route": "polygon_quote",
            "symbol": symbol,
            "error": str(e),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        raise HTTPException(status_code=502, detail=f'Failed to fetch quote: {str(e)}')


def fetch_intraday(symbol: str, interval: str = '5m'):
    """Fetch intraday 5-minute data for the last closed trading day using Polygon.io.
    Returns {points: [{time: HH:MM, price: float, date: ISO}], market: 'closed', asOf: ISO}
    """
    t0 = time.perf_counter()
    
    if not polygon_client:
        raise HTTPException(status_code=503, detail="Polygon.io client not available")
    
    # Check rate limit
    if polygon_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded (5 calls/min)")
    
    # Get last closed trading day
    last_closed = get_last_closed_trading_day()
    closed_date_str = last_closed.strftime('%Y-%m-%d')
    
    # Cache key includes the date for auto-invalidation
    cache_key = f"polygon:intraday:5m:{symbol}:{closed_date_str}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            payload = json.loads(cached)
            print(json.dumps({"route": "polygon_intraday", "symbol": symbol, "cache_hit": True, "date": closed_date_str, "latency_ms": int((time.perf_counter()-t0)*1000)}))
            return payload
        except Exception:
            pass
    
    et = ZoneInfo('America/New_York')
    
    try:
        # Fetch 5-minute intraday data for the last closed trading day
        # Get data for the specific closed trading day
        start_date = last_closed.strftime('%Y-%m-%d')
        end_date = (last_closed + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Fetch 5-minute aggregates from Polygon
        aggs = polygon_client.get_aggs(
            ticker=symbol,
            multiplier=5,
            timespan="minute",
            from_=start_date,
            to=end_date,
            adjusted=True
        )
        
        # Convert to list if it's an iterator
        aggs_list = list(aggs) if aggs else []
        
        if not aggs_list:
            raise Exception(f"No intraday data available for {symbol}")
        
        points = []
        
        # Filter to the specific closed trading day, session hours 9:30-16:00 ET
        for result in aggs_list:
            # Convert timestamp to ET timezone
            dt = datetime.fromtimestamp(result.timestamp / 1000, tz=et)
            
            # Only include data from the last closed trading day
            if dt.date() != last_closed.date():
                continue
            
            # Filter to market hours 9:30 AM - 4:00 PM ET
            if dt.hour < 9 or (dt.hour == 9 and dt.minute < 30) or dt.hour >= 16:
                continue
            
            price = float(result.close)
            points.append({
                "time": dt.strftime('%H:%M'),
                "price": price,
                "date": dt.isoformat()
            })
        
        # Sort by time
        points = sorted(points, key=lambda x: x['time'])
        
        # Market is always 'closed' since we're showing previous day
        result = {
            "points": points,
            "market": "closed",
            "asOf": last_closed.replace(hour=16, minute=0, second=0).isoformat()
        }
        
        # Cache with market-aware TTL: 24 hours for closed day data
        ttl = get_smart_cache_ttl()
        _cache_set(cache_key, json.dumps(result), ttl_seconds=ttl)
        
        print(json.dumps({
            "route": "polygon_intraday",
            "symbol": symbol,
            "cache_hit": False,
            "date": closed_date_str,
            "count": len(points),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        
        return result
        
    except Exception as e:
        print(json.dumps({
            "route": "polygon_intraday",
            "symbol": symbol,
            "error": str(e),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        # Return empty result on error
        return {
            "points": [],
            "market": "closed",
            "asOf": last_closed.replace(hour=16, minute=0, second=0).isoformat()
        }

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
    return {"status": "API is running", "message": "Hello from Stock Hub API!", "cors": "enabled"}

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


@app.post("/api/cache/cleanup")
async def cleanup_daily_cache():
    """Clean up old ticker cache entries (run daily at 6 AM ET)"""
    if not redis_client:
        return {"status": "no_redis", "message": "Redis not available"}
    
    try:
        pattern = "ticker:5day:*"
        keys = redis_client.keys(pattern)
        
        # Remove keys older than 2 days
        cutoff_date = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        old_keys = [k for k in keys if cutoff_date in k]
        
        if old_keys:
            redis_client.delete(*old_keys)
            return {
                "status": "cleaned", 
                "keys_removed": len(old_keys),
                "cutoff_date": cutoff_date
            }
        
        return {"status": "no_old_keys", "total_keys": len(keys)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/cache/status")
async def get_cache_status():
    """Get cache status and statistics"""
    if not redis_client:
        return {"status": "no_redis", "message": "Redis not available"}
    
    try:
        pattern = "ticker:5day:*"
        keys = redis_client.keys(pattern)
        
        # Group by date
        by_date = {}
        for key in keys:
            parts = key.split(':')
            if len(parts) >= 4:
                date = parts[3]
                by_date[date] = by_date.get(date, 0) + 1
        
        return {
            "status": "ok",
            "total_keys": len(keys),
            "by_date": by_date,
            "market_hours": is_market_hours(),
            "current_ttl_seconds": get_smart_cache_ttl()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

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


@app.get("/api/tickers/batch")
async def get_tickers_batch(symbols: str):
    """Get data for multiple tickers in one request with smart caching"""
    started = time.perf_counter()
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        
        if not symbol_list:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        if len(symbol_list) > 20:  # Limit to prevent abuse
            raise HTTPException(status_code=400, detail="Too many symbols (max 20)")
        
        results = {}
        errors = {}
        
        for symbol in symbol_list:
            try:
                results[symbol] = get_ticker_data_cached(symbol)
            except Exception as e:
                errors[symbol] = str(e)
                print(f"Error fetching {symbol}: {e}")
        
        response = {
            "tickers": results,
            "errors": errors,
            "cached_at": datetime.utcnow().isoformat(),
            "market_hours": is_market_hours(),
            "cache_ttl_seconds": get_smart_cache_ttl()
        }
        
        print(json.dumps({
            "route": "/api/tickers/batch", 
            "symbols": symbol_list, 
            "success_count": len(results),
            "error_count": len(errors),
            "latency_ms": int((time.perf_counter()-started)*1000)
        }))
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Batch ticker error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeseries/{symbol}")
async def get_timeseries(symbol: str, range: str = '1M'):
    """Return timeseries for charting using Polygon.io. 1D uses intraday; others use daily prices.
    All data clamped to last closed trading day. Max range is 2Y due to Polygon.io limits.
    Response: { points: [{date, price}], range }
    """
    try:
        symbol_u = symbol.upper()
        
        # Validate range - reject 5Y and 10Y as they exceed Polygon.io 2-year limit
        valid_ranges = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y']
        if range not in valid_ranges:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid range '{range}'. Valid ranges: {', '.join(valid_ranges)}. 5Y and 10Y not supported due to data limits."
            )
        
        # Get last closed trading day for cache key
        last_closed = get_last_closed_trading_day()
        closed_date_str = last_closed.strftime('%Y-%m-%d')
        
        # Cache key includes date for auto-invalidation
        cache_key = f"polygon:timeseries:{symbol_u}:{range}:{closed_date_str}"
        
        # Use market-aware TTL
        ttl_seconds = get_smart_cache_ttl()
        
        cached = _cache_get(cache_key)
        if cached:
            try:
                js = json.loads(cached)
                print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": True, "date": closed_date_str}))
                return js
            except Exception:
                pass
        
        # For 1D: use intraday 5-minute data
        if range == '1D':
            intr = fetch_intraday(symbol)
            result_1d = {"points": intr.get('points', []), "range": '1D'}
            _cache_set(cache_key, json.dumps(result_1d), ttl_seconds=ttl_seconds)
            print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False, "date": closed_date_str}))
            return result_1d
        
        # For all other ranges: use daily data from Polygon.io
        # Determine if we need full history (2Y max for Polygon)
        want_full = range in ['YTD', '1Y', '2Y']
        data = fetch_stock_data(symbol, full=want_full)
        
        # Compute start date for filtering
        et = ZoneInfo('America/New_York')
        now_et = datetime.now(et)
        start = _compute_start_date(range, now_et)
        start_date = start.date()
        
        # Filter to range and clamp to last closed day
        pts = [p for p in data if datetime.strptime(p['date'], '%Y-%m-%d').date() >= start_date]
        
        # If filtering produced too few points, take a sensible tail slice
        if len(pts) < 2:
            fallback_counts = {
                '1W': 7,
                '1M': 22,
                '3M': 66,
                '6M': 132,
                'YTD': 180,
                '1Y': 252,
                '2Y': 504,
            }
            n = fallback_counts.get(range, 60)
            pts = data[-min(len(data), n):]
        
        result = {"points": pts, "range": range}
        _cache_set(cache_key, json.dumps(result), ttl_seconds=ttl_seconds)
        print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "cache_hit": False, "date": closed_date_str, "count": len(pts)}))
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(json.dumps({"route": "/api/timeseries", "symbol": symbol_u, "range": range, "error": str(e)}))
        # Return empty series on error so UI doesn't break
        return {"points": [], "range": range}


def _format_number(n):
    try:
        n = float(n)
    except Exception:
        return None
    return n


def fetch_overview(symbol: str):
    """Get snapshot stats for the symbol using Polygon.io.
    Returns dictionary with common fields.
    """
    t0 = time.perf_counter()
    
    if not polygon_client:
        raise HTTPException(status_code=503, detail="Polygon.io client not available")
    
    # Check rate limit
    if polygon_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded (5 calls/min)")
    
    cache_key = f"polygon:overview:{symbol.upper()}"
    cached = _cache_get(cache_key)
    if cached:
        try:
            payload = json.loads(cached)
            print(json.dumps({"route": "polygon_overview", "symbol": symbol, "cache_hit": True, "latency_ms": int((time.perf_counter()-t0)*1000)}))
            return payload
        except Exception:
            pass
    
    try:
        # Get ticker details from Polygon
        ticker_details = polygon_client.get_ticker_details(symbol)
        
        # Get recent daily data for OHLC
        last_closed = get_last_closed_trading_day()
        start_date = (last_closed - timedelta(days=5)).strftime('%Y-%m-%d')
        end_date = (last_closed + timedelta(days=1)).strftime('%Y-%m-%d')
        
        aggs = polygon_client.get_aggs(
            ticker=symbol,
            multiplier=1,
            timespan="day",
            from_=start_date,
            to=end_date,
            adjusted=True
        )
        
        # Convert to list if it's an iterator
        aggs_list = list(aggs) if aggs else []
        
        # Extract metrics from Polygon data
        result = {
            "marketCap": _format_number(ticker_details.market_cap) if hasattr(ticker_details, 'market_cap') else None,
            "pe": _format_number(ticker_details.pe_ratio) if hasattr(ticker_details, 'pe_ratio') else None,
            "eps": _format_number(ticker_details.earnings_per_share) if hasattr(ticker_details, 'earnings_per_share') else None,
            "beta": _format_number(ticker_details.beta) if hasattr(ticker_details, 'beta') else None,
            "dividendYield": _format_number(ticker_details.dividend_yield) if hasattr(ticker_details, 'dividend_yield') else None,
            "fiftyTwoWeekHigh": _format_number(ticker_details.high_52_week) if hasattr(ticker_details, 'high_52_week') else None,
            "fiftyTwoWeekLow": _format_number(ticker_details.low_52_week) if hasattr(ticker_details, 'low_52_week') else None,
            "open": _format_number(aggs_list[-1].open) if aggs_list else None,
            "high": _format_number(aggs_list[-1].high) if aggs_list else None,
            "low": _format_number(aggs_list[-1].low) if aggs_list else None,
            "prevClose": _format_number(aggs_list[-1].close) if aggs_list else None,
            "volume": _format_number(aggs_list[-1].volume) if aggs_list else None,
            "name": getattr(ticker_details, 'name', symbol.upper()),
            "currency": getattr(ticker_details, 'currency', 'USD')
        }
        
        # Cache with 24-hour TTL
        ttl = get_smart_cache_ttl()
        _cache_set(cache_key, json.dumps(result), ttl_seconds=ttl)
        
        print(json.dumps({
            "route": "polygon_overview",
            "symbol": symbol,
            "cache_hit": False,
            "latency_ms": int((time.perf_counter()-t0)*1000),
            "source": "polygon"
        }))
        
        return result
        
    except Exception as e:
        print(json.dumps({
            "route": "polygon_overview",
            "symbol": symbol,
            "error": str(e),
            "latency_ms": int((time.perf_counter()-t0)*1000)
        }))
        # Return minimal result on error
        return {
            "marketCap": None,
            "pe": None,
            "eps": None,
            "beta": None,
            "dividendYield": None,
            "fiftyTwoWeekHigh": None,
            "fiftyTwoWeekLow": None,
            "open": None,
            "high": None,
            "low": None,
            "prevClose": None,
            "volume": None,
            "name": symbol.upper(),
            "currency": "USD"
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
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token."""
    try:
        user = authenticate_user(db, user_credentials.username_or_email, user_credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

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