// src/contexts/TickerDataContext.js
import React, { createContext, useContext, useState } from 'react';
import { getTickersBatch } from '../services/api';

const TickerDataContext = createContext();

export const useTickerData = () => {
  const context = useContext(TickerDataContext);
  if (!context) {
    throw new Error('useTickerData must be used within a TickerDataProvider');
  }
  return context;
};

export const TickerDataProvider = ({ children }) => {
  const [tickerData, setTickerData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const isCacheValid = () => {
    if (!lastFetch) return false;
    const now = new Date().getTime();
    return (now - lastFetch) < CACHE_DURATION;
  };

  const fetchTickerData = async (symbols, forceRefresh = false) => {
    // Check if we have valid cached data
    if (!forceRefresh && isCacheValid() && Object.keys(tickerData).length > 0) {
      console.log('Using cached ticker data');
      return tickerData;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching fresh ticker data for ${symbols.length} symbols...`);
      const data = await getTickersBatch(symbols);
      
      // Process the batch response
      const processedData = {};
      const errors = {};

      // Process successful tickers
      Object.entries(data.tickers).forEach(([symbol, tickerInfo]) => {
        if (tickerInfo && tickerInfo.points && tickerInfo.points.length >= 2) {
          const points = tickerInfo.points;
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
          
          processedData[symbol] = {
            currentPrice: parseFloat(tickerInfo.current_price),
            previousPrice: parseFloat(tickerInfo.previous_price),
            chartData: chartData,
            minPrice: minPrice,
            maxPrice: maxPrice,
            dateLabels: dateLabels,
            computedAt: tickerInfo.computed_at
          };
        } else {
          errors[symbol] = 'Insufficient data points';
        }
      });

      // Add errors from the API response
      Object.entries(data.errors).forEach(([symbol, errorMsg]) => {
        errors[symbol] = errorMsg;
      });

      setTickerData(processedData);
      setLastFetch(new Date().getTime());
      setCacheInfo({
        marketHours: data.market_hours,
        cacheTTL: data.cache_ttl_seconds,
        cachedAt: data.cached_at
      });

      console.log(`Ticker data updated:`, {
        successCount: Object.keys(processedData).length,
        errorCount: Object.keys(errors).length,
        marketHours: data.market_hours
      });

      return { data: processedData, errors };
    } catch (err) {
      console.error('Error fetching ticker data:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTickerData = (symbol) => {
    return tickerData[symbol] || null;
  };

  const clearCache = () => {
    setTickerData({});
    setLastFetch(null);
    setCacheInfo(null);
  };

  const value = {
    tickerData,
    loading,
    error,
    cacheInfo,
    fetchTickerData,
    getTickerData,
    clearCache,
    isCacheValid: isCacheValid()
  };

  return (
    <TickerDataContext.Provider value={value}>
      {children}
    </TickerDataContext.Provider>
  );
};

export default TickerDataContext;
