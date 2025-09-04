import { db } from '../db';
import { sentimentDataTable } from '../db/schema';
import { type SentimentQueryInput, type SentimentData } from '../schema';
import { eq, gte, desc, and } from 'drizzle-orm';

export const getSentimentByStock = async (input: SentimentQueryInput): Promise<SentimentData[]> => {
  try {
    // Calculate the date threshold based on the 'days' parameter
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - input.days);

    // Query sentiment data for the specific stock
    const results = await db.select()
      .from(sentimentDataTable)
      .where(
        and(
          eq(sentimentDataTable.stock_id, input.stock_id),
          gte(sentimentDataTable.recorded_at, daysAgo)
        )
      )
      .orderBy(desc(sentimentDataTable.recorded_at))
      .limit(input.limit)
      .execute();

    // Convert numeric fields back to numbers for consistency
    return results.map((result: any) => ({
      ...result,
      sentiment_score: Number(result.sentiment_score),
      confidence: Number(result.confidence)
    }));
  } catch (error) {
    console.error('Sentiment data retrieval failed:', error);
    throw error;
  }
};