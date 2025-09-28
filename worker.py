import os
import json
import redis
from rq import Queue

# Import prediction utils from app
import app as app_module


def _get_queue():
    redis_url = os.getenv('REDIS_URL')
    if not redis_url:
        raise RuntimeError('REDIS_URL not set')
    conn = redis.Redis.from_url(redis_url)
    return Queue('default', connection=conn)


def job_predict_next(symbol: str):
    # Reuse app functions to fetch data and compute prediction
    historical_data = app_module.fetch_stock_data(symbol)
    prices = [entry['price'] for entry in historical_data]

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

