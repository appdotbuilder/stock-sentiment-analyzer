import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable, sentimentDataTable } from '../db/schema';
import { type SentimentQueryInput } from '../schema';
import { getHistoricalSentiment } from '../handlers/get_historical_sentiment';

// Test input with all fields
const testQueryInput: SentimentQueryInput = {
  stock_id: 1,
  days: 7,
  limit: 100
};

describe('getHistoricalSentiment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return historical sentiment data for a stock', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: '150.25',
        price_change_24h: '2.50',
        market_cap: '2500000000',
        volume_24h: '75000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    // Create sentiment data for different days
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    await db.insert(sentimentDataTable)
      .values([
        {
          stock_id: stockId,
          sentiment_score: 0.5,
          sentiment_type: 'positive',
          confidence: 0.8,
          source: 'news_api',
          news_headline: 'Apple reports strong earnings',
          recorded_at: today
        },
        {
          stock_id: stockId,
          sentiment_score: 0.3,
          sentiment_type: 'positive',
          confidence: 0.7,
          source: 'twitter',
          news_headline: null,
          recorded_at: today
        },
        {
          stock_id: stockId,
          sentiment_score: -0.2,
          sentiment_type: 'negative',
          confidence: 0.6,
          source: 'reddit',
          news_headline: 'Market concerns over Apple',
          recorded_at: yesterday
        }
      ])
      .execute();

    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 7,
      limit: 100
    });

    // Validate response structure
    expect(result.stock_id).toEqual(stockId);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    // Should have data for at least 2 days (today and yesterday)
    expect(result.data.length).toBeGreaterThanOrEqual(1);

    // Validate data structure
    result.data.forEach(item => {
      expect(item.date).toBeDefined();
      expect(typeof item.date).toBe('string');
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      expect(typeof item.sentiment_score).toBe('number');
      expect(item.sentiment_score).toBeGreaterThanOrEqual(-1);
      expect(item.sentiment_score).toBeLessThanOrEqual(1);
      expect(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']).toContain(item.sentiment_type);
      expect(typeof item.confidence).toBe('number');
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
      expect(typeof item.count).toBe('number');
      expect(item.count).toBeGreaterThan(0);
    });
  });

  it('should aggregate sentiment data correctly by date', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        current_price: '200.00',
        price_change_24h: '-5.00',
        market_cap: '600000000',
        volume_24h: '50000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    // Create multiple sentiment entries for the same day
    const testDate = new Date();
    await db.insert(sentimentDataTable)
      .values([
        {
          stock_id: stockId,
          sentiment_score: 0.8,
          sentiment_type: 'very_positive',
          confidence: 0.9,
          source: 'news_api',
          recorded_at: testDate
        },
        {
          stock_id: stockId,
          sentiment_score: 0.6,
          sentiment_type: 'positive',
          confidence: 0.8,
          source: 'twitter',
          recorded_at: testDate
        },
        {
          stock_id: stockId,
          sentiment_score: 0.4,
          sentiment_type: 'positive',
          confidence: 0.7,
          source: 'reddit',
          recorded_at: testDate
        }
      ])
      .execute();

    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 1,
      limit: 10
    });

    expect(result.data.length).toBe(1);

    const dayData = result.data[0];
    // Average sentiment score should be (0.8 + 0.6 + 0.4) / 3 = 0.6
    expect(dayData.sentiment_score).toBeCloseTo(0.6, 1);
    // Average confidence should be (0.9 + 0.8 + 0.7) / 3 = 0.8
    expect(dayData.confidence).toBeCloseTo(0.8, 1);
    // Count should be 3
    expect(dayData.count).toBe(3);
    // Most common sentiment type should be 'positive' (appears 2 times)
    expect(dayData.sentiment_type).toBe('positive');
  });

  it('should return empty data for stock with no sentiment data', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        current_price: '400.00',
        price_change_24h: '10.00',
        market_cap: '1000000000',
        volume_24h: '30000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 30,
      limit: 100
    });

    expect(result.stock_id).toEqual(stockId);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(0);
  });

  it('should respect the days parameter for date filtering', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        current_price: '300.00',
        price_change_24h: '5.00',
        market_cap: '2200000000',
        volume_24h: '40000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    // Create sentiment data for today and 10 days ago
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);

    await db.insert(sentimentDataTable)
      .values([
        {
          stock_id: stockId,
          sentiment_score: 0.5,
          sentiment_type: 'positive',
          confidence: 0.8,
          source: 'news_api',
          recorded_at: today
        },
        {
          stock_id: stockId,
          sentiment_score: -0.3,
          sentiment_type: 'negative',
          confidence: 0.7,
          source: 'twitter',
          recorded_at: tenDaysAgo
        }
      ])
      .execute();

    // Query for last 5 days - should only get today's data
    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 5,
      limit: 100
    });

    expect(result.data.length).toBe(1);
    expect(result.data[0].sentiment_score).toBe(0.5);
  });

  it('should respect the limit parameter', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        current_price: '125.00',
        price_change_24h: '3.00',
        market_cap: '1600000000',
        volume_24h: '35000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    // Create sentiment data for multiple days
    const sentimentEntries = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      sentimentEntries.push({
        stock_id: stockId,
        sentiment_score: 0.1 * i,
        sentiment_type: 'neutral' as const,
        confidence: 0.5,
        source: 'test_source',
        recorded_at: date
      });
    }

    await db.insert(sentimentDataTable)
      .values(sentimentEntries)
      .execute();

    // Query with limit of 3
    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 15,
      limit: 3
    });

    expect(result.data.length).toBeLessThanOrEqual(3);
  });

  it('should use default values for optional parameters', async () => {
    // Create test stock
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'AMD',
        name: 'Advanced Micro Devices',
        current_price: '100.00',
        price_change_24h: '2.00',
        market_cap: '160000000',
        volume_24h: '25000000'
      })
      .returning()
      .execute();

    const stockId = stockResult[0].id;

    // Test with minimal input (only stock_id) - defaults will be applied
    const result = await getHistoricalSentiment({
      stock_id: stockId,
      days: 30, // Default value
      limit: 100 // Default value
    });

    expect(result.stock_id).toEqual(stockId);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});