import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable, sentimentDataTable } from '../db/schema';
import { type CreateStockInput, type CreateSentimentDataInput } from '../schema';
import { getStocksWithSentiment } from '../handlers/get_stocks_with_sentiment';

// Test data for stocks
const testStock1: CreateStockInput = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  current_price: 175.50,
  price_change_24h: 2.35,
  market_cap: 2750000000000,
  volume_24h: 45000000
};

const testStock2: CreateStockInput = {
  symbol: 'GOOGL',
  name: 'Alphabet Inc.',
  current_price: 2650.00,
  price_change_24h: -15.75,
  market_cap: 1650000000000,
  volume_24h: 25000000
};

const testStock3: CreateStockInput = {
  symbol: 'TSLA',
  name: 'Tesla Inc.',
  current_price: 185.25,
  price_change_24h: -8.50,
  market_cap: 590000000000,
  volume_24h: 75000000
};

describe('getStocksWithSentiment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stocks exist', async () => {
    const result = await getStocksWithSentiment();
    expect(result).toEqual([]);
  });

  it('should return stocks without sentiment data', async () => {
    // Create stocks without sentiment data
    await db.insert(stocksTable)
      .values([
        {
          ...testStock1,
          current_price: testStock1.current_price.toString(),
          price_change_24h: testStock1.price_change_24h.toString(),
          market_cap: testStock1.market_cap?.toString() || null,
          volume_24h: testStock1.volume_24h?.toString() || null
        },
        {
          ...testStock2,
          current_price: testStock2.current_price.toString(),
          price_change_24h: testStock2.price_change_24h.toString(),
          market_cap: testStock2.market_cap?.toString() || null,
          volume_24h: testStock2.volume_24h?.toString() || null
        }
      ])
      .execute();

    const result = await getStocksWithSentiment();

    expect(result).toHaveLength(2);
    
    // Check first stock
    const appleStock = result.find(stock => stock.symbol === 'AAPL');
    expect(appleStock).toBeDefined();
    expect(appleStock!.name).toEqual('Apple Inc.');
    expect(appleStock!.current_price).toEqual(175.50);
    expect(appleStock!.price_change_24h).toEqual(2.35);
    expect(appleStock!.market_cap).toEqual(2750000000000);
    expect(appleStock!.volume_24h).toEqual(45000000);
    expect(appleStock!.current_sentiment_score).toBeNull();
    expect(appleStock!.current_sentiment_type).toBeNull();
    
    // Check second stock
    const googleStock = result.find(stock => stock.symbol === 'GOOGL');
    expect(googleStock).toBeDefined();
    expect(googleStock!.name).toEqual('Alphabet Inc.');
    expect(googleStock!.current_price).toEqual(2650.00);
    expect(googleStock!.current_sentiment_score).toBeNull();
    expect(googleStock!.current_sentiment_type).toBeNull();
  });

  it('should return stocks with latest sentiment data', async () => {
    // Create stocks first
    const stockResults = await db.insert(stocksTable)
      .values([
        {
          ...testStock1,
          current_price: testStock1.current_price.toString(),
          price_change_24h: testStock1.price_change_24h.toString(),
          market_cap: testStock1.market_cap?.toString() || null,
          volume_24h: testStock1.volume_24h?.toString() || null
        },
        {
          ...testStock2,
          current_price: testStock2.current_price.toString(),
          price_change_24h: testStock2.price_change_24h.toString(),
          market_cap: testStock2.market_cap?.toString() || null,
          volume_24h: testStock2.volume_24h?.toString() || null
        }
      ])
      .returning()
      .execute();

    const appleId = stockResults.find(s => s.symbol === 'AAPL')!.id;
    const googleId = stockResults.find(s => s.symbol === 'GOOGL')!.id;

    // Create sentiment data with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(sentimentDataTable)
      .values([
        // Older sentiment data for Apple (should not be picked)
        {
          stock_id: appleId,
          sentiment_score: 0.3,
          sentiment_type: 'neutral',
          confidence: 0.8,
          source: 'news_api',
          news_headline: 'Old Apple news',
          recorded_at: twoHoursAgo
        },
        // Latest sentiment data for Apple (should be picked)
        {
          stock_id: appleId,
          sentiment_score: 0.65,
          sentiment_type: 'positive',
          confidence: 0.9,
          source: 'twitter_api',
          news_headline: 'Apple announces new product',
          recorded_at: oneHourAgo
        },
        // Latest sentiment data for Google
        {
          stock_id: googleId,
          sentiment_score: 0.15,
          sentiment_type: 'neutral',
          confidence: 0.75,
          source: 'reddit_api',
          news_headline: 'Google quarterly results',
          recorded_at: now
        }
      ])
      .execute();

    const result = await getStocksWithSentiment();

    expect(result).toHaveLength(2);

    // Check Apple stock with latest sentiment
    const appleStock = result.find(stock => stock.symbol === 'AAPL');
    expect(appleStock).toBeDefined();
    expect(appleStock!.current_sentiment_score).toEqual(0.65);
    expect(appleStock!.current_sentiment_type).toEqual('positive');
    
    // Check Google stock with sentiment
    const googleStock = result.find(stock => stock.symbol === 'GOOGL');
    expect(googleStock).toBeDefined();
    expect(googleStock!.current_sentiment_score).toEqual(0.15);
    expect(googleStock!.current_sentiment_type).toEqual('neutral');
  });

  it('should handle stocks with mixed sentiment availability', async () => {
    // Create stocks
    const stockResults = await db.insert(stocksTable)
      .values([
        {
          ...testStock1,
          current_price: testStock1.current_price.toString(),
          price_change_24h: testStock1.price_change_24h.toString(),
          market_cap: testStock1.market_cap?.toString() || null,
          volume_24h: testStock1.volume_24h?.toString() || null
        },
        {
          ...testStock2,
          current_price: testStock2.current_price.toString(),
          price_change_24h: testStock2.price_change_24h.toString(),
          market_cap: testStock2.market_cap?.toString() || null,
          volume_24h: testStock2.volume_24h?.toString() || null
        },
        {
          ...testStock3,
          current_price: testStock3.current_price.toString(),
          price_change_24h: testStock3.price_change_24h.toString(),
          market_cap: testStock3.market_cap?.toString() || null,
          volume_24h: testStock3.volume_24h?.toString() || null
        }
      ])
      .returning()
      .execute();

    const appleId = stockResults.find(s => s.symbol === 'AAPL')!.id;
    const teslaId = stockResults.find(s => s.symbol === 'TSLA')!.id;

    // Add sentiment data only for some stocks
    await db.insert(sentimentDataTable)
      .values([
        {
          stock_id: appleId,
          sentiment_score: 0.8,
          sentiment_type: 'very_positive',
          confidence: 0.95,
          source: 'financial_news',
          news_headline: 'Apple stock soars'
        },
        {
          stock_id: teslaId,
          sentiment_score: -0.4,
          sentiment_type: 'negative',
          confidence: 0.85,
          source: 'market_analysis',
          news_headline: 'Tesla faces challenges'
        }
      ])
      .execute();

    const result = await getStocksWithSentiment();

    expect(result).toHaveLength(3);
    
    // Sort results by symbol for consistent testing
    result.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // AAPL - has sentiment data
    expect(result[0].symbol).toEqual('AAPL');
    expect(result[0].current_sentiment_score).toEqual(0.8);
    expect(result[0].current_sentiment_type).toEqual('very_positive');

    // GOOGL - no sentiment data
    expect(result[1].symbol).toEqual('GOOGL');
    expect(result[1].current_sentiment_score).toBeNull();
    expect(result[1].current_sentiment_type).toBeNull();

    // TSLA - has sentiment data
    expect(result[2].symbol).toEqual('TSLA');
    expect(result[2].current_sentiment_score).toEqual(-0.4);
    expect(result[2].current_sentiment_type).toEqual('negative');
  });

  it('should handle null market_cap and volume_24h correctly', async () => {
    // Create stock with null optional fields
    const stockWithNulls: CreateStockInput = {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      current_price: 450.25,
      price_change_24h: 12.50,
      market_cap: null,
      volume_24h: null
    };

    await db.insert(stocksTable)
      .values({
        ...stockWithNulls,
        current_price: stockWithNulls.current_price.toString(),
        price_change_24h: stockWithNulls.price_change_24h.toString(),
        market_cap: null,
        volume_24h: null
      })
      .execute();

    const result = await getStocksWithSentiment();

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toEqual('NVDA');
    expect(result[0].market_cap).toBeNull();
    expect(result[0].volume_24h).toBeNull();
    expect(result[0].current_price).toEqual(450.25);
    expect(typeof result[0].current_price).toBe('number');
  });

  it('should return stocks ordered by symbol', async () => {
    // Create stocks in non-alphabetical order
    await db.insert(stocksTable)
      .values([
        {
          ...testStock3, // TSLA
          current_price: testStock3.current_price.toString(),
          price_change_24h: testStock3.price_change_24h.toString(),
          market_cap: testStock3.market_cap?.toString() || null,
          volume_24h: testStock3.volume_24h?.toString() || null
        },
        {
          ...testStock1, // AAPL
          current_price: testStock1.current_price.toString(),
          price_change_24h: testStock1.price_change_24h.toString(),
          market_cap: testStock1.market_cap?.toString() || null,
          volume_24h: testStock1.volume_24h?.toString() || null
        },
        {
          ...testStock2, // GOOGL
          current_price: testStock2.current_price.toString(),
          price_change_24h: testStock2.price_change_24h.toString(),
          market_cap: testStock2.market_cap?.toString() || null,
          volume_24h: testStock2.volume_24h?.toString() || null
        }
      ])
      .execute();

    const result = await getStocksWithSentiment();

    expect(result).toHaveLength(3);
    expect(result[0].symbol).toEqual('AAPL');
    expect(result[1].symbol).toEqual('GOOGL');
    expect(result[2].symbol).toEqual('TSLA');
  });
});