import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable } from '../db/schema';
import { getStockById } from '../handlers/get_stock_by_id';

describe('getStockById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a stock when found', async () => {
    // Create test stock
    const [createdStock] = await db.insert(stocksTable)
      .values({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: '175.50',
        price_change_24h: '2.35',
        market_cap: '2750000000000',
        volume_24h: '45000000'
      })
      .returning()
      .execute();

    const result = await getStockById(createdStock.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdStock.id);
    expect(result!.symbol).toEqual('AAPL');
    expect(result!.name).toEqual('Apple Inc.');
    expect(result!.current_price).toEqual(175.50);
    expect(typeof result!.current_price).toBe('number');
    expect(result!.price_change_24h).toEqual(2.35);
    expect(typeof result!.price_change_24h).toBe('number');
    expect(result!.market_cap).toEqual(2750000000000);
    expect(typeof result!.market_cap).toBe('number');
    expect(result!.volume_24h).toEqual(45000000);
    expect(typeof result!.volume_24h).toBe('number');
    expect(result!.last_updated).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when stock not found', async () => {
    const result = await getStockById(999);
    expect(result).toBeNull();
  });

  it('should handle stocks with null market_cap and volume_24h', async () => {
    // Create test stock with nullable fields as null
    const [createdStock] = await db.insert(stocksTable)
      .values({
        symbol: 'TEST',
        name: 'Test Company',
        current_price: '100.00',
        price_change_24h: '-1.50',
        market_cap: null,
        volume_24h: null
      })
      .returning()
      .execute();

    const result = await getStockById(createdStock.id);

    expect(result).not.toBeNull();
    expect(result!.symbol).toEqual('TEST');
    expect(result!.current_price).toEqual(100.00);
    expect(result!.price_change_24h).toEqual(-1.50);
    expect(result!.market_cap).toBeNull();
    expect(result!.volume_24h).toBeNull();
  });

  it('should handle negative price changes correctly', async () => {
    // Create stock with negative price change
    const [createdStock] = await db.insert(stocksTable)
      .values({
        symbol: 'BEAR',
        name: 'Bear Market Co.',
        current_price: '50.25',
        price_change_24h: '-5.75',
        market_cap: '1000000000',
        volume_24h: '2500000'
      })
      .returning()
      .execute();

    const result = await getStockById(createdStock.id);

    expect(result).not.toBeNull();
    expect(result!.price_change_24h).toEqual(-5.75);
    expect(typeof result!.price_change_24h).toBe('number');
  });

  it('should handle decimal precision correctly', async () => {
    // Create stock with high precision values
    const [createdStock] = await db.insert(stocksTable)
      .values({
        symbol: 'PREC',
        name: 'Precision Corp',
        current_price: '123.4567',
        price_change_24h: '0.0001',
        market_cap: '999999999.99',
        volume_24h: '12345678.87'
      })
      .returning()
      .execute();

    const result = await getStockById(createdStock.id);

    expect(result).not.toBeNull();
    expect(result!.current_price).toEqual(123.4567);
    expect(result!.price_change_24h).toEqual(0.0001);
    expect(result!.market_cap).toEqual(999999999.99);
    expect(result!.volume_24h).toEqual(12345678.87);
  });

  it('should handle zero values correctly', async () => {
    // Create stock with zero values
    const [createdStock] = await db.insert(stocksTable)
      .values({
        symbol: 'ZERO',
        name: 'Zero Value Corp',
        current_price: '0.0000',
        price_change_24h: '0.0000',
        market_cap: '0.00',
        volume_24h: '0.00'
      })
      .returning()
      .execute();

    const result = await getStockById(createdStock.id);

    expect(result).not.toBeNull();
    expect(result!.current_price).toEqual(0);
    expect(result!.price_change_24h).toEqual(0);
    expect(result!.market_cap).toEqual(0);
    expect(result!.volume_24h).toEqual(0);
  });
});