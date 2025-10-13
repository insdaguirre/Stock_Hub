// src/components/TickerCard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';
import { FaArrowUp, FaArrowDown, FaExternalLinkAlt } from 'react-icons/fa';
import { getTickerData } from '../services/api';
import { requestQueue } from '../utils/requestQueue';

const CardContainer = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    border-color: #00d4aa;
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.2);
    
    .external-icon {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00d4aa, #00a8cc);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const TickerSymbol = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.5px;
`;

const ExternalIcon = styled.div`
  color: #666;
  font-size: 12px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
`;

const PriceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const CurrentPrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
`;

const PriceChange = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.positive ? '#00d4aa' : '#ff6b6b'};
`;

const ChangeIcon = styled.div`
  font-size: 12px;
`;

const ChartContainer = styled.div`
  height: 80px;
  margin-bottom: 1rem;
`;

const LoadingContainer = styled.div`
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
`;

const ErrorContainer = styled.div`
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6b6b;
  font-size: 12px;
`;

const TickerCard = ({ symbol, onError }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use request queue to manage concurrent requests
        const response = await requestQueue.add(() => getTickerData(symbol));
        
        if (response && response.series && response.series.points && response.series.points.length >= 2) {
          const points = response.series.points.slice(-5); // Last 5 days
          const chartData = points.map(point => ({
            timestamp: new Date(point.timestamp).getTime(),
            price: parseFloat(point.close)
          }));
          
          setData({
            currentPrice: parseFloat(points[points.length - 1].close),
            previousPrice: parseFloat(points[points.length - 2].close),
            chartData: chartData
          });
        } else {
          throw new Error('Insufficient data points');
        }
      } catch (err) {
        console.error(`Error fetching data for ${symbol}:`, err);
        setError(err.message);
        if (onError) onError(symbol, err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, onError]);

  const handleClick = () => {
    navigate(`/stock/${symbol}`);
  };

  const priceChange = data ? data.currentPrice - data.previousPrice : 0;
  const priceChangePercent = data ? ((priceChange / data.previousPrice) * 100) : 0;
  const isPositive = priceChange >= 0;

  return (
    <CardContainer onClick={handleClick}>
      <CardHeader>
        <TickerSymbol>{symbol}</TickerSymbol>
        <ExternalIcon className="external-icon">
          <FaExternalLinkAlt />
        </ExternalIcon>
      </CardHeader>
      
      <PriceSection>
        {data && (
          <>
            <CurrentPrice>${data.currentPrice.toFixed(2)}</CurrentPrice>
            <PriceChange positive={isPositive}>
              <ChangeIcon>
                {isPositive ? <FaArrowUp /> : <FaArrowDown />}
              </ChangeIcon>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
            </PriceChange>
          </>
        )}
      </PriceSection>
      
      <ChartContainer>
        {loading && (
          <LoadingContainer>Loading chart...</LoadingContainer>
        )}
        
        {error && (
          <ErrorContainer>Chart unavailable</ErrorContainer>
        )}
        
        {data && data.chartData && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData}>
              <XAxis 
                dataKey="timestamp" 
                hide 
                type="number" 
                scale="time" 
                domain={['dataMin', 'dataMax']}
              />
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? '#00d4aa' : '#ff6b6b'}
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </CardContainer>
  );
};

export default TickerCard;
