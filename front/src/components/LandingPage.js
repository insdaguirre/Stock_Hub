// src/components/LandingPage.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChartLine } from 'react-icons/fa';
import TickerCard from './TickerCard';
import NewsCard from './NewsCard';
import { getNews } from '../services/api';
import { TickerDataProvider, useTickerData } from '../contexts/TickerDataContext';
import colors from '../styles/colors';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.gradientDark};
  color: ${colors.textPrimary};
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
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
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 3px;
    background: ${colors.bullGreen};
    border-radius: 2px;
  }
`;



const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0 0 1.5rem 0;
  text-align: center;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: ${colors.bullGreen};
    border-radius: 2px;
  }
`;

const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
`;

const ErrorMessage = styled.div`
  background: ${colors.cardBackground};
  border: 1px solid ${colors.bearRed};
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: ${colors.bearRed};
  margin: 2rem 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: ${colors.textSecondary};
  font-size: 16px;
`;

const CTA = styled.div`
  text-align: center;
  margin-top: 3rem;
`;

const CTAText = styled.p`
  font-size: 18px;
  color: ${colors.textSecondary};
  margin: 0 0 1.5rem 0;
`;

const CTALink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${colors.bullGreen};
  color: ${colors.darkBackground};
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  border: 1px solid ${colors.bullGreen};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${colors.shadowMedium};
    background: ${colors.success};
  }
`;

const CTASection = styled.div`
  text-align: center;
  margin: 2rem 0 3rem 0;
  padding: 2rem;
  background: ${colors.cardBackground};
  border-radius: 16px;
  border: 1px solid ${colors.border};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const CTATitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin: 0 0 1rem 0;
`;

const CTADescription = styled.p`
  font-size: 16px;
  color: ${colors.textSecondary};
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const CTAButton = styled.button`
  background: ${colors.gradientGreen};
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 200, 83, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 200, 83, 0.4);
  }
`;

const CacheInfo = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${colors.textTertiary};
  margin-bottom: 1rem;
  padding: 8px;
  background: ${colors.cardBackground};
  border-radius: 8px;
  border: 1px solid ${colors.border};
`;

const MarketOverview = () => {
  const { tickerData, loading, cacheInfo, fetchTickerData } = useTickerData();
  const [tickers] = useState([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'AMD', 'INTC', 'ORCL', 'CRM'
  ]);
  const [errors, setErrors] = useState({});

  const handleTickerError = (symbol, error) => {
    setErrors(prev => ({ ...prev, [symbol]: error }));
  };

  useEffect(() => {
    const loadTickerData = async () => {
      try {
        await fetchTickerData(tickers);
      } catch (err) {
        console.error('Error loading ticker data:', err);
      }
    };

    loadTickerData();
  }, [tickers, fetchTickerData]);

  const errorCount = Object.keys(errors).length;
  const hasErrors = errorCount > 0;

  return (
    <>
      <SectionTitle>Market Overview</SectionTitle>

      {loading ? (
        <LoadingContainer>
          Loading market data...
        </LoadingContainer>
      ) : (
        <>
          {hasErrors && (
            <ErrorMessage>
              {errorCount} stock{errorCount > 1 ? 's' : ''} failed to load. 
              Some data may be unavailable due to API limitations.
            </ErrorMessage>
          )}
          
          {cacheInfo && (
            <CacheInfo>
              {cacheInfo.marketHours ? 'Market Open' : 'Market Closed'} • 
              Cache expires in {Math.round(cacheInfo.cacheTTL / 60)} minutes
            </CacheInfo>
          )}
          
          <TickerGrid>
            {tickers.map((symbol) => (
              <TickerCard
                key={symbol}
                symbol={symbol}
                onError={handleTickerError}
                tickerData={tickerData[symbol]}
              />
            ))}
          </TickerGrid>
        </>
      )}
    </>
  );
};

const LandingPage = () => {
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Fetch news articles
  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('Fetching news articles...');
        setNewsLoading(true);
        const articles = await getNews(3);
        console.log('News articles received:', articles);
        setNews(articles);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
    
    // Refresh news every hour
    const interval = setInterval(fetchNews, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <TickerDataProvider>
      <PageContainer>
        <MainContent>
          <Header>
            <Title>StockHub</Title>
          </Header>

          <CTASection>
            <CTATitle>Unlock Advanced Stock Predictions</CTATitle>
            <CTADescription>
              Create a free account to access our AI-powered stock prediction models, 
              personalized insights, and advanced market analysis tools.
            </CTADescription>
            <CTAButton onClick={() => window.location.href = '#/register'}>
              Get Started Free
            </CTAButton>
          </CTASection>

          <SectionTitle>Latest Financial News</SectionTitle>
          
          {newsLoading ? (
            <LoadingContainer>
              Loading latest news...
            </LoadingContainer>
          ) : (
            <NewsGrid>
              {news.map((article, index) => (
                <NewsCard key={article.id || index} article={article} />
              ))}
            </NewsGrid>
          )}

          <MarketOverview />

          <CTA>
            <CTALink href="#/predict">
              <FaChartLine />
              Start Predicting
            </CTALink>
          </CTA>
        </MainContent>
      </PageContainer>
    </TickerDataProvider>
  );
};

export default LandingPage;
