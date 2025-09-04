import { db } from '../db';
import { stocksTable, sentimentDataTable } from '../db/schema';
import { type StockWithSentiment } from '../schema';
import { eq, desc, and, max, sql } from 'drizzle-orm';

export const getStocksWithSentiment = async (): Promise<StockWithSentiment[]> => {
  try {
    // First, get the most recent sentiment data for each stock using a subquery
    const latestSentimentSubquery = db
      .select({
        stock_id: sentimentDataTable.stock_id,
        max_recorded_at: max(sentimentDataTable.recorded_at).as('max_recorded_at')
      })
      .from(sentimentDataTable)
      .groupBy(sentimentDataTable.stock_id)
      .as('latest_sentiment');

    // Main query to get stocks with their latest sentiment data
    const results = await db
      .select({
        // Stock fields
        id: stocksTable.id,
        symbol: stocksTable.symbol,
        name: stocksTable.name,
        current_price: stocksTable.current_price,
        price_change_24h: stocksTable.price_change_24h,
        market_cap: stocksTable.market_cap,
        volume_24h: stocksTable.volume_24h,
        last_updated: stocksTable.last_updated,
        created_at: stocksTable.created_at,
        // Sentiment fields
        sentiment_score: sentimentDataTable.sentiment_score,
        sentiment_type: sentimentDataTable.sentiment_type
      })
      .from(stocksTable)
      .leftJoin(
        latestSentimentSubquery,
        eq(stocksTable.id, latestSentimentSubquery.stock_id)
      )
      .leftJoin(
        sentimentDataTable,
        and(
          eq(sentimentDataTable.stock_id, latestSentimentSubquery.stock_id),
          eq(sentimentDataTable.recorded_at, latestSentimentSubquery.max_recorded_at)
        )
      )
      .orderBy(stocksTable.symbol)
      .execute();

    // Transform results and handle numeric conversions
    return results.map(result => ({
      id: result.id,
      symbol: result.symbol,
      name: result.name,
      current_price: parseFloat(result.current_price),
      price_change_24h: parseFloat(result.price_change_24h),
      market_cap: result.market_cap ? parseFloat(result.market_cap) : null,
      volume_24h: result.volume_24h ? parseFloat(result.volume_24h) : null,
      last_updated: result.last_updated,
      created_at: result.created_at,
      current_sentiment_score: result.sentiment_score || null,
      current_sentiment_type: result.sentiment_type || null
    }));
  } catch (error) {
    console.error('Failed to get stocks with sentiment:', error);
    throw error;
  }
};