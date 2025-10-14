// src/components/PredictPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getPredictions, getIntraday, getTimeSeries, getOverview, loadLastPredictions } from '../services/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ProgressBar from './ProgressBar';
import colors from '../styles/colors';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.gradientDark};
  color: ${colors.textPrimary};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
`;

const MainContent = styled.div`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 800;
  margin: 0 0 1rem 0;
  color: ${colors.textPrimary};
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: ${colors.textSecondary};
  margin: 0 0 2rem 0;
  font-weight: 300;
  line-height: 1.5;
`;

const DisclaimerText = styled.div`
  font-size: 14px;
  color: ${colors.textTertiary};
  margin: 1rem 0 2rem 0;
  text-align: center;
  padding: 1rem;
  background: ${colors.surfaceBackground};
  border: 1px solid ${colors.border};
  border-radius: 6px;
`;

const SearchSection = styled.div`
  background: ${colors.gradientCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 20px;
  background: ${colors.darkBackground};
  border: 1px solid ${colors.border};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-size: 16px;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.bullGreen};
    box-shadow: 0 0 0 2px ${colors.focus};
  }
  
  &::placeholder {
    color: ${colors.textTertiary};
  }
`;

const StockSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const StockSelectorTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const PredictButton = styled.button`
  background: ${colors.bullGreen};
  color: #000;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const IntradayCard = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const MarketStatus = styled.div`
  color: ${colors.textTertiary};
  font-size: 12px;
`;

const RangeTabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const RangeTab = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.active ? colors.bullGreen : colors.border};
  background: ${props => props.active ? 'rgba(0, 212, 170, 0.1)' : 'transparent'};
  color: ${props => props.active ? colors.bullGreen : colors.textSecondary};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    color: ${colors.bullGreen};
    background: rgba(0, 212, 170, 0.1);
    border-color: ${colors.bullGreen};
  }
`;

const ChartContainer = styled.div`
  height: 300px;
  margin-bottom: 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 1rem;
`;

const StatCard = styled.div`
  background: #0a0a0a;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${colors.textTertiary};
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 16px;
  color: ${colors.textPrimary};
  font-weight: 600;
`;

const LoadingContainer = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 2rem;
  margin: 1.5rem 0;
`;

const LoadingTitle = styled.h3`
  font-size: 20px;
  color: ${colors.textPrimary};
  margin: 0 0 1rem 0;
  text-align: center;
`;

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModelsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
  position: relative;
`;

const ModelCard = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${colors.bullGreen};
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.2);
  }
`;

const ModelInfo = styled.div`
  margin-bottom: 1rem;
`;

const ModelName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin-bottom: 4px;
`;

const ModelDescription = styled.div`
  font-size: 14px;
  color: ${colors.textTertiary};
`;

const ModelMetrics = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PredGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const PredCol = styled.div`
  text-align: center;
`;

const PredLabel = styled.div`
  font-size: 12px;
  color: ${colors.textTertiary};
  margin-bottom: 4px;
`;

const PredValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.value >= 0 ? colors.bullGreen : colors.bearRed};
`;

const Accuracy = styled.div`
  font-size: 14px;
  color: ${colors.textTertiary};
  text-align: right;
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #2d1b1b 0%, #3d2a2a 100%);
  border: 1px solid ${colors.bearRed};
  border-radius: 12px;
  padding: 1rem;
  color: ${colors.bearRed};
  margin: 1rem 0;
  text-align: center;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${colors.textPrimary};
  font-size: 18px;
  border-radius: 12px;
`;

const PredictPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => {
    try { return localStorage.getItem('sh:lastSymbol') || ''; } catch (_) { return ''; }
  });
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    try { return localStorage.getItem('sh:lastSymbol') || 'SPY'; } catch (_) { return 'SPY'; }
  });
  const [predictionsData, setPredictionsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);
  // Removed unused state variables to fix ESLint warnings
  const [intraday, setIntraday] = useState(null);
  const [range, setRange] = useState('1D');
  const [series, setSeries] = useState(null);
  const [overview, setOverview] = useState(null);
  const [lastFullDate, setLastFullDate] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const seriesCacheRef = useRef({});

  // Models data
  const models = [
    { id: 1, name: 'LSTM Neural Network', description: 'Deep Learning' },
    { id: 2, name: 'Random Forest', description: 'Ensemble Learning' },
    { id: 3, name: 'Prophet Model', description: 'Time Series Forecasting' },
    { id: 4, name: 'XGBoost', description: 'Gradient Boosting' },
    { id: 5, name: 'ARIMA', description: 'Statistical Model' }
  ];

  // Local storage cache helpers
  const loadFromStorage = (sym, r) => {
    try {
      const raw = localStorage.getItem(`sh:ts:${sym}:${r}`);
      if (!raw) return null;
      const js = JSON.parse(raw);
      if (!js || !js.points || !js.exp) return null;
      if (Date.now() > js.exp) return null;
      return js.points;
    } catch (_) { return null; }
  };

  // Hydrate from persistent caches
  useEffect(() => {
    try {
      const cached1D = loadFromStorage(selectedSymbol, '1D');
      const cached1W = loadFromStorage(selectedSymbol, '1W');
      const cached1M = loadFromStorage(selectedSymbol, '1M');
      if (cached1D && cached1D.length) {
        seriesCacheRef.current['1D'] = cached1D;
        setSeries({ points: cached1D });
        setRange('1D');
      } else if (cached1W && cached1W.length) {
        seriesCacheRef.current['1W'] = cached1W;
        setSeries({ points: cached1W });
        setRange('1W');
      } else if (cached1M && cached1M.length) {
        seriesCacheRef.current['1M'] = cached1M;
        setSeries({ points: cached1M });
        setRange('1M');
      }
    } catch (_) {}
  }, [selectedSymbol]);

  // Restore last predictions UI state
  useEffect(() => {
    try {
      const last = loadLastPredictions(selectedSymbol);
      if (last && last.predictions) {
        // Removed setLastUpdated call to fix ESLint warning
      }
    } catch (_) {}
  }, [selectedSymbol]);

  // Restore last selected symbol and predicted models
  useEffect(() => {
    try {
      const lastSym = localStorage.getItem('sh:lastSymbol');
      if (lastSym && /^[A-Z]{1,5}$/.test(lastSym)) {
        setSelectedSymbol(lastSym);
      }
      const pred = localStorage.getItem('sh:lastPredModelData');
      if (pred) {
        const js = JSON.parse(pred);
        if (js && js.symbol && js.models) {
          setPredictionsData({ models: js.models, historicalData: [] });
        }
      }
    } catch (_) {}
  }, []);

  const saveToStorage = (sym, r, points, marketState = null) => {
    try {
      let ttlMs;
      if (r === '1D') {
        ttlMs = (marketState === 'open') ? 1*60*1000 : 12*60*60*1000;
      } else {
        ttlMs = (['1W','1M','3M'].includes(r) ? 30*60*1000 : 12*60*60*1000);
      }
      const payload = { points, exp: Date.now() + ttlMs };
      localStorage.setItem(`sh:ts:${sym}:${r}`, JSON.stringify(payload));
    } catch (_) {}
  };

  // Simulate loading progress
  const simulateProgress = (modelIds) => {
    const initialProgress = {};
    modelIds.forEach(id => {
      initialProgress[id] = 0;
    });
    setLoadingProgress(initialProgress);
    
    const modelTimes = {
      1: 3, 2: 2, 3: 2.5, 4: 1.8, 5: 1.5
    };
    
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const updated = { ...prev };
        let allComplete = true;
        let totalProgress = 0;
        
        modelIds.forEach(id => {
          if (updated[id] < 100) {
            const increment = 100 / (modelTimes[id] * 10);
            updated[id] = Math.min(updated[id] + increment, 100);
            
            if (updated[id] < 100) {
              allComplete = false;
            }
          }
          totalProgress += updated[id];
        });
        
        setOverallProgress(totalProgress / modelIds.length);
        
        if (allComplete) {
          clearInterval(interval);
        }
        
        return updated;
      });
    }, 100);
    
    return interval;
  };

  const fetchPredictions = async () => {
    if (!selectedSymbol) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const modelIds = [1, 2, 3, 4, 5];
      const progressInterval = simulateProgress(modelIds);
      
      const data = await getPredictions(selectedSymbol);
      setPredictionsData(data);
      
      try { 
        localStorage.setItem('sh:lastPredModelData', JSON.stringify({ 
          symbol: selectedSymbol, 
          at: Date.now(), 
          models: data.models 
        })); 
      } catch (_) {}
      
      setSeries(prev => {
        if (prev && prev.points && prev.points.length >= 2) return prev;
        const cached = seriesCacheRef.current[range] || seriesCacheRef.current['1D'] || [];
        return { points: cached };
      });
      
      setLoadingProgress(prev => {
        const complete = {};
        modelIds.forEach(id => {
          complete[id] = 100;
        });
        return complete;
      });
      setOverallProgress(100);
      
      setTimeout(() => {
        clearInterval(progressInterval);
        setLoading(false);
      }, 500);
      
    } catch (err) {
      setError('Failed to fetch predictions. Please try again.');
      console.error('Error:', err);
      setLoading(false);
    }
  };

  // API status monitoring removed to fix ESLint warnings

  // Load intraday + overview + default 1D series
  useEffect(() => {
    let mounted = true;
    setDataLoading(true);
    const load = async () => {
      let intrResp = null;
      try {
        const intr = await getIntraday(selectedSymbol);
        if (!mounted) return;
        setIntraday(intr);
        intrResp = intr;
      } catch (_) {}
      try {
        const ov = await getOverview(selectedSymbol);
        if (!mounted) return;
        setOverview(ov);
      } catch (_) {}

      let pts = [];
      try {
        const p = (intrResp && intrResp.points) ? intrResp.points : [];
        pts = (p || []).map(pt => {
          const dtStr = pt.date ? pt.date : (pt.time ? pt.time : new Date().toISOString());
          return { xTs: new Date(dtStr).getTime(), price: pt.price };
        });
      } catch (_) { pts = []; }

      if (!pts || pts.length < 2) {
        try {
          const ts = await getTimeSeries(selectedSymbol, '1D');
          if (!mounted) return;
          pts = (ts.points || []).map(p => {
            if (p.date) {
              const dt = new Date(p.date);
              return { xTs: dt.getTime(), price: p.price };
            }
            const hhmm = (p.time ?? '').split(':');
            const d = new Date();
            if (hhmm.length >= 2) { d.setHours(parseInt(hhmm[0],10), parseInt(hhmm[1],10), 0, 0); }
            return { xTs: d.getTime(), price: p.price };
          });
        } catch (_) { pts = []; }
      }

      try {
        if (intrResp && intrResp.asOf) {
          const asOfIso = intrResp.asOf;
          const asOfTs = new Date(asOfIso).getTime();
          const dateMatch = typeof asOfIso === 'string' ? asOfIso.match(/^(\d{4}-\d{2}-\d{2})T/) : null;
          const off = typeof asOfIso === 'string' ? asOfIso.slice(-6) : null;
          let openTs = null;
          if (dateMatch && off) {
            const day = dateMatch[1];
            const openIso = `${day}T09:30:00${off}`;
            openTs = new Date(openIso).getTime();
          }
          let filtered = (pts || []).filter(p => typeof p.xTs === 'number' && (openTs ? p.xTs >= openTs : true) && p.xTs <= asOfTs);
          if (filtered.length >= 2) {
            pts = filtered;
          }
        }
      } catch (_) {}

      seriesCacheRef.current['1D'] = pts || [];
      try { saveToStorage(selectedSymbol, '1D', pts || [], intrResp?.market); } catch (_) {}
      
      try {
        const lp = pts && pts.length ? pts[pts.length - 1] : null;
        if (lp && typeof lp.xTs === 'number') {
          const d = new Date(lp.xTs);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          setLastFullDate(`${y}-${m}-${da}`);
        }
      } catch (_) {}
      
      setSeries({ points: pts || [] });
      
      if (mounted) {
        setDataLoading(false);
      }
      
      ['1W','1M','3M'].forEach(async (r) => {
        try {
          const bg = await getTimeSeries(selectedSymbol, r);
          const ptsArr = (bg.points || []).map((p) => {
            const dtStr = p && p.date ? p.date : (p && p.time ? p.time : new Date().toISOString());
            const xTs = new Date(dtStr).getTime();
            const priceNum = p && typeof p.price === 'number' ? p.price : Number(p.price);
            return { xTs, price: priceNum };
          });
          const clamped = (lastFullDate && ptsArr && ptsArr.length)
            ? ptsArr.filter(pt => {
                try {
                  const d = new Date(pt.xTs);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const da = String(d.getDate()).padStart(2, '0');
                  const dayStr = `${y}-${m}-${da}`;
                  return dayStr <= lastFullDate;
                } catch (_) { return true; }
              })
            : ptsArr;
          seriesCacheRef.current[r] = clamped;
          saveToStorage(selectedSymbol, r, clamped);
        } catch (_) {}
      });
    };
    load();
    return () => { mounted = false; };
  }, [selectedSymbol, lastFullDate]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    if (/^[A-Z]{1,5}$/.test(e.target.value.toUpperCase())) {
      const sym = e.target.value.toUpperCase();
      setSelectedSymbol(sym);
      try { localStorage.setItem('sh:lastSymbol', sym); } catch (_) {}
    }
  };

  const handleModelClick = (modelId) => {
    if (selectedSymbol) {
      navigate(`/stock/${selectedSymbol}?model=${modelId}`);
    }
  };

  const formatPct = (n) => {
    if (n == null || isNaN(n)) return '—';
    const v = Number(n);
    const sign = v >= 0 ? '+' : '';
    return `${sign}${Math.abs(v).toFixed(2)}%`;
  };

  const getModelPredColumns = (modelId) => {
    if (!predictionsData || !predictionsData.models[modelId]) return null;
    const model = predictionsData.models[modelId];
    const oneDay = model.predictions_1d || predictionsData?.multiTimeframe?.oneDay || null;
    const twoDay = model.predictions_2d || predictionsData?.multiTimeframe?.twoDay || null;
    const oneWeek = model.predictions_1w || predictionsData?.multiTimeframe?.oneWeek || null;
    return {
      d1: oneDay ? Number(oneDay.change_percent) : null,
      d2: twoDay ? Number(twoDay.change_percent) : null,
      w1: oneWeek ? Number(oneWeek.change_percent) : null,
      accuracy: `${Number(model.accuracy ?? 0).toFixed(2)}%`
    };
  };

  return (
    <PageContainer>
      <MainContent>
        <Header>
          <Title>Predict</Title>
          <Subtitle>
            Advanced machine learning models for stock price prediction
          </Subtitle>
        </Header>

        {/* Intraday Chart Section */}
        {dataLoading ? (
          <LoadingContainer>
            <LoadingTitle>Loading Market Data</LoadingTitle>
            <ProgressContainer>
              <ProgressBar 
                progress={50}
                label="Fetching intraday data"
                timeRemaining={2}
              />
            </ProgressContainer>
          </LoadingContainer>
        ) : intraday && (
          <IntradayCard>
            <ChartHeader>
              <ChartTitle>Intraday • {selectedSymbol}</ChartTitle>
              <MarketStatus>
                {intraday.market === 'open' ? 'Market open' : 'Market closed'} • as of {new Date(intraday.asOf).toLocaleTimeString()}
              </MarketStatus>
            </ChartHeader>
            
            <DisclaimerText style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              Due to data pricing, charts display data up to the last closed market day.
            </DisclaimerText>
            
            <RangeTabs>
              {['1D','1W','1M','3M','6M','YTD','1Y','2Y'].map(r => (
                <RangeTab 
                  key={r} 
                  active={range === r} 
                  onClick={async () => {
                    setRange(r);
                    if (r === '1D' && intraday && intraday.market === 'open') {
                      // Market is open - always fetch fresh data
                    } else if (r !== '1D') {
                      let cached = seriesCacheRef.current[r];
                      if (!cached || !cached.length) {
                        cached = loadFromStorage(selectedSymbol, r);
                        if (cached && cached.length) {
                          seriesCacheRef.current[r] = cached;
                        }
                      }
                      if (cached && cached.length) {
                        setSeries({ points: cached });
                        return;
                      }
                    } else {
                      let cached = seriesCacheRef.current['1D'];
                      if (!cached || !cached.length) {
                        cached = loadFromStorage(selectedSymbol, '1D');
                        if (cached && cached.length) {
                          seriesCacheRef.current['1D'] = cached;
                        }
                      }
                      if (cached && cached.length) {
                        setSeries({ points: cached });
                        return;
                      }
                    }
                    try {
                      const ts = (r === '1D') ? await getIntraday(selectedSymbol).then(res => ({ points: res.points || [] })) : await getTimeSeries(selectedSymbol, r);
                      let pts = (ts.points || []).map(p => {
                        if (r === '1D') {
                          const dtStr = p.date ? p.date : (p.time ? p.time : new Date().toISOString());
                          return { xTs: new Date(dtStr).getTime(), price: p.price };
                        }
                        const dt = p.date ? new Date(p.date) : (p.time ? new Date(p.time) : new Date());
                        return { xTs: dt.getTime(), price: p.price };
                      });
                      if (r === '1D') {
                        try {
                          if (intraday && intraday.asOf) {
                            const asOfTs = new Date(intraday.asOf).getTime();
                            pts = pts.filter(p => typeof p.xTs === 'number' && p.xTs <= asOfTs);
                          }
                        } catch (_) {}
                      }
                      seriesCacheRef.current[r] = pts;
                      saveToStorage(selectedSymbol, r, pts, intraday?.market);
                      setSeries({ points: pts });
                    } catch (_) {}
                  }}
                >
                  {r}
                </RangeTab>
              ))}
            </RangeTabs>
            
            <ChartContainer>
              {series && series.points && series.points.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%" key={range}>
                  <AreaChart data={series.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.bullGreen} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={colors.bullGreen} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                    <XAxis 
                      dataKey="xTs" 
                      type="number" 
                      scale="time" 
                      allowDataOverflow={false} 
                      domain={[series.points[0]?.xTs || 'dataMin', series.points[series.points.length - 1]?.xTs || 'dataMax']} 
                      tick={{ fill: colors.textTertiary, fontSize: 12 }} 
                      axisLine={false} 
                      tickLine={false} 
                      minTickGap={30} 
                      padding={{ left: 0, right: 0 }} 
                      interval="preserveStartEnd"
                      tickFormatter={(ts) => {
                        const d = new Date(ts);
                        if (range === '1D') {
                          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                        if (['YTD','1Y','2Y'].includes(range)) {
                          return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
                        }
                        return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
                      }}
                    />
                    <YAxis dataKey="price" tick={{ fill: colors.textTertiary, fontSize: 12 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                    <Tooltip 
                      contentStyle={{ background: colors.cardBackground, border: `1px solid ${colors.border}`, color: colors.textPrimary }} 
                      labelStyle={{ color: colors.textSecondary }}
                      labelFormatter={(ts) => {
                        const d = new Date(ts);
                        if (range === '1D') {
                          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                        if (['YTD','1Y','2Y'].includes(range)) {
                          return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
                        }
                        return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
                      }}
                    />
                    <Area type="monotone" dataKey="price" stroke={colors.bullGreen} fill="url(#grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: colors.textTertiary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  No intraday data available for the latest session.
                </div>
              )}
            </ChartContainer>
            
            {overview && (
              <StatsGrid>
                <StatCard>
                  <StatLabel>Open</StatLabel>
                  <StatValue>{overview.open ? `$${overview.open.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>High</StatLabel>
                  <StatValue>{overview.high ? `$${overview.high.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>Low</StatLabel>
                  <StatValue>{overview.low ? `$${overview.low.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>Prev Close</StatLabel>
                  <StatValue>{overview.prevClose ? `$${overview.prevClose.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>52W High</StatLabel>
                  <StatValue>{overview.fiftyTwoWeekHigh ? `$${overview.fiftyTwoWeekHigh.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>52W Low</StatLabel>
                  <StatValue>{overview.fiftyTwoWeekLow ? `$${overview.fiftyTwoWeekLow.toFixed(2)}` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>Market Cap</StatLabel>
                  <StatValue>{overview.marketCap ? `${(overview.marketCap/1e9).toFixed(1)}B` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>P/E</StatLabel>
                  <StatValue>{overview.pe ? overview.pe.toFixed(2) : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>EPS</StatLabel>
                  <StatValue>{overview.eps ? overview.eps.toFixed(2) : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>Yield</StatLabel>
                  <StatValue>{overview.dividendYield ? `${(overview.dividendYield*100).toFixed(2)}%` : '—'}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>Beta</StatLabel>
                  <StatValue>{overview.beta ? overview.beta.toFixed(2) : '—'}</StatValue>
                </StatCard>
              </StatsGrid>
            )}
          </IntradayCard>
        )}

        <SearchSection>
          <SearchInput
            type="text"
            placeholder="Enter stock symbol (e.g., AAPL, MSFT, GOOGL)"
            value={searchTerm}
            onChange={handleSearch}
            onKeyDown={(e) => { if (e.key === 'Enter') { fetchPredictions(); } }}
          />
          
          <StockSelector>
            <StockSelectorTitle>Selected Symbol: {selectedSymbol}</StockSelectorTitle>
            <PredictButton
              onClick={fetchPredictions}
              disabled={loading}
            >
              {loading ? 'Getting Predictions…' : 'Get Predictions'}
            </PredictButton>
          </StockSelector>
        </SearchSection>

        <DisclaimerText>
          Due to data pricing, the model pipeline and auto-trainer have been scaled down.
        </DisclaimerText>

        {loading && (
          <LoadingContainer>
            <LoadingTitle>Generating Predictions ({Math.round(overallProgress)}% Complete)</LoadingTitle>
            <ProgressContainer>
              <ProgressBar 
                progress={overallProgress}
                label="Overall Progress"
              />
              {models.map(model => (
                <ProgressBar 
                  key={model.id}
                  progress={loadingProgress[model.id] || 0}
                  label={model.name}
                  timeRemaining={Math.ceil((100 - (loadingProgress[model.id] || 0)) / 33)}
                />
              ))}
            </ProgressContainer>
          </LoadingContainer>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Models Section */}
        {predictionsData && (
          <ModelsList style={{ position: 'relative' }}>
            {loading && <LoadingOverlay>Loading predictions...</LoadingOverlay>}
            {models.map(model => {
              const cols = getModelPredColumns(model.id);
              return (
                <ModelCard key={model.id} onClick={() => handleModelClick(model.id)}>
                  <ModelInfo>
                    <ModelName>{model.name}</ModelName>
                    <ModelDescription>{model.description}</ModelDescription>
                  </ModelInfo>
                  <ModelMetrics>
                    {cols ? (
                      <PredGrid>
                        <PredCol>
                          <PredLabel>1D</PredLabel>
                          <PredValue value={cols.d1 ?? 0}>{formatPct(cols.d1)}</PredValue>
                        </PredCol>
                        <PredCol>
                          <PredLabel>2D</PredLabel>
                          <PredValue value={cols.d2 ?? 0}>{formatPct(cols.d2)}</PredValue>
                        </PredCol>
                        <PredCol>
                          <PredLabel>1W</PredLabel>
                          <PredValue value={cols.w1 ?? 0}>{formatPct(cols.w1)}</PredValue>
                        </PredCol>
                      </PredGrid>
                    ) : (
                      <div style={{ color: colors.textTertiary }}>Loading...</div>
                    )}
                    <Accuracy>{cols ? cols.accuracy : '...'}</Accuracy>
                  </ModelMetrics>
                </ModelCard>
              );
            })}
          </ModelsList>
        )}
      </MainContent>
    </PageContainer>
  );
};

export default PredictPage;
