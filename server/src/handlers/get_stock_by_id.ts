import { db } from '../db';
import { stocksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Stock } from '../schema';

export const getStockById = async (id: number): Promise<Stock | null> => {
  try {
    // Query stock by ID
    const results = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.id, id))
      .execute();

    // Return null if no stock found
    if (results.length === 0) {
      return null;
    }

    const stock = results[0];
    
    // Convert numeric fields from strings to numbers
    return {
      ...stock,
      current_price: parseFloat(stock.current_price),
      price_change_24h: parseFloat(stock.price_change_24h),
      market_cap: stock.market_cap ? parseFloat(stock.market_cap) : null,
      volume_24h: stock.volume_24h ? parseFloat(stock.volume_24h) : null
    };
  } catch (error) {
    console.error('Failed to fetch stock by ID:', error);
    throw error;
  }
};