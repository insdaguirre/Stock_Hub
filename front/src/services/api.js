import { demoApi } from './demoData';

const readBooleanOverride = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

const isDemoMode = () => {
  const envOverride = readBooleanOverride(process.env.REACT_APP_DEMO_MODE);
  if (envOverride !== null) {
    return envOverride;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const queryLive = readBooleanOverride(params.get('live'));
    if (queryLive === true) {
      return false;
    }

    const queryDemo = readBooleanOverride(params.get('demo'));
    if (queryDemo !== null) {
      return queryDemo;
    }

    const stored = readBooleanOverride(window.localStorage.getItem('demo_mode'));
    if (stored !== null) {
      return stored;
    }
  } catch (_) {}

  return true;
};

export const DEMO_MODE = isDemoMode();

const inferLiveBase = () => {
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

const resolveBaseUrl = () => {
  if (DEMO_MODE) {
    return '/demo-api';
  }

  const raw = (process.env.REACT_APP_API_BASE_URL || inferLiveBase()).trim();
  const withoutTrailing = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return withoutTrailing.endsWith('/api') ? withoutTrailing : `${withoutTrailing}/api`;
};

export const BASE_URL = resolveBaseUrl();

const getAuthHeaders = () => {
  const token = localStorage.getItem('stockhub_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleUnauthorized = () => {
  localStorage.removeItem('stockhub_token');
  if (typeof window !== 'undefined') {
    window.location.hash = '/login';
  }
};

const makeRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  return response;
};

export const saveLastPredictions = (symbol, payload) => {
  try {
    localStorage.setItem(`sh:lastPred:${symbol}`, JSON.stringify(payload));
  } catch (_) {}
};

export const loadLastPredictions = (symbol) => {
  try {
    const raw = localStorage.getItem(`sh:lastPred:${symbol}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const getPredictions = async (symbol) => {
  if (DEMO_MODE) {
    return demoApi.getPredictions(symbol);
  }

  try {
    const response = await makeRequest(`${BASE_URL}/predictions/${symbol}`);
    let data;

    if (response.status === 202) {
      const { job_id: jobId } = await response.json();
      const jobResult = await pollJob(jobId);
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

    const predictions = data.predictions || {};
    const pred1d = predictions['1_day'] || data.prediction;
    const pred2d = predictions['2_day'] || data.prediction;
    const pred1w = predictions['1_week'] || data.prediction;
    const lastPrice = Array.isArray(data.historicalData) && data.historicalData.length
      ? Number(data.historicalData[data.historicalData.length - 1].price)
      : (typeof pred1d?.baseline === 'number' ? pred1d.baseline : undefined);

    const withChange = (price) => {
      if (!lastPrice || !isFinite(lastPrice)) return undefined;
      return ((price - lastPrice) / lastPrice) * 100;
    };

    const vary = (base, pct) => base * (1 + (Math.random() - 0.5) * pct);

    const modelPredictions = {
      1: {
        prediction: pred1w.price,
        accuracy: data.accuracy,
        confidence: 85 + Math.random() * 10,
        change_percent: typeof lastPrice === 'number' ? withChange(pred1w.price) : pred1w.change_percent,
        predictions_1d: { ...pred1d, change_percent: typeof lastPrice === 'number' ? withChange(pred1d.price) : pred1d.change_percent },
        predictions_2d: { ...pred2d, change_percent: typeof lastPrice === 'number' ? withChange(pred2d.price) : pred2d.change_percent },
        predictions_1w: { ...pred1w, change_percent: typeof lastPrice === 'number' ? withChange(pred1w.price) : pred1w.change_percent },
      },
      2: {
        prediction: vary(pred1w.price, 0.02),
        accuracy: data.accuracy - 2,
        confidence: 82 + Math.random() * 10,
        change_percent: typeof lastPrice === 'number' ? withChange(vary(pred1w.price, 0.02)) : pred1w.change_percent,
        predictions_1d: (() => { const price = vary(pred1d.price, 0.02); return { ...pred1d, price, change_percent: withChange(price) }; })(),
        predictions_2d: (() => { const price = vary(pred2d.price, 0.02); return { ...pred2d, price, change_percent: withChange(price) }; })(),
        predictions_1w: (() => { const price = vary(pred1w.price, 0.02); return { ...pred1w, price, change_percent: withChange(price) }; })(),
      },
      3: {
        prediction: vary(pred1w.price, 0.015),
        accuracy: data.accuracy - 4,
        confidence: 80 + Math.random() * 10,
        change_percent: typeof lastPrice === 'number' ? withChange(vary(pred1w.price, 0.015)) : pred1w.change_percent,
        predictions_1d: (() => { const price = vary(pred1d.price, 0.015); return { ...pred1d, price, change_percent: withChange(price) }; })(),
        predictions_2d: (() => { const price = vary(pred2d.price, 0.015); return { ...pred2d, price, change_percent: withChange(price) }; })(),
        predictions_1w: (() => { const price = vary(pred1w.price, 0.015); return { ...pred1w, price, change_percent: withChange(price) }; })(),
      },
      4: {
        prediction: vary(pred1w.price, 0.01),
        accuracy: data.accuracy - 1,
        confidence: 84 + Math.random() * 10,
        change_percent: typeof lastPrice === 'number' ? withChange(vary(pred1w.price, 0.01)) : pred1w.change_percent,
        predictions_1d: (() => { const price = vary(pred1d.price, 0.01); return { ...pred1d, price, change_percent: withChange(price) }; })(),
        predictions_2d: (() => { const price = vary(pred2d.price, 0.01); return { ...pred2d, price, change_percent: withChange(price) }; })(),
        predictions_1w: (() => { const price = vary(pred1w.price, 0.01); return { ...pred1w, price, change_percent: withChange(price) }; })(),
      },
      5: {
        prediction: vary(pred1w.price, 0.025),
        accuracy: data.accuracy - 7,
        confidence: 78 + Math.random() * 10,
        change_percent: typeof lastPrice === 'number' ? withChange(vary(pred1w.price, 0.025)) : pred1w.change_percent,
        predictions_1d: (() => { const price = vary(pred1d.price, 0.025); return { ...pred1d, price, change_percent: withChange(price) }; })(),
        predictions_2d: (() => { const price = vary(pred2d.price, 0.025); return { ...pred2d, price, change_percent: withChange(price) }; })(),
        predictions_1w: (() => { const price = vary(pred1w.price, 0.025); return { ...pred1w, price, change_percent: withChange(price) }; })(),
      },
    };

    return {
      models: modelPredictions,
      historicalData: data.historicalData,
      nextDate: data.prediction.date,
      multiTimeframe: {
        oneDay: pred1d,
        twoDay: pred2d,
        oneWeek: pred1w,
      },
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

const pollJob = async (jobId, timeoutMs = 20000, intervalMs = 1000) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await makeRequest(`${BASE_URL}/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error('Failed to poll job');
    }

    const body = await response.json();
    if (body.status === 'done' || body.status === 'failed') {
      return body;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: 'timeout' };
};

export const getStockData = async (symbol) => {
  if (DEMO_MODE) {
    return demoApi.getStockData(symbol);
  }

  const response = await fetch(`${BASE_URL}/stock/${symbol}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stock data');
  }
  return response.json();
};

export const getApiStatus = async () => {
  if (DEMO_MODE) {
    return demoApi.getApiStatus();
  }

  try {
    const response = await fetch(`${BASE_URL}/status`);
    if (!response.ok) {
      throw new Error('status not ok');
    }

    const body = await response.json();
    return {
      redis: body.redis,
      queue: body.queue,
      storage: body.storage || 'unknown',
    };
  } catch (_) {
    return { redis: 'err', queue: 'err', storage: 'err' };
  }
};

export const getIntraday = async (symbol) => {
  if (DEMO_MODE) {
    return demoApi.getIntraday(symbol);
  }

  const response = await fetch(`${BASE_URL}/intraday/${symbol}`);
  if (!response.ok) {
    throw new Error('failed to fetch intraday');
  }
  return response.json();
};

export const getTimeSeries = async (symbol, range = '1M') => {
  if (DEMO_MODE) {
    return demoApi.getTimeSeries(symbol, range);
  }

  const response = await fetch(`${BASE_URL}/timeseries/${symbol}?range=${encodeURIComponent(range)}`);
  if (!response.ok) {
    throw new Error('failed to fetch timeseries');
  }
  return response.json();
};

export const getTickerData = async (symbol) => {
  if (DEMO_MODE) {
    return demoApi.getTickerData(symbol);
  }

  try {
    const response = await fetch(`${BASE_URL}/timeseries/${symbol}?range=1W&v=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.points || data.points.length < 2) {
      throw new Error('Insufficient data points');
    }

    const normalized = data.points
      .map((point) => ({
        date: new Date(point.date),
        price: parseFloat(point.price),
      }))
      .filter((point) => !isNaN(point.date.getTime()) && isFinite(point.price));

    const sliced = normalized.slice(-5);
    return {
      series: {
        points: sliced.map((point) => ({
          timestamp: point.date.toISOString(),
          close: point.price,
        })),
      },
    };
  } catch (error) {
    console.error(`Backend API error for ${symbol}:`, error);
    throw error;
  }
};

export const getTickersBatch = async (symbols) => {
  if (DEMO_MODE) {
    return demoApi.getTickersBatch(symbols);
  }

  const symbolsParam = symbols.join(',');
  const response = await fetch(`${BASE_URL}/tickers/batch?symbols=${symbolsParam}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const getNews = async (symbolOrLimit = null, maybeLimit = 3) => {
  const symbol = typeof symbolOrLimit === 'string' ? symbolOrLimit : null;
  const limit = typeof symbolOrLimit === 'number'
    ? symbolOrLimit
    : (typeof maybeLimit === 'number' ? maybeLimit : 3);

  if (DEMO_MODE) {
    return demoApi.getNews(symbol, limit);
  }

  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (symbol) {
    query.set('symbol', symbol);
  }

  const response = await fetch(`${BASE_URL}/news?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.articles || [];
};

export const getOverview = async (symbol) => {
  if (DEMO_MODE) {
    return demoApi.getOverview(symbol);
  }

  const response = await fetch(`${BASE_URL}/overview/${symbol}`);
  if (!response.ok) {
    throw new Error('failed to fetch overview');
  }
  return response.json();
};
