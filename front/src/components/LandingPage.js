// src/components/LandingPage.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChartLine, FaArrowUp, FaDollarSign } from 'react-icons/fa';
import TickerCard from './TickerCard';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
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
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: #b0b0b0;
  margin: 0 0 2rem 0;
  font-weight: 300;
  line-height: 1.5;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: #00d4aa;
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.1);
  }
`;

const StatIcon = styled.div`
  color: #00d4aa;
  font-size: 24px;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #b0b0b0;
  font-weight: 500;
`;

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
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
    background: linear-gradient(90deg, #00d4aa, #00a8cc);
    border-radius: 2px;
  }
`;

const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #2d1b1b 0%, #3d2a2a 100%);
  border: 1px solid #ff6b6b;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  color: #ff6b6b;
  margin: 2rem 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #b0b0b0;
  font-size: 16px;
`;

const CTA = styled.div`
  text-align: center;
  margin-top: 3rem;
`;

const CTAText = styled.p`
  font-size: 18px;
  color: #b0b0b0;
  margin: 0 0 1.5rem 0;
`;

const CTALink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  color: #000;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
  }
`;

const LandingPage = () => {
  const [tickers] = useState([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'AMD', 'INTC', 'ORCL', 'CRM'
  ]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const handleTickerError = (symbol, error) => {
    setErrors(prev => ({ ...prev, [symbol]: error }));
  };

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const errorCount = Object.keys(errors).length;
  const hasErrors = errorCount > 0;

  return (
    <PageContainer>
      <MainContent>
        <Header>
          <Title>StockHub</Title>
          <Subtitle>
            Professional-grade stock analysis and prediction platform
          </Subtitle>
        </Header>

        <StatsContainer>
          <StatCard>
            <StatIcon><FaChartLine /></StatIcon>
            <StatValue>12</StatValue>
            <StatLabel>Tracked Stocks</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon><FaArrowUp /></StatIcon>
            <StatValue>8</StatValue>
            <StatLabel>ML Models</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon><FaDollarSign /></StatIcon>
            <StatValue>Real-time</StatValue>
            <StatLabel>Market Data</StatLabel>
          </StatCard>
        </StatsContainer>

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
            
            <TickerGrid>
              {tickers.map((symbol) => (
                <TickerCard
                  key={symbol}
                  symbol={symbol}
                  onError={handleTickerError}
                />
              ))}
            </TickerGrid>
          </>
        )}

        <CTA>
          <CTAText>
            Ready to make informed investment decisions?
          </CTAText>
          <CTALink href="/predict">
            <FaChartLine />
            Start Predicting
          </CTALink>
        </CTA>
      </MainContent>
    </PageContainer>
  );
};

export default LandingPage;
