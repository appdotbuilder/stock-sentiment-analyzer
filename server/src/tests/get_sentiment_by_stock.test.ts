import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable, sentimentDataTable } from '../db/schema';
import { type SentimentQueryInput } from '../schema';
import { getSentimentByStock } from '../handlers/get_sentiment_by_stock';

describe('getSentimentByStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test stock
  const createTestStock = async () => {
    const result = await db.insert(stocksTable)
      .values({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: '150.00',
        price_change_24h: '2.50',
        market_cap: '2500000000000.00',
        volume_24h: '50000000.00'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create sentiment data
  const createSentimentData = async (stockId: number, daysAgo: number, sentimentScore: number = 0.5) => {
    const recordedDate = new Date();
    recordedDate.setDate(recordedDate.getDate() - daysAgo);

    return await db.insert(sentimentDataTable)
      .values({
        stock_id: stockId,
        sentiment_score: sentimentScore,
        sentiment_type: 'positive',
        confidence: 0.8,
        source: 'test_source',
        news_headline: 'Test headline',
        recorded_at: recordedDate
      })
      .returning()
      .execute();
  };

  it('should fetch sentiment data for a specific stock', async () => {
    const stock = await createTestStock();
    await createSentimentData(stock.id, 1, 0.75); // 1 day ago
    await createSentimentData(stock.id, 5, 0.25); // 5 days ago

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30,
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(2);
    expect(result[0].stock_id).toEqual(stock.id);
    expect(result[1].stock_id).toEqual(stock.id);
    
    // Verify numeric conversions
    expect(typeof result[0].sentiment_score).toBe('number');
    expect(typeof result[0].confidence).toBe('number');
    expect(result[0].sentiment_score).toEqual(0.75);
    expect(result[0].confidence).toEqual(0.8);
  });

  it('should order results by recorded_at descending (most recent first)', async () => {
    const stock = await createTestStock();
    await createSentimentData(stock.id, 1, 0.9); // More recent
    await createSentimentData(stock.id, 3, 0.1); // Less recent

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30,
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(2);
    expect(result[0].sentiment_score).toEqual(0.9); // Most recent first
    expect(result[1].sentiment_score).toEqual(0.1); // Older second
    expect(result[0].recorded_at > result[1].recorded_at).toBe(true);
  });

  it('should filter by date range based on days parameter', async () => {
    const stock = await createTestStock();
    await createSentimentData(stock.id, 2, 0.6); // Within range
    await createSentimentData(stock.id, 15, 0.3); // Outside range

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 10, // Only last 10 days
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(1);
    expect(result[0].sentiment_score).toEqual(0.6); // Only the recent one
  });

  it('should limit results based on limit parameter', async () => {
    const stock = await createTestStock();
    
    // Create 5 sentiment entries
    for (let i = 0; i < 5; i++) {
      await createSentimentData(stock.id, i, 0.1 * i);
    }

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30,
      limit: 3 // Limit to 3 results
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(3);
  });

  it('should return empty array for non-existent stock', async () => {
    const input: SentimentQueryInput = {
      stock_id: 999999, // Non-existent stock ID
      days: 30,
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(0);
  });

  it('should use default values correctly', async () => {
    const stock = await createTestStock();
    await createSentimentData(stock.id, 1);

    // Test with minimal input (defaults should be applied by Zod)
    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30,
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(1);
    expect(result[0].stock_id).toEqual(stock.id);
  });

  it('should handle edge case with very old sentiment data', async () => {
    const stock = await createTestStock();
    await createSentimentData(stock.id, 100); // 100 days ago, outside default range

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30, // Default range
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(0); // Should not return very old data
  });

  it('should preserve all sentiment data fields correctly', async () => {
    const stock = await createTestStock();
    const sentimentEntry = await createSentimentData(stock.id, 1, 0.85);

    const input: SentimentQueryInput = {
      stock_id: stock.id,
      days: 30,
      limit: 100
    };

    const result = await getSentimentByStock(input);

    expect(result).toHaveLength(1);
    const sentiment = result[0];
    
    expect(sentiment.id).toBeDefined();
    expect(sentiment.stock_id).toEqual(stock.id);
    expect(sentiment.sentiment_score).toEqual(0.85);
    expect(sentiment.sentiment_type).toEqual('positive');
    expect(sentiment.confidence).toEqual(0.8);
    expect(sentiment.source).toEqual('test_source');
    expect(sentiment.news_headline).toEqual('Test headline');
    expect(sentiment.recorded_at).toBeInstanceOf(Date);
    expect(sentiment.created_at).toBeInstanceOf(Date);
  });
});