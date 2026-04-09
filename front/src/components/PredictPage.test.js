import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PredictPage from './PredictPage';
import {
  getIntraday,
  getOverview,
  getPredictions,
  getTimeSeries,
  loadLastPredictions,
} from '../services/api';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../services/api', () => ({
  getPredictions: jest.fn(),
  getIntraday: jest.fn(),
  getTimeSeries: jest.fn(),
  getOverview: jest.fn(),
  loadLastPredictions: jest.fn(),
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  AreaChart: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

const intradayResponse = {
  market: 'closed',
  asOf: '2026-04-08T16:00:00-04:00',
  points: [
    { date: '2026-04-08T09:30:00-04:00', price: 100 },
    { date: '2026-04-08T10:30:00-04:00', price: 101 },
  ],
};

const overviewResponse = {
  open: 100,
  high: 102,
  low: 99,
  prevClose: 99.5,
  fiftyTwoWeekHigh: 120,
  fiftyTwoWeekLow: 80,
  marketCap: 1000000000,
  pe: 20,
  eps: 5,
  dividendYield: 0.01,
  beta: 1.1,
};

const predictionsResponse = {
  models: {
    1: { accuracy: 90, predictions_1d: { change_percent: 1 }, predictions_2d: { change_percent: 2 }, predictions_1w: { change_percent: 3 } },
    2: { accuracy: 89, predictions_1d: { change_percent: 1 }, predictions_2d: { change_percent: 2 }, predictions_1w: { change_percent: 3 } },
    3: { accuracy: 88, predictions_1d: { change_percent: 1 }, predictions_2d: { change_percent: 2 }, predictions_1w: { change_percent: 3 } },
    4: { accuracy: 87, predictions_1d: { change_percent: 1 }, predictions_2d: { change_percent: 2 }, predictions_1w: { change_percent: 3 } },
    5: { accuracy: 86, predictions_1d: { change_percent: 1 }, predictions_2d: { change_percent: 2 }, predictions_1w: { change_percent: 3 } },
  },
  historicalData: [],
  multiTimeframe: {
    oneDay: { change_percent: 1 },
    twoDay: { change_percent: 2 },
    oneWeek: { change_percent: 3 },
  },
};

const rangeResponse = {
  points: [
    { date: '2026-04-07T16:00:00-04:00', price: 99 },
    { date: '2026-04-08T16:00:00-04:00', price: 101 },
  ],
};

describe('PredictPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getIntraday.mockResolvedValue(intradayResponse);
    getOverview.mockResolvedValue(overviewResponse);
    getPredictions.mockResolvedValue(predictionsResponse);
    getTimeSeries.mockImplementation((symbol, range) => Promise.resolve({
      ...rangeResponse,
      range,
      symbol,
    }));
    loadLastPredictions.mockReturnValue(null);
  });

  it('does not re-render the chart while typing, but updates after committing a new symbol', async () => {
    render(<PredictPage />);

    await waitFor(() => expect(screen.getByText(/Intraday • SPY/)).toBeInTheDocument());

    const input = screen.getByPlaceholderText('Enter stock symbol (e.g., AAPL, MSFT, GOOGL)');
    await userEvent.clear(input);
    await userEvent.type(input, 'ad');

    expect(screen.getByText('Selected Symbol: SPY')).toBeInTheDocument();
    expect(getIntraday).toHaveBeenCalledTimes(1);

    await userEvent.type(input, '{enter}');

    await waitFor(() => expect(screen.getByText('Selected Symbol: AD')).toBeInTheDocument());
    await waitFor(() => expect(getPredictions).toHaveBeenCalledWith('AD'));
    await waitFor(() => expect(getIntraday).toHaveBeenCalledWith('AD'));

    await userEvent.click(screen.getByRole('button', { name: '6M' }));

    await waitFor(() => expect(getTimeSeries).toHaveBeenCalledWith('AD', '6M'));
  });
});
