// src/components/TickerCard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';
import { FaArrowUp, FaArrowDown, FaExternalLinkAlt } from 'react-icons/fa';
import { getTickerData } from '../services/api';
import { requestQueue } from '../utils/requestQueue';
import colors, { getPerformanceColor } from '../styles/colors';

const CardContainer = styled.div`
  background: ${colors.gradientCardEnhanced};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: ${colors.shadowCard};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.positive ? colors.gradientSuccess : colors.gradientDanger};
  }
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${props => props.positive ? colors.bullGreen : colors.bearRed};
    box-shadow: ${colors.shadowHover};
    
    .external-icon {
      opacity: 1;
      transform: translateX(0);
    }
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
  color: ${colors.textPrimary};
  margin: 0;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const ExternalIcon = styled.div`
  color: ${colors.textTertiary};
  font-size: 12px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease;
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
  color: ${colors.textPrimary};
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const PriceChange = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.positive ? colors.bullGreen : colors.bearRed};
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const ChangeIcon = styled.div`
  font-size: 12px;
`;

const ChartSection = styled.div`
  margin-bottom: 1rem;
`;

const TimeframeLabel = styled.div`
  font-size: 10px;
  color: #888;
  margin-bottom: 0.5rem;
  text-align: center;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const ChartContainer = styled.div`
  height: 60px;
  position: relative;
  background: ${colors.surfaceBackground};
  border-radius: 4px;
  padding: 4px;
  border: 1px solid ${colors.borderLight};
`;

const LoadingContainer = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textTertiary};
  font-size: 10px;
`;

const ErrorContainer = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.bearRed};
  font-size: 10px;
`;

const AxisContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
  font-size: 8px;
  color: ${colors.textTertiary};
`;

const YAxisContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 60px;
  min-width: 40px;
`;

const YAxisLabel = styled.div`
  font-size: 8px;
  color: ${colors.textTertiary};
  text-align: right;
  line-height: 1;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const XAxisContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-left: 8px;
`;

const XAxisLabel = styled.div`
  font-size: 8px;
  color: ${colors.textTertiary};
  text-align: center;
  flex: 1;
  line-height: 1;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
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
          console.log(`Processing ${symbol}:`, points.length, 'points');
          
          const prices = points.map(point => parseFloat(point.close));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          const chartData = points.map((point, index) => ({
            timestamp: new Date(point.timestamp).getTime(),
            price: parseFloat(point.close),
            date: new Date(point.timestamp)
          }));
          
          // Format dates for X-axis
          const dateLabels = points.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          });
          
          console.log(`${symbol} data:`, { minPrice, maxPrice, dateLabels });
          
          setData({
            currentPrice: parseFloat(points[points.length - 1].close),
            previousPrice: parseFloat(points[points.length - 2].close),
            chartData: chartData,
            minPrice: minPrice,
            maxPrice: maxPrice,
            dateLabels: dateLabels
          });
        } else {
          console.error(`${symbol}: Insufficient data points`, response);
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
    <CardContainer onClick={handleClick} positive={isPositive}>
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
      
      <ChartSection>
        <TimeframeLabel>Last 5 Days</TimeframeLabel>
        
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
                <YAxis hide domain={[data.minPrice * 0.999, data.maxPrice * 1.001]} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={getPerformanceColor(priceChange)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
        
        {data && data.chartData && data.minPrice && data.maxPrice && data.dateLabels && (
          <AxisContainer>
            <YAxisContainer>
              <YAxisLabel>${data.maxPrice.toFixed(2)}</YAxisLabel>
              <YAxisLabel>${data.minPrice.toFixed(2)}</YAxisLabel>
            </YAxisContainer>
            <XAxisContainer>
              {data.dateLabels.map((label, index) => (
                <XAxisLabel key={index}>{label}</XAxisLabel>
              ))}
            </XAxisContainer>
          </AxisContainer>
        )}
      </ChartSection>
    </CardContainer>
  );
};

export default TickerCard;
