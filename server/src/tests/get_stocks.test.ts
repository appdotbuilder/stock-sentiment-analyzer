import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type CreateStockInput } from '../schema';
import { getStocks } from '../handlers/get_stocks';

// Test stock data
const testStocks: CreateStockInput[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    current_price: 175.50,
    price_change_24h: 2.35,
    market_cap: 2750000000000,
    volume_24h: 45000000
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    current_price: 2650.00,
    price_change_24h: -15.75,
    market_cap: 1650000000000,
    volume_24h: 25000000
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    current_price: 245.80,
    price_change_24h: 12.30,
    market_cap: 780000000000,
    volume_24h: 65000000
  }
];

describe('getStocks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stocks exist', async () => {
    const result = await getStocks();
    expect(result).toEqual([]);
  });

  it('should return all stocks ordered by symbol', async () => {
    // Insert test stocks
    await db.insert(stocksTable)
      .values(testStocks.map(stock => ({
        ...stock,
        current_price: stock.current_price.toString(),
        price_change_24h: stock.price_change_24h.toString(),
        market_cap: stock.market_cap?.toString() || null,
        volume_24h: stock.volume_24h?.toString() || null
      })))
      .execute();

    const result = await getStocks();

    // Should return all 3 stocks
    expect(result).toHaveLength(3);

    // Should be ordered alphabetically by symbol (AAPL, GOOGL, TSLA)
    expect(result[0].symbol).toEqual('AAPL');
    expect(result[1].symbol).toEqual('GOOGL');
    expect(result[2].symbol).toEqual('TSLA');

    // Verify data structure and types
    result.forEach(stock => {
      expect(stock.id).toBeDefined();
      expect(typeof stock.symbol).toBe('string');
      expect(typeof stock.name).toBe('string');
      expect(typeof stock.current_price).toBe('number');
      expect(typeof stock.price_change_24h).toBe('number');
      expect(stock.market_cap === null || typeof stock.market_cap === 'number').toBe(true);
      expect(stock.volume_24h === null || typeof stock.volume_24h === 'number').toBe(true);
      expect(stock.last_updated).toBeInstanceOf(Date);
      expect(stock.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle numeric field conversions correctly', async () => {
    // Insert a stock with precise decimal values
    await db.insert(stocksTable)
      .values({
        symbol: 'TEST',
        name: 'Test Stock',
        current_price: '123.4567',
        price_change_24h: '-5.89',
        market_cap: '1500000000.50',
        volume_24h: '12345678.25'
      })
      .execute();

    const result = await getStocks();

    expect(result).toHaveLength(1);
    const stock = result[0];

    // Verify numeric conversions
    expect(stock.current_price).toEqual(123.4567);
    expect(stock.price_change_24h).toEqual(-5.89);
    expect(stock.market_cap).toEqual(1500000000.50);
    expect(stock.volume_24h).toEqual(12345678.25);
  });

  it('should handle null values for optional numeric fields', async () => {
    // Insert a stock with null market_cap and volume_24h
    await db.insert(stocksTable)
      .values({
        symbol: 'SMALL',
        name: 'Small Company',
        current_price: '10.50',
        price_change_24h: '0.25',
        market_cap: null,
        volume_24h: null
      })
      .execute();

    const result = await getStocks();

    expect(result).toHaveLength(1);
    const stock = result[0];

    // Verify null values are preserved
    expect(stock.market_cap).toBeNull();
    expect(stock.volume_24h).toBeNull();
    expect(stock.current_price).toEqual(10.50);
    expect(stock.price_change_24h).toEqual(0.25);
  });

  it('should return stocks with all required timestamps', async () => {
    await db.insert(stocksTable)
      .values({
        symbol: 'TIME',
        name: 'Time Test Stock',
        current_price: '50.00',
        price_change_24h: '1.00',
        market_cap: null,
        volume_24h: null
      })
      .execute();

    const result = await getStocks();

    expect(result).toHaveLength(1);
    const stock = result[0];

    // Verify timestamps are Date objects
    expect(stock.created_at).toBeInstanceOf(Date);
    expect(stock.last_updated).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(stock.created_at >= oneMinuteAgo).toBe(true);
    expect(stock.last_updated >= oneMinuteAgo).toBe(true);
  });
});