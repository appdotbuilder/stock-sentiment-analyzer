import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type CreateStockInput } from '../schema';
import { createStock } from '../handlers/create_stock';
import { eq } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateStockInput = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  current_price: 150.25,
  price_change_24h: -2.15,
  market_cap: 2500000000.00,
  volume_24h: 50000000.00
};

// Test input with nullable fields set to null
const testInputWithNulls: CreateStockInput = {
  symbol: 'TSLA',
  name: 'Tesla Inc.',
  current_price: 200.50,
  price_change_24h: 5.75,
  market_cap: null,
  volume_24h: null
};

describe('createStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a stock with all fields', async () => {
    const result = await createStock(testInput);

    // Basic field validation
    expect(result.symbol).toEqual('AAPL');
    expect(result.name).toEqual('Apple Inc.');
    expect(result.current_price).toEqual(150.25);
    expect(result.price_change_24h).toEqual(-2.15);
    expect(result.market_cap).toEqual(2500000000.00);
    expect(result.volume_24h).toEqual(50000000.00);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_updated).toBeInstanceOf(Date);

    // Verify numeric types are preserved correctly
    expect(typeof result.current_price).toEqual('number');
    expect(typeof result.price_change_24h).toEqual('number');
    expect(typeof result.market_cap).toEqual('number');
    expect(typeof result.volume_24h).toEqual('number');
  });

  it('should create a stock with null market_cap and volume_24h', async () => {
    const result = await createStock(testInputWithNulls);

    expect(result.symbol).toEqual('TSLA');
    expect(result.name).toEqual('Tesla Inc.');
    expect(result.current_price).toEqual(200.50);
    expect(result.price_change_24h).toEqual(5.75);
    expect(result.market_cap).toBeNull();
    expect(result.volume_24h).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_updated).toBeInstanceOf(Date);
  });

  it('should save stock to database correctly', async () => {
    const result = await createStock(testInput);

    // Query using proper drizzle syntax
    const stocks = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.id, result.id))
      .execute();

    expect(stocks).toHaveLength(1);
    const savedStock = stocks[0];
    
    expect(savedStock.symbol).toEqual('AAPL');
    expect(savedStock.name).toEqual('Apple Inc.');
    expect(parseFloat(savedStock.current_price)).toEqual(150.25);
    expect(parseFloat(savedStock.price_change_24h)).toEqual(-2.15);
    expect(parseFloat(savedStock.market_cap!)).toEqual(2500000000.00);
    expect(parseFloat(savedStock.volume_24h!)).toEqual(50000000.00);
    expect(savedStock.created_at).toBeInstanceOf(Date);
    expect(savedStock.last_updated).toBeInstanceOf(Date);
  });

  it('should handle duplicate symbol constraint', async () => {
    // Create first stock
    await createStock(testInput);

    // Attempt to create stock with same symbol
    const duplicateInput: CreateStockInput = {
      ...testInput,
      name: 'Different Apple Inc.'
    };

    // Should throw error due to unique constraint on symbol
    await expect(createStock(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle negative price changes correctly', async () => {
    const negativeChangeInput: CreateStockInput = {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      current_price: 300.00,
      price_change_24h: -15.50,
      market_cap: 750000000.00,
      volume_24h: 25000000.00
    };

    const result = await createStock(negativeChangeInput);

    expect(result.price_change_24h).toEqual(-15.50);
    expect(typeof result.price_change_24h).toEqual('number');
    
    // Verify in database
    const stocks = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.symbol, 'NVDA'))
      .execute();

    expect(parseFloat(stocks[0].price_change_24h)).toEqual(-15.50);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createStock(testInput);
    const afterCreation = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.last_updated.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.last_updated.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

    // Verify both timestamps are close to each other for new records
    const timeDifference = Math.abs(result.last_updated.getTime() - result.created_at.getTime());
    expect(timeDifference).toBeLessThan(1000); // Less than 1 second difference
  });

  it('should handle precision correctly for large numbers', async () => {
    const largeNumberInput: CreateStockInput = {
      symbol: 'BRK.A',
      name: 'Berkshire Hathaway Inc.',
      current_price: 425000.99, // Very high stock price
      price_change_24h: 1250.75,
      market_cap: 950000000000.50, // Very large market cap
      volume_24h: 1500.25 // Low volume for expensive stock
    };

    const result = await createStock(largeNumberInput);

    expect(result.current_price).toEqual(425000.99);
    expect(result.price_change_24h).toEqual(1250.75);
    expect(result.market_cap).toEqual(950000000000.50);
    expect(result.volume_24h).toEqual(1500.25);

    // Verify precision is maintained in database
    const stocks = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.symbol, 'BRK.A'))
      .execute();

    expect(parseFloat(stocks[0].current_price)).toEqual(425000.99);
    expect(parseFloat(stocks[0].market_cap!)).toEqual(950000000000.50);
  });
});