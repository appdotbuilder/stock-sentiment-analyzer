import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type CreateStockInput, type Stock } from '../schema';

export const createStock = async (input: CreateStockInput): Promise<Stock> => {
  try {
    // Insert stock record
    const result = await db.insert(stocksTable)
      .values({
        symbol: input.symbol,
        name: input.name,
        current_price: input.current_price.toString(), // Convert number to string for numeric column
        price_change_24h: input.price_change_24h.toString(), // Convert number to string for numeric column
        market_cap: input.market_cap?.toString() || null, // Handle nullable field
        volume_24h: input.volume_24h?.toString() || null // Handle nullable field
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const stock = result[0];
    return {
      ...stock,
      current_price: parseFloat(stock.current_price), // Convert string back to number
      price_change_24h: parseFloat(stock.price_change_24h), // Convert string back to number
      market_cap: stock.market_cap ? parseFloat(stock.market_cap) : null, // Handle nullable field
      volume_24h: stock.volume_24h ? parseFloat(stock.volume_24h) : null // Handle nullable field
    };
  } catch (error) {
    console.error('Stock creation failed:', error);
    throw error;
  }
};