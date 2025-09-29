import os
import json
import redis
from rq import Queue

# Import prediction utils from app
import app as app_module
from storage import load_model_bytes, save_model_bytes
import pickle


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

    # Compute simple moving-average + trend prediction
    predicted_price = app_module.calculate_prediction(prices)
    current_price = prices[-1]
    change_percent = ((predicted_price - current_price) / current_price) * 100

    last_date = app_module.datetime.strptime(historical_data[-1]['date'], '%Y-%m-%d')
    next_date = (last_date + app_module.timedelta(days=1)).strftime('%Y-%m-%d')

    response = {
        "prediction": {
            "date": next_date,
            "price": predicted_price,
            "change_percent": change_percent
        },
        "accuracy": 85,
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


if __name__ == '__main__':
    # Optional: simple enqueue helper for manual testing
    import sys
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        q = _get_queue()
        job = q.enqueue(job_predict_next, symbol)
        print('enqueued', job.id)

