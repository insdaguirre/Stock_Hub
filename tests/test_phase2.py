from fastapi.testclient import TestClient
import sys
import os

# Ensure project root on path
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import app as app_module


class FakeRedis:
    def __init__(self):
        self.store = {}

    @classmethod
    def from_url(cls, *args, **kwargs):
        return cls()

    def ping(self):
        return True

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, ex=None):
        self.store[key] = value
        return True

    def exists(self, key):
        return 1 if key in self.store else 0


def make_fake_request_with_backoff(counter):
    # Return a function that inspects the URL and returns static AV payloads
    def _fake(url, max_retries=3):
        if "function=TIME_SERIES_DAILY" in url:
            counter["daily"] = counter.get("daily", 0) + 1
            return {
                "Time Series (Daily)": {
                    "2025-09-22": {"4. close": "97.0"},
                    "2025-09-23": {"4. close": "98.0"},
                    "2025-09-24": {"4. close": "99.0"},
                    "2025-09-25": {"4. close": "100.0"},
                    "2025-09-26": {"4. close": "101.0"},
                    "2025-09-27": {"4. close": "102.0"},
                }
            }
        elif "function=GLOBAL_QUOTE" in url:
            counter["quote"] = counter.get("quote", 0) + 1
            return {
                "Global Quote": {
                    "05. price": "150.00",
                    "08. previous close": "148.00",
                }
            }
        else:
            raise AssertionError(f"Unexpected URL: {url}")

    return _fake


def test_phase2_caching_and_throttle():
    # Setup fake redis and fake AV
    fake_redis = FakeRedis()
    app_module.redis_client = fake_redis

    counter = {}
    app_module._request_with_backoff = make_fake_request_with_backoff(counter)

    client = TestClient(app_module.app)

    # First call: expect upstream hits and caches populated
    r1 = client.get("/api/stock/AAPL")
    assert r1.status_code == 200
    js1 = r1.json()
    assert js1["price"] == 150.0 and js1["previousClose"] == 148.0
    assert len(js1["historicalData"]) >= 5
    assert counter.get("daily", 0) == 1 and counter.get("quote", 0) == 1

    # Throttle keys should be set
    assert fake_redis.exists("throttle:daily:AAPL") == 1
    assert fake_redis.exists("throttle:quote:AAPL") == 1

    # Cached keys should be set
    assert fake_redis.exists("av:daily:AAPL") == 1
    assert fake_redis.exists("av:quote:AAPL") == 1

    # Second call: should be served from cache, counters unchanged
    r2 = client.get("/api/stock/AAPL")
    assert r2.status_code == 200
    js2 = r2.json()
    assert js2 == js1
    assert counter.get("daily", 0) == 1 and counter.get("quote", 0) == 1

    # Predictions: first call populates pred cache (no new upstream calls expected)
    r3 = client.get("/api/predictions/AAPL")
    assert r3.status_code == 200
    pred1 = r3.json()
    assert "prediction" in pred1 and "accuracy" in pred1 and "historicalData" in pred1
    pred_cache_key = f"pred:simple:{app_module.MODEL_VERSION}:AAPL"
    assert fake_redis.exists(pred_cache_key) == 1

    # Second predictions call: should return same response, counters untouched
    r4 = client.get("/api/predictions/AAPL")
    assert r4.status_code == 200
    pred2 = r4.json()
    assert pred2 == pred1
    assert counter.get("daily", 0) == 1 and counter.get("quote", 0) == 1

    print("Phase 2 caching tests passed")


if __name__ == "__main__":
    test_phase2_caching_and_throttle()

