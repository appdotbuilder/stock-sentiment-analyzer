import { db } from '../db';
import { sentimentDataTable } from '../db/schema';
import { type SentimentQueryInput, type HistoricalSentiment } from '../schema';
import { eq, gte, sql, and } from 'drizzle-orm';

export const getHistoricalSentiment = async (input: SentimentQueryInput): Promise<HistoricalSentiment> => {
  try {
    // Calculate date range - go back the specified number of days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - input.days);

    // Query sentiment data for the stock within the date range, grouped by date
    const results = await db
      .select({
        date: sql<string>`DATE(${sentimentDataTable.recorded_at})`.as('date'),
        avg_sentiment_score: sql<number>`AVG(${sentimentDataTable.sentiment_score})`.as('avg_sentiment_score'),
        avg_confidence: sql<number>`AVG(${sentimentDataTable.confidence})`.as('avg_confidence'),
        count: sql<number>`COUNT(*)`.as('count'),
        // Get the most common sentiment type for the day
        sentiment_type: sql<'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'>`
          MODE() WITHIN GROUP (ORDER BY ${sentimentDataTable.sentiment_type})
        `.as('sentiment_type')
      })
      .from(sentimentDataTable)
      .where(
        and(
          eq(sentimentDataTable.stock_id, input.stock_id),
          gte(sentimentDataTable.recorded_at, startDate)
        )
      )
      .groupBy(sql`DATE(${sentimentDataTable.recorded_at})`)
      .orderBy(sql`DATE(${sentimentDataTable.recorded_at})`)
      .limit(input.limit)
      .execute();

    // Transform results into the expected format
    const data = results.map((row: any) => ({
      date: row.date,
      sentiment_score: Number(Number(row.avg_sentiment_score).toFixed(3)),
      sentiment_type: row.sentiment_type,
      confidence: Number(Number(row.avg_confidence).toFixed(3)),
      count: Number(row.count)
    }));

    return {
      stock_id: input.stock_id,
      data
    };
  } catch (error) {
    console.error('Historical sentiment query failed:', error);
    throw error;
  }
};