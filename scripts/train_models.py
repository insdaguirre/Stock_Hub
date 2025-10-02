import os
import json
import sys
from typing import List

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import app as app_module
from storage import save_model_bytes

# Optional heavy models: import guardedly
try:
    from statsmodels.tsa.arima.model import ARIMA
    HAS_STATS = True
except Exception:
    HAS_STATS = False


def train_arima(symbol: str, version: str) -> bytes:
    hist = app_module.fetch_stock_data(symbol)
    prices = [p["price"] for p in hist]
    if not HAS_STATS or len(prices) < 10:
        raise RuntimeError("statsmodels missing or not enough data for ARIMA")
    model = ARIMA(prices, order=(2,1,1)).fit(method_kwargs={"warn_convergence": False})
    return model.save(None)  # statsmodels result has save to file-like; None returns bytes in newer versions


def main(symbols: List[str]):
    version = os.getenv("MODEL_VERSION", "v1")
    uploaded = []
    for sym in symbols:
        try:
            arima_blob = train_arima(sym, version)
            save_model_bytes(sym, "arima", version, arima_blob)
            uploaded.append({"symbol": sym, "model": "arima"})
        except Exception as e:
            print(json.dumps({"symbol": sym, "error": str(e)}))
    print(json.dumps({"uploaded": uploaded}))


if __name__ == "__main__":
    raw = os.getenv("SYMBOLS") or (sys.argv[1] if len(sys.argv) > 1 else "AAPL,MSFT,SPY")
    symbols = [s.strip().upper() for s in raw.split(",") if s.strip()]
    main(symbols)


