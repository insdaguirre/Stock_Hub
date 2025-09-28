## Environment Setup Guide

Follow these steps to configure environment variables for local development, Railway (backend web + worker), and the frontend (GitHub Pages).

### 1) Variables you will use
- Backend (required now):
  - `ALPHA_VANTAGE_API_KEY`: your Alpha Vantage API key
  - `REDIS_URL`: Redis connection string (from Railway/Upstash)
  - `MODEL_VERSION`: version tag for prediction cache (e.g., `v1`)
- Backend (optional for Phase 4):
  - `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MODELS_BUCKET`
- Frontend (required at build time):
  - `REACT_APP_API_BASE_URL`: your backend base, e.g., `https://<railway-web-service>/api`
  - `REACT_APP_ALPHA_VANTAGE_API_KEY` (only needed if you build any direct AV calls in the frontend)

---

### 2) Local development
You can use a `.env` file in the project root (the app loads it with `python-dotenv`). Example:

```dotenv
ALPHA_VANTAGE_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379
MODEL_VERSION=v1
HOST=0.0.0.0
PORT=8000
```

Run the API locally:

```bash
python3 app.py
```

Run the worker locally (in another shell):

```bash
rq worker -u $REDIS_URL default
```

Smoke test:

```bash
curl -s http://localhost:8000/ | jq
curl -s http://localhost:8000/api/stock/AAPL | jq
curl -s -i http://localhost:8000/api/predictions/AAPL | cat
```

If predictions return `202` with a `job_id`, poll the job:

```bash
curl -s http://localhost:8000/api/jobs/<job_id> | jq
```

---

### 3) Railway (backend web + worker)

Steps in the Railway dashboard:
- Create a new project and connect to your GitHub repo
- Add services:
  - Web service → uses `Procfile` `web: gunicorn -k uvicorn.workers.UvicornWorker app:app`
  - Worker service → uses `Procfile` `worker: rq worker -u $REDIS_URL default`
- Add Redis (Railway/Upstash) and copy the provided `REDIS_URL`
- Set environment variables for BOTH web and worker services:
  - `ALPHA_VANTAGE_API_KEY=...`
  - `REDIS_URL=...` (from the Redis add‑on)
  - `MODEL_VERSION=v1`
- Deploy the web and worker services
- Verify health:
  - `GET https://<railway-web-service>/` returns status JSON
  - `GET https://<railway-web-service>/api/stock/AAPL` returns `{ price, previousClose, historicalData }`
  - `GET https://<railway-web-service>/api/predictions/AAPL` returns `202` on miss; poll `/api/jobs/{id}`

Budget tips:
- In Railway project settings, set usage/billing alerts
- Start with the smallest plan sizes; monitor usage

---

### 4) Frontend (GitHub Pages)

You need the backend URL when building the React app.

Option A – via environment at build time (local build then deploy):

```bash
cd front
REACT_APP_API_BASE_URL=https://<railway-web-service>/api npm run build
npm run deploy
```

Option B – using `.env.production` (Create React App convention):

Create `front/.env.production` with:

```dotenv
REACT_APP_API_BASE_URL=https://<railway-web-service>/api
```

Then build and deploy:

```bash
cd front
npm run build
npm run deploy
```

After deployment, open your GitHub Pages site and navigate to a stock; verify it loads, shows progress, and renders the chart.

---

### 5) Optional (Phase 4 object storage)
When you move models to object storage, set:

```dotenv
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
MODELS_BUCKET=
```

These are not required for current functionality; they’ll be used when persisting model artifacts.


