## Stock Hub – Single Project Roadmap

This roadmap consolidates everything needed to get to production, optimized for light, fast operation on a ~$20/mo budget, with optional on-demand ML.

Use the phases in order. Each task has a checkbox; check off as you complete them.

---

### Phase 0 — Decide + Scope Lock (Locked In)
- [x] Backend entrypoint: `app.py` (fast path)
- [x] Hosting: Railway for API (Web + Worker), GitHub Pages for frontend
- [x] Keep one deployment config only
  - [x] Keep `Procfile`, `runtime.txt`; remove `vercel.json` (backend)
  - [x] Frontend remains on GitHub Pages

Acceptance: Decisions reflected in repo configs and this roadmap.

---

### Phase 1 — Backend API (fast, correct, cache-ready)
- [ ] Align `/api/stock/{symbol}` to return `{ price, previousClose }`
- [ ] Ensure `/api/predictions/{symbol}` returns:
  - [ ] `historicalData: [{ date, price }]`
  - [ ] `prediction: { date, price, change_percent }`
  - [ ] `accuracy: number`
- [ ] Add Alpha Vantage error handling + 429 backoff
- [ ] Add health endpoint `/` (already present) with `{ status }`

Acceptance: Manual test both endpoints for `AAPL` locally.

---

### Phase 2 — Redis Cache + Rate Protection
- [ ] Add Redis client (Upstash or Railway Redis; set `REDIS_URL`)
- [ ] Cache Alpha Vantage daily series
  - [ ] Key: `av:daily:<symbol>`; TTL 5–15 min
- [ ] Cache predictions
  - [ ] Key: `pred:<model>:<symbol>:<version>`; TTL 6–24h
- [ ] Basic rate guard per symbol to respect AV limits

Acceptance: Confirm repeated calls hit cache (log or metrics) and AV calls drop dramatically.

---

### Phase 3 — Async Jobs (on‑demand ML without blocking)
- [ ] Select job framework: RQ or Dramatiq (Redis-backed)
- [ ] Create worker service (`worker.py`) to run tasks:
  - [ ] `train_model(symbol, model)`
  - [ ] `predict_next(symbol, model)`
- [ ] API pattern:
  - [ ] If cache hit → return 200 with data
  - [ ] If miss → enqueue job; return 202 with `{ job_id }`
  - [ ] Add `GET /api/jobs/:job_id` → `{ status, result? }`

Acceptance: From frontend, miss returns 202; polling reaches `done` and shows results.

---

### Phase 4 — Model Artifacts to Object Storage
- [ ] Choose storage: S3/Cloudflare R2/Backblaze B2
- [ ] Add storage client + `MODELS_BUCKET`
- [ ] Replace local `saved_models/` with storage-backed `save_model/load_model`
- [ ] Add `MODEL_VERSION` to invalidate caches when logic changes

Acceptance: Train once locally, ensure files upload + load correctly from storage.

---

### Phase 5 — Frontend Integration + UX
- [ ] Replace hardcoded API URL with `REACT_APP_API_BASE_URL`
- [ ] Adjust `HomePage`/`StockPage` to backend shapes:
  - [ ] Use `predictions.historicalData`
  - [ ] Display a single predicted next point from the selected model
  - [ ] Remove dependencies on `forecastData`, `sevenDayPrediction`, `confidenceScore` unless provided
- [ ] Handle 202 responses: show progress UI and poll `/api/jobs/:job_id`
- [ ] Add `public/404.html` for SPA routing on GitHub Pages

Acceptance: UI fetches, shows loading/progress, renders chart + metrics for AAPL.

---

### Phase 6 — Deployment Config + Railway Setup
- [ ] requirements.txt: add `gunicorn`, `redis`, and job queue (`rq` or `dramatiq`); keep deps light
- [ ] Procfile
  - [ ] `web: gunicorn -k uvicorn.workers.UvicornWorker app:app`
  - [ ] `worker: python worker.py`
- [ ] Remove unused configs (`vercel.json`, `server.py`) if not used
- [ ] Railway services
  - [ ] Create a Railway project
  - [ ] Add a Web Service from this repo (points to `Procfile` web)
  - [ ] Add a Worker Service from this repo (points to `Procfile` worker)
  - [ ] Add Redis (Upstash add-on or Railway Redis) and copy `REDIS_URL`
  - [ ] Set environment variables (both services): `ALPHA_VANTAGE_API_KEY`, `REDIS_URL`, `MODEL_VERSION`, storage creds
  - [ ] Configure deploy triggers from GitHub main branch
  - [ ] Health checks: GET `/` on web service
- [ ] Spend/budget controls on Railway
  - [ ] Set usage/billing alerts in project settings (email/slack)
  - [ ] Choose a low-size service plan; monitor usage dashboard
  - [ ] Optional: add a GitHub Action or script to pause services if monthly spend crosses target

Acceptance: Web and Worker services running on Railway, connected to Redis; alerts configured.

---

### Phase 7 — Observability + Ops
- [ ] Structured logging (request id, job id, symbol, model, duration)
- [ ] Basic metrics (requests, cache hit rate, AV calls, job durations)
- [ ] Error alerts (email/webhook) for worker failures
- [ ] Add simple status page endpoint `/api/status`

Acceptance: Logs and metrics visible; simulated failures alert.

---

### Phase 8 — Minimal ML in Prod (budget friendly)
- [ ] Keep light models initially: RandomForest (sklearn), ARIMA (statsmodels/pmdarima)
- [ ] Optional: XGBoost CPU if installation succeeds
- [ ] Hide heavier models (LSTM/TensorFlow, Prophet requiring CmdStan) behind a feature flag for later
- [ ] Nightly cron to precompute top symbols (GitHub Action hitting a protected endpoint on Railway)

Acceptance: Worker trains/caches predictions nightly; API is fast from cache.

---

### Phase 9 — Security + CORS + Secrets
- [ ] CORS: limit to `https://insdaguirre.github.io` in prod, allow `http://localhost:3000` in dev
- [ ] Secrets in env: no secrets in repo
- [ ] Optional: simple API key for write endpoints (e.g., cron trigger)

Acceptance: Preflight checks pass; production origin restricted.

---

### Phase 10 — Documentation + Examples
- [ ] Create `.env.example` for both backend and frontend
- [ ] Update `README.md` with run, deploy, and env setup
- [ ] Add curl examples for all endpoints

Acceptance: New dev can run locally in <10 minutes.

---

## Environment Variables
- Backend
  - `ALPHA_VANTAGE_API_KEY`
  - `REDIS_URL`
  - `PORT` (default 8000), `HOST` (default `0.0.0.0`)
  - `MODEL_VERSION` (e.g., `v1`)
  - Storage: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MODELS_BUCKET`
- Frontend
  - `REACT_APP_API_BASE_URL`

---

## Deployment Steps (Quick Path on Railway)
1) Push repo to GitHub; connect Railway project to repo
2) Create Web service (Procfile web) and Worker service (Procfile worker)
3) Add Redis (Upstash/Railway) and set `REDIS_URL` on both services
4) Set env vars: `ALPHA_VANTAGE_API_KEY`, `MODEL_VERSION`, storage creds
5) Deploy; verify `/` health and `/api/*` endpoints
6) Configure budget alerts in Railway; optionally add pause script
7) Frontend: set `REACT_APP_API_BASE_URL` and deploy to GitHub Pages
8) Add GitHub Action cron to hit precompute endpoint nightly

Smoke tests
- [ ] `GET /` → `{ status: "API is running" }`
- [ ] `GET /api/stock/AAPL` → `{ price, previousClose }`
- [ ] `GET /api/predictions/AAPL` → 200 with data or 202 + `job_id`
- [ ] Frontend loads, renders chart, handles 202 polling path

---

## Stretch Goals (later)
- Add heavier models behind queue (LSTM/TensorFlow, Prophet)
- Postgres (Neon/Render) for historical prediction storage and analytics
- Feature toggles per model; per-user watchlists


