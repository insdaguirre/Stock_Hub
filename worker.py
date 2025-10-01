import os
import json
import redis
from rq import Queue

# Import prediction utils from app
import app as app_module
from storage import load_model_bytes, save_model_bytes
import pickle
import os
import json
import requests
from prometheus_client import Counter
import boto3

JOB_FAILURES = Counter('worker_job_failures_total', 'Worker job failures', ['task'])


def _get_queue():
    redis_url = os.getenv('REDIS_URL')
    if not redis_url:
        raise RuntimeError('REDIS_URL not set')
    conn = redis.Redis.from_url(redis_url)
    return Queue('default', connection=conn)


def job_predict_next(symbol: str):
    """Predict using a persisted simple model artifact if available.

    Artifact format: pickle dump of a dict with keys:
      - 'model_name': str
      - 'version': str
      - 'params': dict (currently stores rolling window size, etc.)
    """
    model_name = "simple"
    version = app_module.MODEL_VERSION

    # Try to load model artifact first
    artifact = load_model_bytes(symbol, model_name, version)
    model_params = None
    if artifact:
        try:
            payload = pickle.loads(artifact)
            model_params = payload.get("params")
        except Exception:
            model_params = None

    # Reuse app functions to fetch data and compute prediction
    historical_data = app_module.fetch_stock_data(symbol)
    prices = [entry['price'] for entry in historical_data]

    # For this simple model, params are minimal (e.g., window)
    window = 5
    if isinstance(model_params, dict) and isinstance(model_params.get("window"), int):
        window = max(1, model_params["window"])

    # Get last date and current price
    last_date = app_module.datetime.strptime(historical_data[-1]['date'], '%Y-%m-%d')
    current_price = prices[-1]
    
    # Calculate accuracy (simplified)
    import numpy as np
    accuracy = 85  # Base accuracy
    recent_volatility = np.std(prices[-10:]) / np.mean(prices[-10:])
    accuracy = max(75, min(95, accuracy - (recent_volatility * 100)))

    # Compute predictions for 1 day, 2 days, and 1 week
    prediction_1d = app_module.calculate_prediction(prices, days_ahead=1)
    prediction_2d = app_module.calculate_prediction(prices, days_ahead=2)
    prediction_1w = app_module.calculate_prediction(prices, days_ahead=7)

    response = {
        "predictions": {
            "1_day": {
                "date": (last_date + app_module.timedelta(days=1)).strftime('%Y-%m-%d'),
                "price": prediction_1d,
                "change_percent": ((prediction_1d - current_price) / current_price) * 100
            },
            "2_day": {
                "date": (last_date + app_module.timedelta(days=2)).strftime('%Y-%m-%d'),
                "price": prediction_2d,
                "change_percent": ((prediction_2d - current_price) / current_price) * 100
            },
            "1_week": {
                "date": (last_date + app_module.timedelta(days=7)).strftime('%Y-%m-%d'),
                "price": prediction_1w,
                "change_percent": ((prediction_1w - current_price) / current_price) * 100
            }
        },
        # Legacy field for backwards compatibility (use 1 day prediction)
        "prediction": {
            "date": (last_date + app_module.timedelta(days=1)).strftime('%Y-%m-%d'),
            "price": prediction_1d,
            "change_percent": ((prediction_1d - current_price) / current_price) * 100
        },
        "accuracy": accuracy,
        "historicalData": historical_data
    }

    # Persist a tiny artifact if none exists (acts like 'trained')
    if not artifact:
        try:
            to_store = pickle.dumps({"model_name": model_name, "version": version, "params": {"window": window}})
            save_model_bytes(symbol, model_name, version, to_store)
        except Exception:
            pass

    # Cache result under prediction key to align with app cache
    pred_key = f"pred:simple:{app_module.MODEL_VERSION}:{symbol}"
    if app_module.redis_client:
        app_module.redis_client.set(pred_key, json.dumps(response), ex=60 * 60)
    return response


def _notify_failure(task: str, message: str):
    JOB_FAILURES.labels(task=task).inc()
    # 1) Try AWS SNS email (no sender setup needed)
    topic_arn = os.getenv('ALERT_SNS_TOPIC_ARN')
    sns_region = os.getenv('SNS_REGION') or os.getenv('S3_REGION') or 'us-east-1'
    if topic_arn:
        try:
            sns = boto3.client('sns', region_name=sns_region,
                               aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
                               aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'))
            sns.publish(TopicArn=topic_arn, Subject=f"StockHub worker failure: {task}", Message=message[:10000])
            return
        except Exception:
            pass
    # 2) Fallback to webhook JSON if configured
    url = os.getenv('ALERT_WEBHOOK_URL')
    if not url:
        return
    payload = {"task": task, "message": message}
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception:
        pass


if __name__ == '__main__':
    # Optional: simple enqueue helper for manual testing
    import sys
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        q = _get_queue()
        job = q.enqueue(job_predict_next, symbol)
        print('enqueued', job.id)

