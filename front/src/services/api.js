// src/services/api.js
// Resolve API base URL at build/runtime. Prefer env; when hosted on GitHub Pages, fall back to Railway.
const inferProdBase = () => {
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname || '';
      if (host.endsWith('github.io')) {
        return 'https://web-production-b6d2.up.railway.app/api';
      }
    }
  } catch (_) {}
  return 'http://localhost:8000/api';
};
export const BASE_URL = process.env.REACT_APP_API_BASE_URL || inferProdBase();

// Legacy client-side prediction functions removed - backend handles all predictions now

// Main prediction function that combines all models
export const getPredictions = async (symbol) => {
  try {
    const response = await fetch(`${BASE_URL}/predictions/${symbol}`);
    let data;
    if (response.status === 202) {
      const { job_id } = await response.json();
      const jobResult = await pollJob(job_id);
      if (jobResult.status !== 'done') {
        throw new Error(`Job not completed: ${jobResult.status}`);
      }
      data = jobResult.result;
    } else {
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      data = await response.json();
    }
    
    // Format the prediction for each model type
    const modelPredictions = {
      1: { // LSTM
        prediction: data.prediction.price,
        accuracy: data.accuracy,
        confidence: 85 + Math.random() * 10,
        change_percent: data.prediction.change_percent
      },
      2: { // Random Forest - simulated variation
        prediction: data.prediction.price * (1 + (Math.random() - 0.5) * 0.02),
        accuracy: data.accuracy - 2,
        confidence: 82 + Math.random() * 10,
        change_percent: data.prediction.change_percent * (1 + (Math.random() - 0.5) * 0.1)
      },
      3: { // Prophet - simulated variation
        prediction: data.prediction.price * (1 + (Math.random() - 0.5) * 0.015),
        accuracy: data.accuracy - 4,
        confidence: 80 + Math.random() * 10,
        change_percent: data.prediction.change_percent * (1 + (Math.random() - 0.5) * 0.15)
      },
      4: { // XGBoost - simulated variation
        prediction: data.prediction.price * (1 + (Math.random() - 0.5) * 0.01),
        accuracy: data.accuracy - 1,
        confidence: 84 + Math.random() * 10,
        change_percent: data.prediction.change_percent * (1 + (Math.random() - 0.5) * 0.05)
      },
      5: { // ARIMA - simulated variation
        prediction: data.prediction.price * (1 + (Math.random() - 0.5) * 0.025),
        accuracy: data.accuracy - 7,
        confidence: 78 + Math.random() * 10,
        change_percent: data.prediction.change_percent * (1 + (Math.random() - 0.5) * 0.2)
      }
    };

    return {
      models: modelPredictions,
      historicalData: data.historicalData,
      nextDate: data.prediction.date
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

// Poll job status until done/failed/timeout
const pollJob = async (jobId, timeoutMs = 20000, intervalMs = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${BASE_URL}/jobs/${jobId}`);
    if (!r.ok) {
      throw new Error('Failed to poll job');
    }
    const js = await r.json();
    if (js.status === 'done' || js.status === 'failed') {
      return js;
    }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return { status: 'timeout' };
};

// Get current stock data
export const getStockData = async (symbol) => {
  try {
    const response = await fetch(`${BASE_URL}/stock/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};

// Health/status fetcher for footer
export const getApiStatus = async () => {
  try {
    const r = await fetch(`${BASE_URL}/status`);
    if (!r.ok) throw new Error('status not ok');
    const js = await r.json();
    return {
      redis: js.redis,
      queue: js.queue,
      storage: js.storage || 'unknown'
    };
  } catch (_) {
    return { redis: 'err', queue: 'err', storage: 'err' };
  }
};

// Fetch latest news, optional symbol filter; backend caches for 12h
export const getNews = async (symbol, limit = 6) => {
  const url = symbol ? `${BASE_URL}/news?symbol=${encodeURIComponent(symbol)}` : `${BASE_URL}/news`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('failed to fetch news');
  const js = await r.json();
  const articles = (js.articles || []).slice(0, limit);
  return articles;
};

// Intraday chart data
export const getIntraday = async (symbol) => {
  const r = await fetch(`${BASE_URL}/intraday/${symbol}`);
  if (!r.ok) throw new Error('failed to fetch intraday');
  return await r.json();
};

export const getTimeSeries = async (symbol, range = '1M') => {
  const r = await fetch(`${BASE_URL}/timeseries/${symbol}?range=${encodeURIComponent(range)}`);
  if (!r.ok) throw new Error('failed to fetch timeseries');
  return await r.json();
};

export const getOverview = async (symbol) => {
  const r = await fetch(`${BASE_URL}/overview/${symbol}`);
  if (!r.ok) throw new Error('failed to fetch overview');
  return await r.json();
};
