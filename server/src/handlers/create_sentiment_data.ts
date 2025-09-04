import { db } from '../db';
import { sentimentDataTable, stocksTable } from '../db/schema';
import { type CreateSentimentDataInput, type SentimentData } from '../schema';
import { eq } from 'drizzle-orm';

export const createSentimentData = async (input: CreateSentimentDataInput): Promise<SentimentData> => {
  try {
    // First, validate that the stock exists
    const existingStock = await db.select()
      .from(stocksTable)
      .where(eq(stocksTable.id, input.stock_id))
      .limit(1)
      .execute();

    if (existingStock.length === 0) {
      throw new Error(`Stock with ID ${input.stock_id} does not exist`);
    }

    // Insert sentiment data record
    const result = await db.insert(sentimentDataTable)
      .values({
        stock_id: input.stock_id,
        sentiment_score: input.sentiment_score,
        sentiment_type: input.sentiment_type,
        confidence: input.confidence,
        source: input.source,
        news_headline: input.news_headline
      })
      .returning()
      .execute();

    // Return the created sentiment data
    const sentimentData = result[0];
    return {
      ...sentimentData
    };
  } catch (error) {
    console.error('Sentiment data creation failed:', error);
    throw error;
  }
};