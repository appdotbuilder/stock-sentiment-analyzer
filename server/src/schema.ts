import { z } from 'zod';

// Stock schema
export const stockSchema = z.object({
  id: z.number(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number(),
  price_change_24h: z.number(),
  market_cap: z.number().nullable(),
  volume_24h: z.number().nullable(),
  last_updated: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Stock = z.infer<typeof stockSchema>;

// Input schema for creating stocks
export const createStockInputSchema = z.object({
  symbol: z.string().min(1).max(10),
  name: z.string().min(1),
  current_price: z.number().positive(),
  price_change_24h: z.number(),
  market_cap: z.number().positive().nullable(),
  volume_24h: z.number().nonnegative().nullable()
});

export type CreateStockInput = z.infer<typeof createStockInputSchema>;

// Input schema for updating stocks
export const updateStockInputSchema = z.object({
  id: z.number(),
  symbol: z.string().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  current_price: z.number().positive().optional(),
  price_change_24h: z.number().optional(),
  market_cap: z.number().positive().nullable().optional(),
  volume_24h: z.number().nonnegative().nullable().optional()
});

export type UpdateStockInput = z.infer<typeof updateStockInputSchema>;

// Sentiment score enum
export const sentimentTypeSchema = z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']);
export type SentimentType = z.infer<typeof sentimentTypeSchema>;

// Sentiment data schema
export const sentimentDataSchema = z.object({
  id: z.number(),
  stock_id: z.number(),
  sentiment_score: z.number().min(-1).max(1), // Normalized score between -1 and 1
  sentiment_type: sentimentTypeSchema,
  confidence: z.number().min(0).max(1), // Confidence level between 0 and 1
  source: z.string(),
  news_headline: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type SentimentData = z.infer<typeof sentimentDataSchema>;

// Input schema for creating sentiment data
export const createSentimentDataInputSchema = z.object({
  stock_id: z.number(),
  sentiment_score: z.number().min(-1).max(1),
  sentiment_type: sentimentTypeSchema,
  confidence: z.number().min(0).max(1),
  source: z.string().min(1),
  news_headline: z.string().nullable()
});

export type CreateSentimentDataInput = z.infer<typeof createSentimentDataInputSchema>;

// Stock with sentiment aggregation schema
export const stockWithSentimentSchema = z.object({
  id: z.number(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number(),
  price_change_24h: z.number(),
  market_cap: z.number().nullable(),
  volume_24h: z.number().nullable(),
  last_updated: z.coerce.date(),
  created_at: z.coerce.date(),
  current_sentiment_score: z.number().min(-1).max(1).nullable(),
  current_sentiment_type: sentimentTypeSchema.nullable(),
  sentiment_trend: z.array(sentimentDataSchema).optional()
});

export type StockWithSentiment = z.infer<typeof stockWithSentimentSchema>;

// Query parameters for sentiment data
export const sentimentQueryInputSchema = z.object({
  stock_id: z.number(),
  days: z.number().int().min(1).max(365).optional().default(30),
  limit: z.number().int().min(1).max(1000).optional().default(100)
});

export type SentimentQueryInput = z.infer<typeof sentimentQueryInputSchema>;

// Historical sentiment data with time series
export const historicalSentimentSchema = z.object({
  stock_id: z.number(),
  data: z.array(z.object({
    date: z.string(), // ISO date string for frontend charting
    sentiment_score: z.number(),
    sentiment_type: sentimentTypeSchema,
    confidence: z.number(),
    count: z.number() // Number of sentiment entries for this date
  }))
});

export type HistoricalSentiment = z.infer<typeof historicalSentimentSchema>;