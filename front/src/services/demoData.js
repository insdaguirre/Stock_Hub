// Demo data generator for static GitHub Pages deployment
// Generates realistic mock stock data for demo purposes

const DEMO_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
const DEMO_NEWS_SOURCES = ['Bloomberg', 'Reuters', 'CNBC', 'MarketWatch', 'Yahoo Finance'];

// Seeded random number generator for deterministic data
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Generate deterministic demo quote
export const generateDemoQuote = (symbol) => {
  const seed = symbol.charCodeAt(0) * 1000;
  const rng = new SeededRandom(seed);
  
  const basePrice = {
    AAPL: 150,
    GOOGL: 140,
    MSFT: 380,
    TSLA: 240,
    AMZN: 180,
  }[symbol] || 100;

  const volatility = rng.next() * 0.05;
  const currentPrice = basePrice * (1 + volatility);
  const change = (rng.next() - 0.5) * 5;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    previousClose: parseFloat(basePrice.toFixed(2)),
    open: parseFloat((basePrice * (1 + (rng.next() - 0.5) * 0.02)).toFixed(2)),
    high: parseFloat((currentPrice * 1.02).toFixed(2)),
    low: parseFloat((currentPrice * 0.98).toFixed(2)),
    volume: Math.floor(rng.next() * 50000000 + 10000000),
    marketCap: Math.floor(rng.next() * 2000000000000 + 500000000000),
    peRatio: parseFloat((rng.next() * 25 + 10).toFixed(2)),
    eps: parseFloat((rng.next() * 5 + 2).toFixed(2)),
    avgVolume: Math.floor(rng.next() * 50000000 + 10000000),
    beta: parseFloat((rng.next() * 1 + 0.5).toFixed(2)),
    fiftyTwoWeekHigh: parseFloat((basePrice * 1.3).toFixed(2)),
    fiftyTwoWeekLow: parseFloat((basePrice * 0.7).toFixed(2)),
  };
};

// Generate demo daily series (historical data)
export const generateDemoDailySeries = (symbol, days = 365) => {
  const seed = symbol.charCodeAt(0) * 1000 + 1;
  const rng = new SeededRandom(seed);
  
  const basePrice = {
    AAPL: 150,
    GOOGL: 140,
    MSFT: 380,
    TSLA: 240,
    AMZN: 180,
  }[symbol] || 100;

  const data = [];
  let currentPrice = basePrice;
  const endDate = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (rng.next() - 0.5) * 2;
    currentPrice = Math.max(currentPrice + change, basePrice * 0.5);

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat((currentPrice * (1 + (rng.next() - 0.5) * 0.01)).toFixed(2)),
      high: parseFloat((currentPrice * 1.02).toFixed(2)),
      low: parseFloat((currentPrice * 0.98).toFixed(2)),
      close: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(rng.next() * 50000000 + 10000000),
    });
  }

  return data;
};

// Generate demo intraday series (5-minute intervals)
export const generateDemoIntraday = (symbol) => {
  const seed = symbol.charCodeAt(0) * 1000 + 2;
  const rng = new SeededRandom(seed);
  
  const basePrice = {
    AAPL: 150,
    GOOGL: 140,
    MSFT: 380,
    TSLA: 240,
    AMZN: 180,
  }[symbol] || 100;

  const data = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = 78; i >= 0; i--) {
    const time = new Date(now);
    time.setMinutes(time.getMinutes() - i * 5);
    
    const change = (rng.next() - 0.5) * 1;
    currentPrice = Math.max(currentPrice + change, basePrice * 0.99);

    data.push({
      time: time.toISOString(),
      open: parseFloat((currentPrice * (1 + (rng.next() - 0.5) * 0.005)).toFixed(2)),
      high: parseFloat((currentPrice * 1.01).toFixed(2)),
      low: parseFloat((currentPrice * 0.99).toFixed(2)),
      close: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(rng.next() * 1000000 + 100000),
    });
  }

  return data;
};

// Generate demo company overview
export const generateDemoOverview = (symbol) => {
  const seed = symbol.charCodeAt(0) * 1000 + 3;
  const rng = new SeededRandom(seed);
  
  const descriptions = {
    AAPL: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    GOOGL: 'Alphabet Inc. offers various products and platforms in the United States, Europe, and internationally.',
    MSFT: 'Microsoft Corporation develops, licenses, and supports software, services and devices worldwide.',
    TSLA: 'Tesla, Inc. designs, develops, manufactures, sells, and leases high-performance fully electric vehicles.',
    AMZN: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.',
  };

  return {
    symbol,
    name: symbol,
    description: descriptions[symbol] || `${symbol} is a public company.`,
    sector: ['Technology', 'Consumer', 'Energy', 'Healthcare', 'Finance'][Math.floor(rng.next() * 5)],
    industry: 'Technology',
    website: `https://www.${symbol.toLowerCase()}.com`,
    ceo: 'Chief Executive Officer',
    employees: Math.floor(rng.next() * 100000 + 10000),
    founded: 2000 + Math.floor(rng.next() * 20),
    country: 'USA',
    currency: 'USD',
    exchange: 'NASDAQ',
  };
};

// Generate demo news articles
export const generateDemoNews = (symbol) => {
  const seed = symbol.charCodeAt(0) * 1000 + 4;
  const rng = new SeededRandom(seed);
  
  const headlines = [
    `${symbol} Reports Strong Q4 Earnings`,
    `Analysts Upgrade ${symbol} with Positive Outlook`,
    `${symbol} Announces New Product Line`,
    `Market Analysts See Potential for ${symbol}`,
    `${symbol} Partners with Industry Leaders`,
    `${symbol} Expands into New Markets`,
    `Investors Show Confidence in ${symbol}`,
    `${symbol} Launches Innovation Initiative`,
    `${symbol} Achieves Record Revenue`,
    `${symbol} Strengthens Market Position`,
  ];

  const articles = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    articles.push({
      title: headlines[Math.floor(rng.next() * headlines.length)],
      description: `Latest news and updates about ${symbol}. Market sentiment remains positive with strong fundamentals.`,
      url: `https://example.com/news/${Math.floor(rng.next() * 1000000)}`,
      imageUrl: `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#${Math.floor(rng.next() * 16777215).toString(16)}"/><text x="50" y="50" font-size="12" fill="white" text-anchor="middle" dy=".3em">${symbol}</text></svg>`)}`,
      source: DEMO_NEWS_SOURCES[Math.floor(rng.next() * DEMO_NEWS_SOURCES.length)],
      publishedAt: date.toISOString(),
    });
  }

  return articles;
};

// Generate demo prediction
export const generateDemoPrediction = (symbol) => {
  const seed = symbol.charCodeAt(0) * 1000 + 5;
  const rng = new SeededRandom(seed);
  
  const basePrice = {
    AAPL: 150,
    GOOGL: 140,
    MSFT: 380,
    TSLA: 240,
    AMZN: 180,
  }[symbol] || 100;

  const predictions = [];
  let currentPrice = basePrice;

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const change = (rng.next() - 0.5) * 3;
    currentPrice = Math.max(currentPrice + change, basePrice * 0.7);

    predictions.push({
      date: date.toISOString().split('T')[0],
      predictedClose: parseFloat(currentPrice.toFixed(2)),
      confidence: parseFloat((75 + rng.next() * 20).toFixed(1)),
    });
  }

  return {
    symbol,
    predictions,
    lastUpdated: new Date().toISOString(),
    model: 'Demo Ensemble Model',
  };
};

// Mock API responses for demo mode
export const mockApiResponses = {
  // Auth endpoints
  '/api/auth/login': async (body) => {
    if (body.username_or_email === 'demo' && body.password === 'demo123') {
      return {
        ok: true,
        json: async () => ({
          access_token: 'demo-token-' + Date.now(),
          token_type: 'bearer',
        }),
      };
    }
    return {
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    };
  },

  '/api/auth/me': async () => {
    return {
      ok: true,
      json: async () => ({
        id: 1,
        username: 'demo',
        email: 'demo@stockhubdemo.com',
        firstName: 'Demo',
        lastName: 'User',
      }),
    };
  },

  // Stock quote endpoint
  '/api/stocks/(\\w+)/quote': async (symbol) => {
    return {
      ok: true,
      json: async () => generateDemoQuote(symbol),
    };
  },

  // Daily series endpoint
  '/api/stocks/(\\w+)/daily': async (symbol) => {
    return {
      ok: true,
      json: async () => ({
        symbol,
        data: generateDemoDailySeries(symbol),
        lastRefresh: new Date().toISOString(),
      }),
    };
  },

  // Intraday endpoint
  '/api/stocks/(\\w+)/intraday': async (symbol) => {
    return {
      ok: true,
      json: async () => ({
        symbol,
        data: generateDemoIntraday(symbol),
        lastRefresh: new Date().toISOString(),
      }),
    };
  },

  // Overview endpoint
  '/api/stocks/(\\w+)/overview': async (symbol) => {
    return {
      ok: true,
      json: async () => generateDemoOverview(symbol),
    };
  },

  // News endpoint
  '/api/stocks/(\\w+)/news': async (symbol) => {
    return {
      ok: true,
      json: async () => ({
        symbol,
        news: generateDemoNews(symbol),
        lastRefresh: new Date().toISOString(),
      }),
    };
  },

  // Prediction endpoint
  '/api/predictions/(\\w+)': async (symbol) => {
    return {
      ok: true,
      json: async () => generateDemoPrediction(symbol),
    };
  },

  // Portfolio endpoint
  '/api/portfolio': async () => {
    return {
      ok: true,
      json: async () => ({
        watchlist: DEMO_STOCKS,
        portfolio: DEMO_STOCKS.map(s => ({
          symbol: s,
          shares: Math.floor(Math.random() * 10) + 1,
          boughtAt: parseFloat((Math.random() * 100 + 50).toFixed(2)),
        })),
      }),
    };
  },

  // Available stocks endpoint
  '/api/stocks': async () => {
    return {
      ok: true,
      json: async () => ({
        stocks: DEMO_STOCKS.map(s => ({
          symbol: s,
          name: s,
        })),
      }),
    };
  },
};

// Match URL pattern and extract parameter
const matchUrlPattern = (url, pattern) => {
  const regex = new RegExp('^' + pattern.replace(/\(.*?\)/g, '([^/]+)') + '$');
  const match = url.match(regex);
  return match ? match.slice(1) : null;
};

// Get mock response for a URL
export const getMockResponse = async (url, method = 'GET', body = null) => {
  // Remove query parameters and base URL
  const cleanUrl = url.split('?')[0];
  
  for (const [pattern, handler] of Object.entries(mockApiResponses)) {
    if (method === 'POST' && pattern === '/api/auth/login' && cleanUrl.endsWith(pattern)) {
      return handler(body);
    }
    if (method === 'GET') {
      const params = matchUrlPattern(cleanUrl, pattern);
      if (params) {
        return handler(params[0]);
      }
    }
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ detail: 'Not found' }),
  };
};
