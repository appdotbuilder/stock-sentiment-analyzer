import { db } from '../db';
import { stocksTable } from '../db/schema';
import { type UpdateStockInput, type Stock } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStock = async (input: UpdateStockInput): Promise<Stock | null> => {
  try {
    // Build update values object with only provided fields
    const updateValues: any = {
      last_updated: new Date() // Always update the timestamp
    };

    if (input.symbol !== undefined) {
      updateValues.symbol = input.symbol;
    }
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.current_price !== undefined) {
      updateValues.current_price = input.current_price.toString();
    }
    if (input.price_change_24h !== undefined) {
      updateValues.price_change_24h = input.price_change_24h.toString();
    }
    if (input.market_cap !== undefined) {
      updateValues.market_cap = input.market_cap ? input.market_cap.toString() : null;
    }
    if (input.volume_24h !== undefined) {
      updateValues.volume_24h = input.volume_24h ? input.volume_24h.toString() : null;
    }

    // Update the stock record
    const result = await db.update(stocksTable)
      .set(updateValues)
      .where(eq(stocksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null; // Stock not found
    }

    // Convert numeric fields back to numbers before returning
    const stock = result[0];
    return {
      ...stock,
      current_price: parseFloat(stock.current_price),
      price_change_24h: parseFloat(stock.price_change_24h),
      market_cap: stock.market_cap ? parseFloat(stock.market_cap) : null,
      volume_24h: stock.volume_24h ? parseFloat(stock.volume_24h) : null
    };
  } catch (error) {
    console.error('Stock update failed:', error);
    throw error;
  }
};