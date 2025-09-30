// src/components/HomePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getPredictions, BASE_URL, getApiStatus, getNews } from '../services/api';
import ProgressBar from './ProgressBar';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #000000;
  color: #FFFFFF;
  min-height: 100vh;
`;

const Header = styled.div`
  padding: 10px 0;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: #FFFFFF;
`;

const DateText = styled.h2`
  font-size: 20px;
  color: #666;
  margin: 5px 0 15px 0;
  font-weight: normal;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 2px 8px 2px;
`;

const SectionTitle = styled.div`
  font-size: 16px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: #9A9AA0;
`;

const RefreshButton = styled.button`
  background: transparent;
  color: #9A9AA0;
  border: 1px solid #2C2C2E;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  &:hover { background-color: #1C1C1E; }
`;

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 8px;
  margin-bottom: 22px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const NewsCard = styled.a`
  display: flex;
  background: #111113;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease;
  cursor: pointer;
  border: 1px solid #1F1F20;
  &:hover { transform: translateY(-2px); background-color: #18181A; box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
  &:focus-visible { outline: 2px solid #0A84FF; outline-offset: 2px; }
`;

const NewsImage = styled.img`
  width: 38%;
  height: 110px;
  object-fit: cover;
  background-color: #0a0a0a;
`;

const NewsBody = styled.div`
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const NewsTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SourceChip = styled.span`
  font-size: 11px;
  color: #C7C7CC;
  background: #1F1F20;
  border: 1px solid #2A2A2C;
  padding: 2px 8px;
  border-radius: 999px;
`;

const TimeText = styled.span`
  font-size: 12px;
  color: #8e8e93;
`;

const Skeleton = styled.div`
  display: flex;
  background: #111113;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1F1F20;
  animation: pulse 1.2s ease-in-out infinite;
  @keyframes pulse { 0%{opacity:.7} 50%{opacity:1} 100%{opacity:.7} }
`;

const SkeletonLeft = styled.div`
  width: 38%;
  height: 110px;
  background: #1C1C1E;
`;

const SkeletonRight = styled.div`
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SkeletonBar = styled.div`
  height: 12px;
  background: #1C1C1E;
  border-radius: 6px;
  width: ${props => props.w || 100}%;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background-color: #1C1C1E;
  font-size: 16px;
  outline: none;
  color: #FFFFFF;
  margin-bottom: 10px;

  &::placeholder {
    color: #666;
  }
`;

const StockSelector = styled.div`
  background-color: #1C1C1E;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const StockSelectorTitle = styled.div`
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
`;

const ModelsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: #1C1C1E;
  border-radius: 10px;
  overflow: hidden;
`;

const ModelCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #000000;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #2C2C2E;
  }
`;

const ModelInfo = styled.div`
  flex: 1;
`;

const ModelName = styled.div`
  font-size: 16px;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const ModelDescription = styled.div`
  font-size: 14px;
  color: #666;
`;

const ModelMetrics = styled.div`
  text-align: right;
`;

const Prediction = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.value >= 0 ? '#34C759' : '#FF3B30'};
  margin-bottom: 4px;
`;

const Accuracy = styled.div`
  font-size: 14px;
  color: #666;
`;

const MiniChart = styled.div`
  width: 60px;
  height: 30px;
  margin: 0 15px;
  opacity: 0.7;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  color: #FF3B30;
  padding: 16px;
  background-color: #1C1C1E;
  border-radius: 10px;
  margin-bottom: 20px;
`;

// Add new styled components for the progress section
const LoadingContainer = styled.div`
  background-color: #1C1C1E;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const LoadingTitle = styled.h3`
  font-size: 18px;
  color: #FFFFFF;
  margin: 0 0 15px 0;
`;

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

// Utility: format ISO datetime to relative time (e.g., "12m ago")
const timeAgo = (isoString) => {
  try {
    const ts = new Date(isoString).getTime();
    if (!ts) return '';
    const diff = Math.max(0, Date.now() - ts);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch (_) {
    return '';
  }
};

// Extended list of 20 models with more variety
const models = [
  {
    id: 1,
    name: 'LSTM Neural Network',
    description: 'Deep Learning',
    accuracy: '89%',
    prediction: '+2.3%'
  },
  {
    id: 2,
    name: 'Random Forest',
    description: 'Ensemble Learning',
    accuracy: '87%',
    prediction: '-1.5%'
  },
  {
    id: 3,
    name: 'Prophet',
    description: 'Time Series',
    accuracy: '85%',
    prediction: '+1.8%'
  },
  {
    id: 4,
    name: 'XGBoost',
    description: 'Gradient Boosting',
    accuracy: '88%',
    prediction: '+0.9%'
  },
  {
    id: 5,
    name: 'ARIMA',
    description: 'Statistical Analysis',
    accuracy: '82%',
    prediction: '-0.7%'
  },
  {
    id: 6,
    name: 'Transformer',
    description: 'Deep Learning',
    accuracy: '90%',
    prediction: '+1.2%'
  },
  {
    id: 7,
    name: 'CNN-LSTM',
    description: 'Hybrid Model',
    accuracy: '86%',
    prediction: '+2.1%'
  },
  {
    id: 8,
    name: 'LightGBM',
    description: 'Gradient Boosting',
    accuracy: '87%',
    prediction: '-0.8%'
  },
  {
    id: 9,
    name: 'VAR',
    description: 'Vector Autoregression',
    accuracy: '81%',
    prediction: '+0.5%'
  },
  {
    id: 10,
    name: 'ESN',
    description: 'Echo State Network',
    accuracy: '84%',
    prediction: '-1.2%'
  },
  {
    id: 11,
    name: 'Wavelet Transform',
    description: 'Signal Processing',
    accuracy: '83%',
    prediction: '+1.6%'
  },
  {
    id: 12,
    name: 'Kalman Filter',
    description: 'State Estimation',
    accuracy: '82%',
    prediction: '+0.7%'
  },
  {
    id: 13,
    name: 'Decision Tree',
    description: 'Tree-based Model',
    accuracy: '80%',
    prediction: '-0.9%'
  },
  {
    id: 14,
    name: 'SVM',
    description: 'Support Vector Machine',
    accuracy: '81%',
    prediction: '+1.1%'
  },
  {
    id: 15,
    name: 'Neural Prophet',
    description: 'Neural Forecasting',
    accuracy: '86%',
    prediction: '+1.9%'
  },
  {
    id: 16,
    name: 'Ensemble Mix',
    description: 'Multi-Model Blend',
    accuracy: '91%',
    prediction: '+1.4%'
  },
  {
    id: 17,
    name: 'GRU',
    description: 'Recurrent Neural Net',
    accuracy: '85%',
    prediction: '-1.1%'
  },
  {
    id: 18,
    name: 'CatBoost',
    description: 'Gradient Boosting',
    accuracy: '88%',
    prediction: '+0.8%'
  },
  {
    id: 19,
    name: 'SARIMA',
    description: 'Seasonal ARIMA',
    accuracy: '83%',
    prediction: '-0.6%'
  },
  {
    id: 20,
    name: 'Temporal Fusion',
    description: 'Transformer-based',
    accuracy: '89%',
    prediction: '+1.7%'
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL'); // Default to Apple
  const [predictionsData, setPredictionsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // New state for tracking loading progress
  const [loadingProgress, setLoadingProgress] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);
  // API status footer state
  const [apiLatencyMs, setApiLatencyMs] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiStatus, setApiStatus] = useState('unknown');
  const [storageStatus, setStorageStatus] = useState('unknown');
  const [articles, setArticles] = useState([]);
  const [newsError, setNewsError] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);

  // Function to simulate loading progress for each model
  const simulateProgress = (modelIds) => {
    // Initialize progress for each model
    const initialProgress = {};
    modelIds.forEach(id => {
      initialProgress[id] = 0;
    });
    setLoadingProgress(initialProgress);
    
    // Simulate different completion times for different models
    const modelTimes = {
      1: 3,  // LSTM takes longest
      2: 2,  // Random Forest
      3: 2.5,// Prophet
      4: 1.8,// XGBoost
      5: 1.5 // ARIMA is fastest
    };
    
    // Update progress every 100ms
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const updated = { ...prev };
        let allComplete = true;
        let totalProgress = 0;
        
        modelIds.forEach(id => {
          if (updated[id] < 100) {
            // Increase progress based on model complexity
            const increment = 100 / (modelTimes[id] * 10); // 10 updates per second
            updated[id] = Math.min(updated[id] + increment, 100);
            
            if (updated[id] < 100) {
              allComplete = false;
            }
          }
          totalProgress += updated[id];
        });
        
        // Calculate overall progress
        setOverallProgress(totalProgress / modelIds.length);
        
        // If all models are done, clear the interval
        if (allComplete) {
          clearInterval(interval);
        }
        
        return updated;
      });
    }, 100);
    
    // Store the interval ID to clear it if component unmounts
    return interval;
  };

  const fetchPredictions = async () => {
    if (!selectedSymbol) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the model IDs we need to load (1-5)
      const modelIds = [1, 2, 3, 4, 5];
      
      // Start the progress simulation
      const progressInterval = simulateProgress(modelIds);
      
      // Fetch actual predictions
      const t0 = performance.now();
      const data = await getPredictions(selectedSymbol);
      const t1 = performance.now();
      setApiLatencyMs(Math.max(1, Math.round(t1 - t0)));
      setLastUpdated(new Date());
      setPredictionsData(data);
      
      // Ensure we show 100% progress before stopping
      setLoadingProgress(prev => {
        const complete = {};
        modelIds.forEach(id => {
          complete[id] = 100;
        });
        return complete;
      });
      setOverallProgress(100);
      
      // Clear the interval after a short delay to ensure UI shows 100%
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

  // Periodically ping API status
  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      const status = await getApiStatus();
      if (!mounted) return;
      setStorageStatus(status.storage);
      const overall = status.redis === 'ok' && status.queue === 'ok' && status.storage === 'ok' ? 'ok' : (status.redis === 'err' || status.queue === 'err') ? 'err' : 'degraded';
      setApiStatus(overall);
    };
    ping();
    const id = setInterval(ping, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // If it looks like a valid stock symbol, update selectedSymbol
    if (/^[A-Z]{1,5}$/.test(e.target.value.toUpperCase())) {
      setSelectedSymbol(e.target.value.toUpperCase());
    }
  };

  const handleModelClick = (modelId) => {
    if (selectedSymbol) {
      navigate(`/stock/${selectedSymbol}?model=${modelId}`);
    }
  };

  const getModelPrediction = (modelId) => {
    if (!predictionsData || !predictionsData.models[modelId]) return null;
    
    const model = predictionsData.models[modelId];
    const predictionValue = ((model.prediction / predictionsData.historicalData[predictionsData.historicalData.length - 1].price) - 1) * 100;
    return {
      prediction: `${predictionValue >= 0 ? '+' : ''}${predictionValue.toFixed(2)}%`,
      accuracy: `${model.accuracy}%`,
      value: predictionValue
    };
  };

  // Only show first 5 models that we've implemented
  const implementedModels = models.slice(0, 5);

  // Fetch news on mount and every 12 hours
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setNewsLoading(true);
        const items = await getNews(null, 6);
        if (!mounted) return;
        setArticles(items);
        setNewsError(null);
        setNewsLoading(false);
      } catch (e) {
        if (!mounted) return;
        setNewsError('Failed to load news');
        setNewsLoading(false);
      }
    };
    const computeIntervalMs = () => {
      const now = new Date();
      const hour = now.getHours();
      // Refresh hourly between 6:00–22:00 local time, otherwise every 2 hours
      return (hour >= 6 && hour < 22) ? (60 * 60 * 1000) : (2 * 60 * 60 * 1000);
    };
    load();
    let id = setInterval(load, computeIntervalMs());
    // Re-evaluate cadence at the top of each hour
    const topOfHourMs = (60 - new Date().getMinutes()) * 60 * 1000 - new Date().getSeconds() * 1000 - new Date().getMilliseconds();
    const realign = setTimeout(() => {
      clearInterval(id);
      id = setInterval(load, computeIntervalMs());
    }, Math.max(5_000, topOfHourMs));
    return () => { mounted = false; clearInterval(id); clearTimeout(realign); };
  }, []);

  return (
    <Container>
      <Header>
        <Title>Stock Hub</Title>
        <DateText>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</DateText>
      </Header>

      {/* News Section */}
      <SectionHeader>
        <SectionTitle>Top Stories</SectionTitle>
        <RefreshButton onClick={() => {
          setNewsLoading(true);
          getNews(null, 6).then(items => { setArticles(items); setNewsError(null); setNewsLoading(false); }).catch(() => { setNewsError('Failed to load news'); setNewsLoading(false); });
        }}>Refresh</RefreshButton>
      </SectionHeader>
      {newsError && <ErrorMessage>{newsError}</ErrorMessage>}
      <NewsGrid>
        {newsLoading && (!articles || articles.length === 0) && Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`sk-${i}`}>
            <SkeletonLeft />
            <SkeletonRight>
              <SkeletonBar w={80} />
              <SkeletonBar w={60} />
              <SkeletonBar w={40} />
            </SkeletonRight>
          </Skeleton>
        ))}
        {!newsLoading && articles.slice(0,6).map((a) => (
          <NewsCard key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
            <NewsImage src={a.imageUrl || ''} alt="" loading="lazy" />
            <NewsBody>
              <NewsTitle>{a.title}</NewsTitle>
              <MetaRow>
                <SourceChip>{a.source || 'News'}</SourceChip>
                <TimeText>{timeAgo(a.publishedAt)}</TimeText>
              </MetaRow>
            </NewsBody>
          </NewsCard>
        ))}
      </NewsGrid>
      
      {/* Predict Section */}
      <div style={{ fontSize: 18, fontWeight: 600, margin: '8px 0 8px 2px' }}>Predict</div>
      <SearchInput
        type="text"
        placeholder="Enter stock symbol (e.g., AAPL, MSFT, GOOGL)"
        value={searchTerm}
        onChange={handleSearch}
        onKeyDown={(e) => { if (e.key === 'Enter') { fetchPredictions(); } }}
      />
      
      <StockSelector>
        <StockSelectorTitle>Selected Symbol: {selectedSymbol}</StockSelectorTitle>
        <SearchInput
          type="button"
          value={loading ? 'Getting Predictions…' : 'Get Predictions'}
          onClick={fetchPredictions}
          disabled={loading}
          style={{ 
            backgroundColor: loading ? '#0a5fd1' : '#0A84FF',
            color: 'white',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.9 : 1
          }}
        />
      </StockSelector>

      {loading && (
        <LoadingContainer>
          <LoadingTitle>Generating Predictions ({Math.round(overallProgress)}% Complete)</LoadingTitle>
          <ProgressContainer>
            <ProgressBar 
              progress={overallProgress}
              label="Overall Progress"
            />
            <ProgressBar 
              progress={loadingProgress[1] || 0}
              label="LSTM Neural Network"
              timeRemaining={Math.ceil((100 - (loadingProgress[1] || 0)) / 33)}
            />
            <ProgressBar 
              progress={loadingProgress[2] || 0}
              label="Random Forest"
              timeRemaining={Math.ceil((100 - (loadingProgress[2] || 0)) / 50)}
            />
            <ProgressBar 
              progress={loadingProgress[3] || 0}
              label="Prophet Model"
              timeRemaining={Math.ceil((100 - (loadingProgress[3] || 0)) / 40)}
            />
            <ProgressBar 
              progress={loadingProgress[4] || 0}
              label="XGBoost"
              timeRemaining={Math.ceil((100 - (loadingProgress[4] || 0)) / 55)}
            />
            <ProgressBar 
              progress={loadingProgress[5] || 0}
              label="ARIMA"
              timeRemaining={Math.ceil((100 - (loadingProgress[5] || 0)) / 66)}
            />
          </ProgressContainer>
        </LoadingContainer>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Models only show after user triggers predictions */}
      {predictionsData && (
        <ModelsList style={{ position: 'relative' }}>
          {loading && <LoadingOverlay>Loading predictions...</LoadingOverlay>}
          {implementedModels.map(model => {
            const prediction = getModelPrediction(model.id);
            return (
              <ModelCard key={model.id} onClick={() => handleModelClick(model.id)}>
                <ModelInfo>
                  <ModelName>{model.name}</ModelName>
                  <ModelDescription>{model.description}</ModelDescription>
                </ModelInfo>
                <MiniChart>
                  {/* Mini chart placeholder */}
                </MiniChart>
                <ModelMetrics>
                  <Prediction value={prediction ? parseFloat(prediction.prediction) : 0}>
                    {prediction ? prediction.prediction : 'Loading...'}
                  </Prediction>
                  <Accuracy>{prediction ? prediction.accuracy : '...'}</Accuracy>
                </ModelMetrics>
              </ModelCard>
            );
          })}
        </ModelsList>
      )}

      {/* Footer: About / API status */}
      <div style={{ marginTop: 24, color: '#8e8e93', fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#C7C7CC' }}>API:</span>
          <a href={BASE_URL.replace('/api','/')} target="_blank" rel="noreferrer" style={{ color: '#0A84FF' }}>{BASE_URL}</a>
          {apiLatencyMs != null && (
            <span style={{ background: '#1F1F20', border: '1px solid #2A2A2C', borderRadius: 999, padding: '2px 8px' }}>last {apiLatencyMs} ms</span>
          )}
          {lastUpdated && (
            <span style={{ background: '#1F1F20', border: '1px solid #2A2A2C', borderRadius: 999, padding: '2px 8px' }}>updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <span style={{ background: '#1F1F20', border: '1px solid #2A2A2C', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: 999,
              backgroundColor: apiStatus === 'ok' ? '#34C759' : apiStatus === 'degraded' ? '#FFD60A' : '#FF3B30'
            }} /> {apiStatus}
          </span>
          <span style={{ background: '#1F1F20', border: '1px solid #2A2A2C', borderRadius: 999, padding: '2px 8px' }}>storage {storageStatus}</span>
        </div>
        <div style={{ marginTop: 6, color: '#6b6b70' }}>Stock Hub</div>
      </div>
    </Container>
  );
};

export default HomePage;
