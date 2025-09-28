from fastapi.testclient import TestClient
import sys
import os

# Ensure project root is on path
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import the app module
import app as app_module


def fake_fetch_stock_data(symbol: str):
    return [
        {"date": "2025-09-22", "price": 97.0},
        {"date": "2025-09-23", "price": 98.0},
        {"date": "2025-09-24", "price": 99.0},
        {"date": "2025-09-25", "price": 100.0},
        {"date": "2025-09-26", "price": 101.0},
        {"date": "2025-09-27", "price": 102.0},
    ]


def fake_fetch_global_quote(symbol: str):
    return 101.0, 99.0


def run_success_tests():
    # Monkeypatch network-dependent functions
    app_module.fetch_stock_data = fake_fetch_stock_data
    app_module.fetch_global_quote = fake_fetch_global_quote

    client = TestClient(app_module.app)

    # Test /api/stock/{symbol}
    r = client.get("/api/stock/AAPL")
    assert r.status_code == 200, r.text
    js = r.json()
    assert "price" in js and "previousClose" in js and "historicalData" in js
    assert js["price"] == 101.0
    assert js["previousClose"] == 99.0
    assert isinstance(js["historicalData"], list) and len(js["historicalData"]) >= 5

    # Test /api/predictions/{symbol}
    r2 = client.get("/api/predictions/AAPL")
    assert r2.status_code == 200, r2.text
    js2 = r2.json()
    assert "prediction" in js2 and "accuracy" in js2 and "historicalData" in js2
    assert "date" in js2["prediction"] and "price" in js2["prediction"] and "change_percent" in js2["prediction"]


def run_error_tests():
    # Simulate upstream error for /api/stock
    def failing_quote(symbol: str):
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="No quote data")

    app_module.fetch_global_quote = failing_quote
    app_module.fetch_stock_data = fake_fetch_stock_data

    client = TestClient(app_module.app)
    r = client.get("/api/stock/FAIL")
    assert r.status_code == 502, r.text

    # Simulate error for /api/predictions
    def failing_hist(symbol: str):
        raise RuntimeError("network failure")

    app_module.fetch_stock_data = failing_hist
    r2 = client.get("/api/predictions/FAIL")
    assert r2.status_code == 500, r2.text


if __name__ == "__main__":
    run_success_tests()
    run_error_tests()
    print("Phase 1 tests passed")


