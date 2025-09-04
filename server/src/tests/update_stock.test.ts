import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type UpdateStockInput, type CreateStockInput } from '../schema';
import { updateStock } from '../handlers/update_stock';
import { eq } from 'drizzle-orm';

// Helper function to create a test stock
const createTestStock = async (): Promise<number> => {
  const testStock: CreateStockInput = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    current_price: 175.50,
    price_change_24h: -2.35,
    market_cap: 2750000000000,
    volume_24h: 45000000
  };

  const result = await db.insert(stocksTable)
    .values({
      symbol: testStock.symbol,
      name: testStock.name,
      current_price: testStock.current_price.toString(),
      price_change_24h: testStock.price_change_24h.toString(),
      market_cap: testStock.market_cap?.toString() || null,
      volume_24h: testStock.volume_24h?.toString() || null
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all stock fields', async () => {
    const stockId = await createTestStock();

    const updateInput: UpdateStockInput = {
      id: stockId,
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      current_price: 420.75,
      price_change_24h: 5.25,
      market_cap: 3120000000000,
      volume_24h: 28000000
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(stockId);
    expect(result!.symbol).toEqual('MSFT');
    expect(result!.name).toEqual('Microsoft Corporation');
    expect(result!.current_price).toEqual(420.75);
    expect(result!.price_change_24h).toEqual(5.25);
    expect(result!.market_cap).toEqual(3120000000000);
    expect(result!.volume_24h).toEqual(28000000);
    expect(result!.last_updated).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const stockId = await createTestStock();

    // Update only price and name
    const updateInput: UpdateStockInput = {
      id: stockId,
      name: 'Apple Inc. Updated',
      current_price: 180.00
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(stockId);
    expect(result!.symbol).toEqual('AAPL'); // Should remain unchanged
    expect(result!.name).toEqual('Apple Inc. Updated'); // Should be updated
    expect(result!.current_price).toEqual(180.00); // Should be updated
    expect(result!.price_change_24h).toEqual(-2.35); // Should remain unchanged
    expect(result!.market_cap).toEqual(2750000000000); // Should remain unchanged
    expect(result!.volume_24h).toEqual(45000000); // Should remain unchanged
  });

  it('should update nullable fields to null', async () => {
    const stockId = await createTestStock();

    const updateInput: UpdateStockInput = {
      id: stockId,
      market_cap: null,
      volume_24h: null
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(stockId);
    expect(result!.market_cap).toBeNull();
    expect(result!.volume_24h).toBeNull();
    expect(result!.symbol).toEqual('AAPL'); // Should remain unchanged
    expect(result!.name).toEqual('Apple Inc.'); // Should remain unchanged
  });

  it('should update nullable fields from null to values', async () => {
    // Create stock with null market_cap and volume_24h
    const result = await db.insert(stocksTable)
      .values({
        symbol: 'TEST',
        name: 'Test Company',
        current_price: '100.00',
        price_change_24h: '0.00',
        market_cap: null,
        volume_24h: null
      })
      .returning()
      .execute();

    const stockId = result[0].id;

    const updateInput: UpdateStockInput = {
      id: stockId,
      market_cap: 1000000000,
      volume_24h: 5000000
    };

    const updateResult = await updateStock(updateInput);

    expect(updateResult).toBeDefined();
    expect(updateResult!.market_cap).toEqual(1000000000);
    expect(updateResult!.volume_24h).toEqual(5000000);
  });

  it('should handle negative values correctly', async () => {
    const stockId = await createTestStock();

    const updateInput: UpdateStockInput = {
      id: stockId,
      current_price: 150.25,
      price_change_24h: -15.75 // Negative price change
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(result!.current_price).toEqual(150.25);
    expect(result!.price_change_24h).toEqual(-15.75);
  });

  it('should always update last_updated timestamp', async () => {
    const stockId = await createTestStock();

    // Get original timestamp
    const originalStock = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.id, stockId))
      .execute();

    const originalTimestamp = originalStock[0].last_updated;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateStockInput = {
      id: stockId,
      name: 'Apple Inc. - Updated'
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(result!.last_updated).toBeInstanceOf(Date);
    expect(result!.last_updated.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should return null for non-existent stock', async () => {
    const updateInput: UpdateStockInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Stock'
    };

    const result = await updateStock(updateInput);

    expect(result).toBeNull();
  });

  it('should save updated data to database correctly', async () => {
    const stockId = await createTestStock();

    const updateInput: UpdateStockInput = {
      id: stockId,
      symbol: 'GOOGL',
      current_price: 2750.50,
      market_cap: 1800000000000
    };

    const result = await updateStock(updateInput);

    // Verify the update was saved to database
    const savedStock = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.id, stockId))
      .execute();

    expect(savedStock).toHaveLength(1);
    expect(savedStock[0].symbol).toEqual('GOOGL');
    expect(parseFloat(savedStock[0].current_price)).toEqual(2750.50);
    expect(parseFloat(savedStock[0].market_cap!)).toEqual(1800000000000);
    expect(savedStock[0].last_updated).toBeInstanceOf(Date);
  });

  it('should handle duplicate symbol constraint violation', async () => {
    // Create two test stocks
    const stockId1 = await createTestStock();
    
    await db.insert(stocksTable)
      .values({
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        current_price: '850.00',
        price_change_24h: '10.50',
        market_cap: '850000000000',
        volume_24h: '25000000'
      })
      .execute();

    // Try to update first stock with symbol that already exists
    const updateInput: UpdateStockInput = {
      id: stockId1,
      symbol: 'TSLA' // This should cause a constraint violation
    };

    await expect(updateStock(updateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle numeric precision correctly', async () => {
    const stockId = await createTestStock();

    const updateInput: UpdateStockInput = {
      id: stockId,
      current_price: 123.4567, // Test precision handling
      price_change_24h: -0.0001,
      market_cap: 123456789012.34,
      volume_24h: 987654321.12
    };

    const result = await updateStock(updateInput);

    expect(result).toBeDefined();
    expect(typeof result!.current_price).toEqual('number');
    expect(typeof result!.price_change_24h).toEqual('number');
    expect(typeof result!.market_cap).toEqual('number');
    expect(typeof result!.volume_24h).toEqual('number');
    expect(result!.current_price).toBeCloseTo(123.4567, 4);
    expect(result!.price_change_24h).toBeCloseTo(-0.0001, 4);
  });
});