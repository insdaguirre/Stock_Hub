from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
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

# Get Alpha Vantage API key from environment variables
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')
MODEL_VERSION = os.getenv('MODEL_VERSION', 'v1')

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
        return redis_client.get(key)
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

def calculate_prediction(prices, days_ahead=1):
    """Simple prediction based on moving average and trend."""
    prices = np.array(prices)
    ma = np.mean(prices[-5:])  # 5-day moving average
    trend = (prices[-1] - prices[-5]) / 5  # Average daily change
    prediction = ma + (trend * days_ahead)
    return max(0, prediction)  # Ensure prediction is not negative

@app.get("/")
async def root():
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
                return js
            except Exception:
                pass

        # If no cached prediction and we have a queue, enqueue and return 202
        if job_queue:
            try:
                # enqueue callable by reference if possible
                from worker import job_predict_next
                job = job_queue.enqueue(job_predict_next, symbol)
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
        return response
    except HTTPException:
        raise
    except Exception as e:
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
        return {"price": price, "previousClose": previous_close, "historicalData": historical_data}
    except HTTPException:
        raise
    except Exception as e:
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
    return {
        "time": now,
        "redis": "ok" if redis_ok else "err",
        "queue": "ok" if queue_ok else "err"
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 