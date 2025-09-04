import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable, sentimentDataTable } from '../db/schema';
import { type CreateSentimentDataInput } from '../schema';
import { createSentimentData } from '../handlers/create_sentiment_data';
import { eq } from 'drizzle-orm';

describe('createSentimentData', () => {
  let testStockId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test stock first (required for foreign key constraint)
    const stockResult = await db.insert(stocksTable)
      .values({
        symbol: 'TSLA',
        name: 'Tesla Inc',
        current_price: '250.00',
        price_change_24h: '5.50',
        market_cap: '800000000000.00',
        volume_24h: '25000000.00'
      })
      .returning()
      .execute();
    
    testStockId = stockResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateSentimentDataInput = {
    stock_id: 1, // Will be overridden with testStockId
    sentiment_score: 0.75,
    sentiment_type: 'positive',
    confidence: 0.85,
    source: 'news_api',
    news_headline: 'Tesla reports strong quarterly earnings'
  };

  it('should create sentiment data successfully', async () => {
    const input = { ...testInput, stock_id: testStockId };
    const result = await createSentimentData(input);

    // Basic field validation
    expect(result.stock_id).toEqual(testStockId);
    expect(result.sentiment_score).toEqual(0.75);
    expect(result.sentiment_type).toEqual('positive');
    expect(result.confidence).toEqual(0.85);
    expect(result.source).toEqual('news_api');
    expect(result.news_headline).toEqual('Tesla reports strong quarterly earnings');
    expect(result.id).toBeDefined();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save sentiment data to database', async () => {
    const input = { ...testInput, stock_id: testStockId };
    const result = await createSentimentData(input);

    // Query using proper drizzle syntax
    const sentimentData = await db.select()
      .from(sentimentDataTable)
      .where(eq(sentimentDataTable.id, result.id))
      .execute();

    expect(sentimentData).toHaveLength(1);
    expect(sentimentData[0].stock_id).toEqual(testStockId);
    expect(sentimentData[0].sentiment_score).toEqual(0.75);
    expect(sentimentData[0].sentiment_type).toEqual('positive');
    expect(sentimentData[0].confidence).toEqual(0.85);
    expect(sentimentData[0].source).toEqual('news_api');
    expect(sentimentData[0].news_headline).toEqual('Tesla reports strong quarterly earnings');
    expect(sentimentData[0].recorded_at).toBeInstanceOf(Date);
    expect(sentimentData[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle negative sentiment correctly', async () => {
    const negativeInput: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: -0.6,
      sentiment_type: 'negative',
      confidence: 0.9,
      source: 'twitter_api',
      news_headline: 'Tesla faces production challenges'
    };

    const result = await createSentimentData(negativeInput);

    expect(result.sentiment_score).toEqual(-0.6);
    expect(result.sentiment_type).toEqual('negative');
    expect(result.confidence).toEqual(0.9);
    expect(result.source).toEqual('twitter_api');
    expect(result.news_headline).toEqual('Tesla faces production challenges');
  });

  it('should handle neutral sentiment with null headline', async () => {
    const neutralInput: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: 0.0,
      sentiment_type: 'neutral',
      confidence: 0.7,
      source: 'reddit_api',
      news_headline: null
    };

    const result = await createSentimentData(neutralInput);

    expect(result.sentiment_score).toEqual(0.0);
    expect(result.sentiment_type).toEqual('neutral');
    expect(result.confidence).toEqual(0.7);
    expect(result.source).toEqual('reddit_api');
    expect(result.news_headline).toBeNull();
  });

  it('should handle extreme sentiment values', async () => {
    const extremePositiveInput: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: 1.0,
      sentiment_type: 'very_positive',
      confidence: 1.0,
      source: 'financial_news',
      news_headline: 'Tesla breaks all-time high records'
    };

    const result = await createSentimentData(extremePositiveInput);

    expect(result.sentiment_score).toEqual(1.0);
    expect(result.sentiment_type).toEqual('very_positive');
    expect(result.confidence).toEqual(1.0);

    // Test extreme negative
    const extremeNegativeInput: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: -1.0,
      sentiment_type: 'very_negative',
      confidence: 0.95,
      source: 'analyst_report',
      news_headline: 'Tesla faces major regulatory issues'
    };

    const negativeResult = await createSentimentData(extremeNegativeInput);

    expect(negativeResult.sentiment_score).toEqual(-1.0);
    expect(negativeResult.sentiment_type).toEqual('very_negative');
    expect(negativeResult.confidence).toEqual(0.95);
  });

  it('should throw error when stock does not exist', async () => {
    const invalidInput = { ...testInput, stock_id: 99999 };

    expect(createSentimentData(invalidInput)).rejects.toThrow(/stock with id 99999 does not exist/i);
  });

  it('should create multiple sentiment entries for the same stock', async () => {
    const input1: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: 0.5,
      sentiment_type: 'positive',
      confidence: 0.8,
      source: 'news_api',
      news_headline: 'Tesla quarterly results exceed expectations'
    };

    const input2: CreateSentimentDataInput = {
      stock_id: testStockId,
      sentiment_score: 0.3,
      sentiment_type: 'positive',
      confidence: 0.7,
      source: 'twitter_api',
      news_headline: 'Positive sentiment around Tesla innovation'
    };

    const result1 = await createSentimentData(input1);
    const result2 = await createSentimentData(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.stock_id).toEqual(testStockId);
    expect(result2.stock_id).toEqual(testStockId);

    // Verify both records exist in database
    const allSentimentData = await db.select()
      .from(sentimentDataTable)
      .where(eq(sentimentDataTable.stock_id, testStockId))
      .execute();

    expect(allSentimentData).toHaveLength(2);
    expect(allSentimentData.map(s => s.id).sort()).toEqual([result1.id, result2.id].sort());
  });

  it('should preserve timestamp accuracy', async () => {
    const beforeCreation = new Date();
    const input = { ...testInput, stock_id: testStockId };
    
    const result = await createSentimentData(input);
    
    const afterCreation = new Date();

    // Check that timestamps are reasonable
    expect(result.recorded_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.recorded_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});