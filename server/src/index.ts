import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createStockInputSchema,
  updateStockInputSchema,
  createSentimentDataInputSchema,
  sentimentQueryInputSchema
} from './schema';

// Import handlers
import { createStock } from './handlers/create_stock';
import { getStocks } from './handlers/get_stocks';
import { getStockById } from './handlers/get_stock_by_id';
import { updateStock } from './handlers/update_stock';
import { createSentimentData } from './handlers/create_sentiment_data';
import { getSentimentByStock } from './handlers/get_sentiment_by_stock';
import { getHistoricalSentiment } from './handlers/get_historical_sentiment';
import { getStocksWithSentiment } from './handlers/get_stocks_with_sentiment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Stock management routes
  createStock: publicProcedure
    .input(createStockInputSchema)
    .mutation(({ input }) => createStock(input)),

  getStocks: publicProcedure
    .query(() => getStocks()),

  getStockById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStockById(input.id)),

  updateStock: publicProcedure
    .input(updateStockInputSchema)
    .mutation(({ input }) => updateStock(input)),

  // Stocks with sentiment aggregation
  getStocksWithSentiment: publicProcedure
    .query(() => getStocksWithSentiment()),

  // Sentiment data routes
  createSentimentData: publicProcedure
    .input(createSentimentDataInputSchema)
    .mutation(({ input }) => createSentimentData(input)),

  getSentimentByStock: publicProcedure
    .input(sentimentQueryInputSchema)
    .query(({ input }) => getSentimentByStock(input)),

  getHistoricalSentiment: publicProcedure
    .input(sentimentQueryInputSchema)
    .query(({ input }) => getHistoricalSentiment(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Stock Market Sentiment Analyzer API listening at port: ${port}`);
}

start();