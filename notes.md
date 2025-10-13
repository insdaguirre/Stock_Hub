## Future Ideas ##

Add bucket lifecycle to expire old versions under models/{model}/{version}/ after N days.

Add a Railway cron or manual “Run” to call a training script that writes artifacts to S3. This speeds up first-prediction latency

## Dev Phases for Real Models ##

# Phase 1 (now) #
Keep the worker using ARIMA “real” forecasts (done).
Use the training job to push ARIMA artifacts to S3; optionally modify worker to prefer S3-loaded ARIMA and fall back to quick fit if missing.
Verify: one-off train → /api/predictions → FE renders multi-timeframe per model.

# Phase 2 (next) #
Add a Predictor interface: load(bytes)->predict and save()->bytes for each model.
Implement XGBoost next (good ROI): create serialize/deserialize by packing its JSON + scaler into a single tar.gz bytes for S3. Update worker to load it; training script to upload it.
Add metrics + timing to compare ARIMA vs XGB and choose which to headline.

# Phase 3 # 
Expand to RandomForest/Prophet, then LSTM (only if you really need deep nets; CPU inference can be slow).
Keep the same artifact format and training workflow; schedule nightly retrains.

What you need to change in infra (minimal now, reusable later)
AWS/S3: already set. You only need MODELS_BUCKET + creds; no new changes when adding models—just new keys under models/{model}/{version}/{SYMBOL}.bin (or .tar.gz).
Railway:
Keep the one-off training job (python -m scripts.train_models "AAPL,MSFT,…") for ARIMA now.
Later, add flags or a model list to train XGB too (same job image/env).
No GPU required; statsmodels and XGBoost run on CPU.
When to generalize
After you confirm:
ARIMA artifacts upload and can be preferred by the worker.
API responses are cached and stable.
FE shows distinct model outputs and historical line + diamond prediction marker.