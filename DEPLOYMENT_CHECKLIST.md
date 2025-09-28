## Deployment Readiness Checklist

This document summarizes what remains to be built/decided to deploy the project. It offers two paths:

- **Fast path (recommended initially)**: ship the simple FastAPI in `app.py`.
- **Heavy path**: ship the full ML API in `main.py` (requires substantial infra and dependencies).

### Decide First
- **Choose backend entrypoint and host**
  - **Fast path**: `app.py` + Heroku/Render/Fly/VM with `gunicorn`.
  - **Heavy path**: `main.py` on a VM/Render Standard or similar (not serverless).
- **Keep only one deployment configuration**
  - If using Heroku/Render: keep `Procfile`/`runtime.txt` and remove `vercel.json`.
  - If using Vercel: rework backend to serverless functions (not recommended for ML) or host backend elsewhere and keep `vercel.json` only for frontend proxying.

## Backend Work

### API contracts (align with frontend)
- **/api/stock/{symbol}**
  - Must return: `{ price, previousClose }`.
  - Currently `app.py` returns `{data: historical}` in `/api/stock`; update to return price fields or adjust frontend accordingly.
- **/api/predictions/{symbol}**
  - Frontend (`front/src/services/api.js`) expects a structure like:
    - `models: { 1..5: { prediction, accuracy, confidence, change_percent } }`
    - `historicalData: [ { date, price }, ... ]`
    - `nextDate: YYYY-MM-DD`
  - `app.py` currently returns a single `prediction` and `accuracy` without model variants or `nextDate`.
  - Either:
    - Update backend to emit the expected shape, or
    - Simplify frontend to consume the simple backend shape.
- **Historical and forecast series for charts**
  - `StockPage` expects `historicalData` and optionally `forecastData` for charting. Ensure backend or frontend constructs these consistently.

### Implementation consolidation
- **Pick one implementation**
  - If shipping `app.py` now, treat `main.py` + `models/` as future work and align the frontend to the simple API.
  - If shipping `main.py`, make it the entrypoint, ensure endpoints match the frontend, and address training/storage concerns below.

### Dependencies and runtime
- **Fast path (`app.py`)**
  - Add `gunicorn` to `requirements.txt`.
  - Trim unused heavy ML deps (keep it lean and quick to boot).
- **Heavy path (`main.py`)**
  - Add/verify dependencies:
    - `tensorflow`, `prophet` (and `cmdstanpy`), `xgboost`, `lightgbm`, `catboost`, `statsmodels`, `pmdarima`, `joblib`, `pandas`, `numpy`, `scikit-learn`.
    - `ta-lib` Python bindings used in `xgboost_model.py` require the TA-Lib C library preinstalled on the host; consider replacing with pandas-based indicators to simplify.
  - Validate Python version in `runtime.txt` (currently `python-3.9.18`) against the above packages; some may require >= 3.10.

### Training, persistence, and rate limits
- **Do not train synchronously on request in production** (`main.py` does this). Pre-train offline, run asynchronously via a worker/queue, or gate with a job endpoint.
- **Persist models**
  - Current `saved_models/` is local and ephemeral on Heroku/Render.
  - Use S3/GCS or a mounted persistent volume and update model load/save logic accordingly.
- **Alpha Vantage limits**
  - Add basic caching and retry/backoff; optionally put Redis in front of Alpha Vantage requests.

### Operations and process config
- **Start command**
  - Heroku/Render: `gunicorn -k uvicorn.workers.UvicornWorker app:app` (or `main:app` if using ML).
  - Update `Procfile` accordingly. Remove `server.py` (placeholder) from process definition.
- **CORS**
  - Lock production origins to `https://insdaguirre.github.io` (keep `http://localhost:3000` for dev). Ensure `app.py` uses the same origin list as `settings.py` for consistency.
- **Secrets**
  - Create `.env.example` documenting required variables (see below). Configure actual env vars on the host.

## Frontend Work

### API base URL and envs
- Replace hardcoded prod URL in `front/src/services/api.js` with `REACT_APP_API_BASE_URL`. Example:
```js
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
```
- Set `REACT_APP_API_BASE_URL` per environment (GitHub Pages build vs local dev).

### Data shape alignment
- **HomePage** works with `getPredictions()` returning `models` map and `historicalData`.
- **StockPage** currently expects fields that don’t exist (`forecastData`, `sevenDayPrediction`, `confidenceScore`, `stockData.historicalData`). Update to consume:
  - `predictions.models[modelId]` for accuracy/prediction,
  - `predictions.historicalData` for chart base,
  - compute “next point” from each selected model, or extend backend to provide `forecastData`.

### GitHub Pages SPA routing
- Add `public/404.html` to redirect to `index.html` so routes work on refresh.
- `Router` already uses `basename="/stock_hub"` and `package.json.homepage` is set; keep them aligned.

## Deployment Config Cleanup
- **If using Heroku/Render**
  - Remove `vercel.json`.
  - Keep `Procfile` and `runtime.txt`.
  - Keep or remove `start.sh` depending on platform; if unused, remove.
- **If using Vercel**
  - Convert backend to Vercel serverless (`api/` directory) or host backend elsewhere and proxy.
  - Vercel is not suitable for the heavy ML path.

## Environment Variables
- Backend
  - `ALPHA_VANTAGE_API_KEY` (required)
  - `PORT` (default 8000), `HOST` (default `0.0.0.0`), `WORKERS` (e.g., 4–6), `DEBUG` (`true`/`false`)
- Frontend
  - `REACT_APP_API_BASE_URL` (e.g., `https://<your-backend-host>/api`)

## Quick Path (Minimal to Ship)
1. Choose **Fast path** (`app.py`).
2. Update `/api/stock/{symbol}` to return `{ price, previousClose }`.
3. Update `/api/predictions/{symbol}` to return `{ prediction, accuracy, historicalData, nextDate }` and adapt `getPredictions()` to build the `models` map client-side.
4. Fix `StockPage` to use available fields; remove reliance on `forecastData`, `sevenDayPrediction`, `confidenceScore` unless provided.
5. Add `gunicorn` to `requirements.txt`. Update `Procfile` to `web: gunicorn -k uvicorn.workers.UvicornWorker app:app`. Remove `server.py` from Procfile.
6. Replace hardcoded API URL in `front/src/services/api.js` with `REACT_APP_API_BASE_URL`.
7. Add `public/404.html` for SPA routing on GitHub Pages.
8. Set `ALPHA_VANTAGE_API_KEY` on the backend host and `REACT_APP_API_BASE_URL` in frontend build.
9. Deploy backend; then `npm run deploy` for frontend.

## Notes on Heavy Path (ML)
- Ensure additional libraries install successfully on target (may require system packages: GCC, build tools, TA-Lib, etc.).
- Avoid on-request training; move training to background and persist models to object storage.
- Consider upgrading Python version if some packages fail on 3.9.18.
- Expect higher CPU/RAM and longer cold starts; avoid serverless platforms.

## Smoke Tests (post-deploy)
- Backend
  - `GET /` -> `{ status: "API is running" }`
  - `GET /api/stock/AAPL` -> `{ price: number, previousClose: number }`
  - `GET /api/predictions/AAPL` -> expected JSON with `historicalData` and next-date fields
- Frontend
  - Home loads, predictions list populates, clicking a model navigates to `/stock/:symbol?model=X` and chart renders.


