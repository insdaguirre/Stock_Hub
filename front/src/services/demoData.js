const DEMO_TOKEN_PREFIX = 'demo-session-';

export const DEMO_CREDENTIALS = Object.freeze({
  username: 'demo',
  password: 'demo123',
});

export const DEMO_USER = Object.freeze({
  id: 1,
  username: 'demo',
  email: 'demo@stockhub.local',
  firstName: 'Demo',
  lastName: 'User',
});

export const DEMO_STOCKS = Object.freeze([
  'AAPL',
  'MSFT',
  'NVDA',
  'TSLA',
  'AMZN',
  'GOOGL',
  'META',
  'NFLX',
  'AMD',
  'INTC',
  'ORCL',
  'CRM',
  'SPY',
]);

const STOCK_LIBRARY = {
  AAPL: {
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    exchange: 'NASDAQ',
    description: 'Apple designs consumer hardware, software, and services anchored by the iPhone, Mac, and a large recurring-services business.',
    price: 198.42,
    marketCap: 3.03e12,
    pe: 31.4,
    eps: 6.32,
    dividendYield: 0.0046,
    beta: 1.16,
    trend: 0.11,
    volatility: 1.35,
    predictionBias: 1.9,
  },
  MSFT: {
    name: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software Infrastructure',
    exchange: 'NASDAQ',
    description: 'Microsoft sells cloud, productivity, enterprise software, and AI platform products across commercial and consumer markets.',
    price: 428.1,
    marketCap: 3.19e12,
    pe: 35.1,
    eps: 12.2,
    dividendYield: 0.0071,
    beta: 0.94,
    trend: 0.12,
    volatility: 1.15,
    predictionBias: 1.5,
  },
  NVDA: {
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NASDAQ',
    description: 'NVIDIA provides accelerated computing hardware and software used in AI infrastructure, gaming, automotive, and enterprise workloads.',
    price: 124.85,
    marketCap: 3.05e12,
    pe: 61.8,
    eps: 2.02,
    dividendYield: 0.0004,
    beta: 1.73,
    trend: 0.18,
    volatility: 2.45,
    predictionBias: 2.8,
  },
  TSLA: {
    name: 'Tesla, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers',
    exchange: 'NASDAQ',
    description: 'Tesla develops electric vehicles, energy storage systems, and vertically integrated software for vehicle autonomy and fleet operations.',
    price: 227.6,
    marketCap: 0.73e12,
    pe: 66.2,
    eps: 3.44,
    dividendYield: 0,
    beta: 2.08,
    trend: 0.05,
    volatility: 2.8,
    predictionBias: 1.1,
  },
  AMZN: {
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    exchange: 'NASDAQ',
    description: 'Amazon operates a global ecommerce, advertising, logistics, and cloud platform led by AWS and Prime subscriptions.',
    price: 184.73,
    marketCap: 1.95e12,
    pe: 43.7,
    eps: 4.23,
    dividendYield: 0,
    beta: 1.23,
    trend: 0.1,
    volatility: 1.55,
    predictionBias: 1.6,
  },
  GOOGL: {
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    exchange: 'NASDAQ',
    description: 'Alphabet operates Google Search, YouTube, Google Cloud, Android, and a portfolio of AI products and emerging businesses.',
    price: 171.28,
    marketCap: 2.12e12,
    pe: 28.9,
    eps: 5.93,
    dividendYield: 0.0045,
    beta: 1.04,
    trend: 0.09,
    volatility: 1.3,
    predictionBias: 1.3,
  },
  META: {
    name: 'Meta Platforms, Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    exchange: 'NASDAQ',
    description: 'Meta runs large-scale social media and advertising platforms while investing in AI systems and immersive computing products.',
    price: 501.92,
    marketCap: 1.27e12,
    pe: 26.4,
    eps: 18.99,
    dividendYield: 0.0031,
    beta: 1.19,
    trend: 0.13,
    volatility: 1.5,
    predictionBias: 2,
  },
  NFLX: {
    name: 'Netflix, Inc.',
    sector: 'Communication Services',
    industry: 'Entertainment',
    exchange: 'NASDAQ',
    description: 'Netflix provides a global subscription streaming platform with growing advertising, gaming, and original-content investments.',
    price: 632.44,
    marketCap: 0.27e12,
    pe: 39.6,
    eps: 15.98,
    dividendYield: 0,
    beta: 1.31,
    trend: 0.12,
    volatility: 1.65,
    predictionBias: 1.4,
  },
  AMD: {
    name: 'Advanced Micro Devices, Inc.',
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NASDAQ',
    description: 'AMD develops CPUs, GPUs, and data-center accelerators for personal computing, enterprise servers, and AI infrastructure.',
    price: 174.32,
    marketCap: 0.28e12,
    pe: 52.4,
    eps: 3.33,
    dividendYield: 0,
    beta: 1.67,
    trend: 0.14,
    volatility: 2.25,
    predictionBias: 2.2,
  },
  INTC: {
    name: 'Intel Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NASDAQ',
    description: 'Intel builds client, data-center, foundry, and networking products while restructuring around manufacturing execution and AI PCs.',
    price: 37.18,
    marketCap: 0.16e12,
    pe: 21.2,
    eps: 1.75,
    dividendYield: 0.0124,
    beta: 1.03,
    trend: 0.04,
    volatility: 1.9,
    predictionBias: 0.8,
  },
  ORCL: {
    name: 'Oracle Corporation',
    sector: 'Technology',
    industry: 'Software Infrastructure',
    exchange: 'NYSE',
    description: 'Oracle sells database, ERP, and cloud infrastructure products, with growth tied to enterprise migrations and AI capacity demand.',
    price: 141.63,
    marketCap: 0.39e12,
    pe: 32.2,
    eps: 4.4,
    dividendYield: 0.0103,
    beta: 0.97,
    trend: 0.09,
    volatility: 1.2,
    predictionBias: 1.2,
  },
  CRM: {
    name: 'Salesforce, Inc.',
    sector: 'Technology',
    industry: 'Software Application',
    exchange: 'NYSE',
    description: 'Salesforce delivers customer relationship, automation, analytics, and AI workflow software to enterprise customers.',
    price: 301.55,
    marketCap: 0.29e12,
    pe: 36.1,
    eps: 8.35,
    dividendYield: 0.0053,
    beta: 1.28,
    trend: 0.08,
    volatility: 1.45,
    predictionBias: 1.1,
  },
  SPY: {
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'ETF',
    industry: 'Large Blend',
    exchange: 'NYSE Arca',
    description: 'SPY tracks the S&P 500 and is used here as a market benchmark for the dashboard and demo comparison flows.',
    price: 534.82,
    marketCap: 0.52e12,
    pe: 25.8,
    eps: 20.73,
    dividendYield: 0.0134,
    beta: 1.0,
    trend: 0.07,
    volatility: 0.95,
    predictionBias: 0.9,
  },
};

const MODEL_CONFIG = {
  1: { accuracyOffset: 0, confidence: 91.2, biasOffset: 0 },
  2: { accuracyOffset: -1.4, confidence: 88.4, biasOffset: -0.32 },
  3: { accuracyOffset: -2.6, confidence: 86.8, biasOffset: 0.18 },
  4: { accuracyOffset: -0.9, confidence: 89.7, biasOffset: 0.42 },
  5: { accuracyOffset: -4.4, confidence: 83.9, biasOffset: -0.58 },
};

const GLOBAL_NEWS_TEMPLATES = [
  {
    title: 'AI infrastructure spending keeps semiconductor demand elevated',
    summary: 'Chip and cloud names lead the tape as enterprise buyers continue prioritizing accelerator capacity and data-center expansion.',
    source: 'MarketWatch',
    symbol: 'NVDA',
  },
  {
    title: 'Mega-cap software names support index breadth in quiet session',
    summary: 'Large platform companies continue to hold up broader equities as investors look for durable earnings and free-cash-flow visibility.',
    source: 'Reuters',
    symbol: 'MSFT',
  },
  {
    title: 'Retail and cloud spending remain in focus ahead of earnings cycle',
    summary: 'Portfolio managers are positioning around companies with resilient consumer demand and improving cloud-margin trends.',
    source: 'Bloomberg',
    symbol: 'AMZN',
  },
  {
    title: 'Auto and EV trade stays volatile as delivery expectations reset',
    summary: 'Traders continue rotating between growth exposure and profitability discipline across electric-vehicle names.',
    source: 'CNBC',
    symbol: 'TSLA',
  },
  {
    title: 'Digital advertising rebound helps communication-services sentiment',
    summary: 'Ad pricing and engagement trends remain constructive for major internet platforms despite mixed macro commentary.',
    source: 'Yahoo Finance',
    symbol: 'META',
  },
  {
    title: 'S&P 500 benchmark holds near highs as leadership broadens',
    summary: 'Index positioning remains constructive as investors rebalance between quality growth and cyclical participation.',
    source: 'Barron\'s',
    symbol: 'SPY',
  },
];

const historyCache = new Map();
const intradayCache = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withLatency = async (value, ms = 120) => {
  await wait(ms);
  return value;
};

const normalizeSymbol = (symbol) => (symbol || 'SPY').toString().trim().toUpperCase();

const hashSymbol = (symbol) => {
  const text = normalizeSymbol(symbol);
  return [...text].reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 17), 0);
};

const createRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const round = (value, digits = 2) => Number(value.toFixed(digits));

const formatMarketCap = (marketCap) => {
  if (marketCap >= 1e12) return `${round(marketCap / 1e12, 2)}T`;
  return `${round(marketCap / 1e9, 1)}B`;
};

const makeSvgDataUrl = (symbol, accent) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1220" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)" />
      <g fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2">
        <path d="M0 260 C120 210, 180 300, 320 210 S520 130, 640 150" />
        <path d="M0 290 C100 250, 220 330, 360 250 S520 200, 640 220" />
      </g>
      <text x="48" y="88" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${symbol}</text>
      <text x="48" y="126" fill="rgba(255,255,255,0.85)" font-family="Arial, Helvetica, sans-serif" font-size="18">StockHub demo market brief</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const buildFallbackProfile = (symbol) => {
  const rng = createRandom(hashSymbol(symbol));
  const sectors = ['Technology', 'Communication Services', 'Consumer Cyclical', 'Industrials'];
  const industries = ['Software', 'Semiconductors', 'Digital Platforms', 'Cloud Infrastructure'];
  const price = 40 + rng() * 420;
  return {
    name: `${symbol} Holdings`,
    sector: sectors[Math.floor(rng() * sectors.length)],
    industry: industries[Math.floor(rng() * industries.length)],
    exchange: rng() > 0.5 ? 'NASDAQ' : 'NYSE',
    description: `${symbol} is a demo equity used to keep the StockHub static experience working without any external market data services.`,
    price,
    marketCap: (40 + rng() * 900) * 1e9,
    pe: 14 + rng() * 36,
    eps: 1.5 + rng() * 10,
    dividendYield: rng() > 0.55 ? rng() * 0.018 : 0,
    beta: 0.8 + rng() * 1.1,
    trend: 0.04 + rng() * 0.12,
    volatility: 1 + rng() * 1.8,
    predictionBias: 0.6 + rng() * 2.1,
  };
};

const getProfile = (symbol) => {
  const normalized = normalizeSymbol(symbol);
  return {
    symbol: normalized,
    ...(STOCK_LIBRARY[normalized] || buildFallbackProfile(normalized)),
  };
};

const getTradingDays = (count) => {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(16, 0, 0, 0);

  while (dates.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return dates;
};

const buildDailyHistory = (symbol) => {
  const normalized = normalizeSymbol(symbol);
  if (historyCache.has(normalized)) {
    return historyCache.get(normalized);
  }

  const profile = getProfile(normalized);
  const rng = createRandom(hashSymbol(normalized) * 13);
  const dates = getTradingDays(520);
  const history = [];
  let price = profile.price * (0.82 + rng() * 0.08);

  dates.forEach((date, index) => {
    const seasonal = Math.sin(index / 18) * profile.volatility * 0.28;
    const drift = profile.trend + seasonal;
    const noise = (rng() - 0.5) * profile.volatility * 1.6;
    const movePct = (drift + noise) / 100;
    const open = price;
    const close = Math.max(5, open * (1 + movePct));
    const high = Math.max(open, close) * (1 + rng() * 0.012);
    const low = Math.min(open, close) * (1 - rng() * 0.012);
    const volumeBase = Math.max(15, profile.marketCap / 1e10);
    const volume = Math.round((volumeBase * 850000 + rng() * 4200000) * (1 + profile.volatility / 8));

    history.push({
      date: date.toISOString().slice(0, 10),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    });

    price = close;
  });

  const latest = history[history.length - 1];
  const scale = profile.price / latest.close;
  const scaled = history.map((entry) => ({
    ...entry,
    open: round(entry.open * scale),
    high: round(entry.high * scale),
    low: round(entry.low * scale),
    close: round(entry.close * scale),
  }));

  historyCache.set(normalized, scaled);
  return scaled;
};

const getQuote = (symbol) => {
  const profile = getProfile(symbol);
  const history = buildDailyHistory(symbol);
  const latest = history[history.length - 1];
  const previous = history[history.length - 2] || latest;
  const highs = history.map((point) => point.high);
  const lows = history.map((point) => point.low);
  const avgVolume = history.slice(-30).reduce((sum, point) => sum + point.volume, 0) / 30;

  return {
    symbol: profile.symbol,
    name: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    exchange: profile.exchange,
    description: profile.description,
    price: latest.close,
    previousClose: previous.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    volume: latest.volume,
    avgVolume: Math.round(avgVolume),
    marketCap: profile.marketCap,
    pe: profile.pe,
    eps: profile.eps,
    dividendYield: profile.dividendYield,
    beta: profile.beta,
    fiftyTwoWeekHigh: round(Math.max(...highs)),
    fiftyTwoWeekLow: round(Math.min(...lows)),
  };
};

const getIntradayPoints = (symbol) => {
  const normalized = normalizeSymbol(symbol);
  if (intradayCache.has(normalized)) {
    return intradayCache.get(normalized);
  }

  const dailyHistory = buildDailyHistory(normalized);
  const latest = dailyHistory[dailyHistory.length - 1];
  const rng = createRandom(hashSymbol(normalized) * 29);
  const pointCount = 40;
  const baseDate = new Date();
  baseDate.setHours(9, 30, 0, 0);
  let current = latest.open;

  const points = Array.from({ length: pointCount }, (_, index) => {
    const stamp = new Date(baseDate.getTime() + index * 10 * 60 * 1000);
    const anchor = latest.open + ((latest.close - latest.open) * index) / Math.max(1, pointCount - 1);
    current = Math.max(5, anchor + (rng() - 0.5) * (latest.close * 0.0055));
    return {
      date: stamp.toISOString(),
      price: round(current),
    };
  });

  points[points.length - 1].price = latest.close;
  intradayCache.set(normalized, points);
  return points;
};

const getRangePoints = (symbol, range = '1M') => {
  const normalized = normalizeSymbol(symbol);
  if (range === '1D') {
    return getIntradayPoints(normalized);
  }

  const history = buildDailyHistory(normalized);
  const today = new Date();
  const rangeMap = {
    '1W': 5,
    '1M': 22,
    '3M': 66,
    '6M': 132,
    '1Y': 252,
    '2Y': 504,
  };

  let selected = history;
  if (range === 'YTD') {
    const startOfYear = `${today.getFullYear()}-01-01`;
    selected = history.filter((point) => point.date >= startOfYear);
  } else if (rangeMap[range]) {
    selected = history.slice(-rangeMap[range]);
  }

  if (!selected.length) {
    selected = history.slice(-30);
  }

  return selected.map((point) => ({
    date: point.date,
    price: point.close,
  }));
};

const getNextTradingDate = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString().slice(0, 10);
};

const buildMultiTimeframePredictions = (symbol) => {
  const profile = getProfile(symbol);
  const quote = getQuote(symbol);
  const base = quote.price;
  const oneDayPct = profile.predictionBias;
  const twoDayPct = oneDayPct * 1.35;
  const oneWeekPct = oneDayPct * 2.2;

  const buildPoint = (changePct, date) => {
    const price = round(base * (1 + changePct / 100));
    return {
      date,
      price,
      baseline: base,
      change_percent: round(((price - base) / base) * 100),
    };
  };

  return {
    oneDay: buildPoint(oneDayPct, getNextTradingDate()),
    twoDay: buildPoint(twoDayPct, getNextTradingDate()),
    oneWeek: buildPoint(oneWeekPct, getNextTradingDate()),
  };
};

const buildPredictions = (symbol) => {
  const quote = getQuote(symbol);
  const history = buildDailyHistory(symbol);
  const timeframes = buildMultiTimeframePredictions(symbol);
  const baseAccuracy = 89.6;

  const buildModelPayload = (modelId) => {
    const config = MODEL_CONFIG[modelId];
    const applyBias = (entry) => {
      const biasedPrice = round(entry.price * (1 + config.biasOffset / 100));
      return {
        ...entry,
        price: biasedPrice,
        change_percent: round(((biasedPrice - quote.price) / quote.price) * 100),
      };
    };

    return {
      prediction: applyBias(timeframes.oneWeek).price,
      accuracy: round(baseAccuracy + config.accuracyOffset),
      confidence: config.confidence,
      change_percent: applyBias(timeframes.oneWeek).change_percent,
      predictions_1d: applyBias(timeframes.oneDay),
      predictions_2d: applyBias(timeframes.twoDay),
      predictions_1w: applyBias(timeframes.oneWeek),
    };
  };

  return {
    models: {
      1: buildModelPayload(1),
      2: buildModelPayload(2),
      3: buildModelPayload(3),
      4: buildModelPayload(4),
      5: buildModelPayload(5),
    },
    historicalData: history.slice(-30).map((point) => ({
      date: point.date,
      price: point.close,
    })),
    nextDate: timeframes.oneDay.date,
    prediction: timeframes.oneWeek,
    multiTimeframe: timeframes,
  };
};

const buildStockData = (symbol) => {
  const quote = getQuote(symbol);
  return {
    ...quote,
    historicalData: buildDailyHistory(symbol).slice(-30).map((point) => ({
      date: point.date,
      price: point.close,
    })),
  };
};

const buildOverview = (symbol) => {
  const quote = getQuote(symbol);
  return {
    symbol: quote.symbol,
    name: quote.name,
    sector: quote.sector,
    industry: quote.industry,
    description: quote.description,
    exchange: quote.exchange,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    prevClose: quote.previousClose,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    marketCap: quote.marketCap,
    pe: quote.pe,
    eps: quote.eps,
    dividendYield: quote.dividendYield,
    beta: quote.beta,
  };
};

const buildTickerBatchEntry = (symbol) => {
  const points = getRangePoints(symbol, '1W').map((point) => ({
    timestamp: `${point.date}T16:00:00.000Z`,
    close: point.price,
  }));

  return {
    current_price: points[points.length - 1]?.close ?? getQuote(symbol).price,
    previous_price: points[points.length - 2]?.close ?? getQuote(symbol).previousClose,
    points,
    computed_at: new Date().toISOString(),
  };
};

const buildSymbolNews = (symbol) => {
  const quote = getQuote(symbol);
  const profile = getProfile(symbol);
  const marketCap = formatMarketCap(quote.marketCap);

  return [
    {
      title: `${symbol} demo outlook stays constructive after product and margin review`,
      summary: `${profile.name} remains one of the stronger names in the StockHub demo set, with stable execution and a believable ${marketCap} market-cap profile.`,
      source: 'Reuters',
    },
    {
      title: `${symbol} analysts focus on next-quarter execution and demand visibility`,
      summary: `Desk commentary is centered on ${profile.industry.toLowerCase()} demand trends, cost discipline, and whether ${symbol} can extend recent momentum.`,
      source: 'Bloomberg',
    },
    {
      title: `${symbol} attracts fresh interest in the weekly momentum screen`,
      summary: `The StockHub demo model keeps ${symbol} in focus because of improving trend quality, above-average liquidity, and a clear sector narrative.`,
      source: 'CNBC',
    },
  ];
};

const buildNewsArticles = (symbol = null, limit = 6) => {
  const selectedSymbol = symbol ? normalizeSymbol(symbol) : null;
  const templates = selectedSymbol
    ? buildSymbolNews(selectedSymbol)
    : GLOBAL_NEWS_TEMPLATES;

  return templates.slice(0, limit).map((template, index) => {
    const articleSymbol = template.symbol || selectedSymbol || DEMO_STOCKS[index % DEMO_STOCKS.length];
    const publishedAt = new Date(Date.now() - index * 3 * 60 * 60 * 1000).toISOString();
    const accentPalette = ['#1d4ed8', '#0f766e', '#7c3aed', '#b45309', '#0f9d58', '#be123c'];

    return {
      id: `${articleSymbol}-${index}`,
      symbol: articleSymbol,
      title: template.title,
      summary: template.summary,
      description: template.summary,
      source: template.source,
      publishedAt,
      url: '#/predict',
      imageUrl: makeSvgDataUrl(articleSymbol, accentPalette[index % accentPalette.length]),
    };
  });
};

const readJson = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const writeJson = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
};

export const isDemoToken = (token) => typeof token === 'string' && token.startsWith(DEMO_TOKEN_PREFIX);

export const readDemoSession = () => {
  const session = readJson('stockhub_demo_session');
  if (!session || !isDemoToken(session.token)) {
    return null;
  }
  return session;
};

export const createDemoSession = () => {
  const session = {
    token: `${DEMO_TOKEN_PREFIX}${Date.now()}`,
    user: { ...DEMO_USER },
    createdAt: new Date().toISOString(),
  };
  writeJson('stockhub_demo_session', session);
  return session;
};

export const clearDemoSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('stockhub_demo_session');
  } catch (_) {}
};

export const demoApi = {
  async getApiStatus() {
    return withLatency({ redis: 'ok', queue: 'ok', storage: 'ok' }, 60);
  },

  async getStockData(symbol) {
    return withLatency(buildStockData(symbol), 100);
  },

  async getPredictions(symbol) {
    return withLatency(buildPredictions(symbol), 180);
  },

  async getIntraday(symbol) {
    const points = getIntradayPoints(symbol);
    return withLatency({
      symbol: normalizeSymbol(symbol),
      market: 'closed',
      asOf: points[points.length - 1]?.date || new Date().toISOString(),
      points,
    }, 90);
  },

  async getTimeSeries(symbol, range = '1M') {
    return withLatency({
      symbol: normalizeSymbol(symbol),
      range,
      points: getRangePoints(symbol, range),
    }, 90);
  },

  async getTickerData(symbol) {
    return withLatency({
      series: {
        points: buildTickerBatchEntry(symbol).points,
      },
    }, 90);
  },

  async getTickersBatch(symbols) {
    const tickers = {};
    const errors = {};

    (symbols || []).forEach((symbol) => {
      const normalized = normalizeSymbol(symbol);
      tickers[normalized] = buildTickerBatchEntry(normalized);
    });

    return withLatency({
      tickers,
      errors,
      market_hours: false,
      cache_ttl_seconds: 3600,
      cached_at: new Date().toISOString(),
    }, 110);
  },

  async getNews(symbol = null, limit = 6) {
    return withLatency(buildNewsArticles(symbol, limit), 80);
  },

  async getOverview(symbol) {
    return withLatency(buildOverview(symbol), 80);
  },
};
