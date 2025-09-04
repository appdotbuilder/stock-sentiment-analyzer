import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, real, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for sentiment types
export const sentimentTypeEnum = pgEnum('sentiment_type', [
  'very_negative',
  'negative', 
  'neutral',
  'positive',
  'very_positive'
]);

// Stocks table
export const stocksTable = pgTable('stocks', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  current_price: numeric('current_price', { precision: 12, scale: 4 }).notNull(),
  price_change_24h: numeric('price_change_24h', { precision: 12, scale: 4 }).notNull(),
  market_cap: numeric('market_cap', { precision: 20, scale: 2 }),
  volume_24h: numeric('volume_24h', { precision: 20, scale: 2 }),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  symbolIdx: index('stocks_symbol_idx').on(table.symbol),
  lastUpdatedIdx: index('stocks_last_updated_idx').on(table.last_updated),
}));

// Sentiment data table
export const sentimentDataTable = pgTable('sentiment_data', {
  id: serial('id').primaryKey(),
  stock_id: integer('stock_id').notNull().references(() => stocksTable.id, { onDelete: 'cascade' }),
  sentiment_score: real('sentiment_score').notNull(), // -1 to 1 range
  sentiment_type: sentimentTypeEnum('sentiment_type').notNull(),
  confidence: real('confidence').notNull(), // 0 to 1 range
  source: text('source').notNull(),
  news_headline: text('news_headline'),
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  stockIdIdx: index('sentiment_data_stock_id_idx').on(table.stock_id),
  recordedAtIdx: index('sentiment_data_recorded_at_idx').on(table.recorded_at),
  stockIdRecordedAtIdx: index('sentiment_data_stock_recorded_idx').on(table.stock_id, table.recorded_at),
}));

// Relations
export const stocksRelations = relations(stocksTable, ({ many }) => ({
  sentimentData: many(sentimentDataTable),
}));

export const sentimentDataRelations = relations(sentimentDataTable, ({ one }) => ({
  stock: one(stocksTable, {
    fields: [sentimentDataTable.stock_id],
    references: [stocksTable.id],
  }),
}));

// TypeScript types for table schemas
export type Stock = typeof stocksTable.$inferSelect;
export type NewStock = typeof stocksTable.$inferInsert;
export type SentimentData = typeof sentimentDataTable.$inferSelect;
export type NewSentimentData = typeof sentimentDataTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  stocks: stocksTable, 
  sentimentData: sentimentDataTable 
};

export const tableRelations = {
  stocks: stocksRelations,
  sentimentData: sentimentDataRelations
};