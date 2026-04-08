import { demoApi } from './services/demoData';

test('demo api returns UI-ready prediction and news data', async () => {
  const predictions = await demoApi.getPredictions('AAPL');
  const news = await demoApi.getNews(null, 3);
  const stock = await demoApi.getStockData('AAPL');

  expect(predictions.models[1].predictions_1d.price).toBeGreaterThan(0);
  expect(predictions.multiTimeframe.oneWeek.change_percent).not.toBeUndefined();
  expect(news).toHaveLength(3);
  expect(news[0]).toEqual(expect.objectContaining({
    title: expect.any(String),
    summary: expect.any(String),
    source: expect.any(String),
  }));
  expect(stock.historicalData.length).toBeGreaterThan(10);
  expect(stock.price).toBeGreaterThan(0);
});
