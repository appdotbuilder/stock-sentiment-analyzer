import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type Stock } from '../schema';
import { asc } from 'drizzle-orm';

export const getStocks = async (): Promise<Stock[]> => {
  try {
    // Query all stocks from the database, ordered by symbol
    const results = await db.select()
      .from(stocksTable)
      .orderBy(asc(stocksTable.symbol))
      .execute();

    // Convert numeric fields back to numbers for the response
    return results.map(stock => ({
      ...stock,
      current_price: parseFloat(stock.current_price),
      price_change_24h: parseFloat(stock.price_change_24h),
      market_cap: stock.market_cap ? parseFloat(stock.market_cap) : null,
      volume_24h: stock.volume_24h ? parseFloat(stock.volume_24h) : null
    }));
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    throw error;
  }
};