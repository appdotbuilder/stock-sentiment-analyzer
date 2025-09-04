import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUpIcon, ActivityIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { StockList } from '@/components/StockList';
import { StockDetails } from '@/components/StockDetails';
import type { StockWithSentiment } from '../../server/src/schema';

function App() {
  const [stocks, setStocks] = useState<StockWithSentiment[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockWithSentiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStocks = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getStocksWithSentiment.query();
      setStocks(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load stocks:', error);
      
      // Fallback demo data for development/demo purposes
      const demoStocks: StockWithSentiment[] = [
        {
          id: 1,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          current_price: 175.50,
          price_change_24h: 2.35,
          market_cap: 2750000000000,
          volume_24h: 45000000,
          last_updated: new Date(),
          created_at: new Date(),
          current_sentiment_score: 0.65,
          current_sentiment_type: 'positive'
        },
        {
          id: 2,
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          current_price: 2650.00,
          price_change_24h: -15.75,
          market_cap: 1650000000000,
          volume_24h: 25000000,
          last_updated: new Date(),
          created_at: new Date(),
          current_sentiment_score: 0.15,
          current_sentiment_type: 'neutral'
        },
        {
          id: 3,
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          current_price: 185.25,
          price_change_24h: -8.50,
          market_cap: 590000000000,
          volume_24h: 75000000,
          last_updated: new Date(),
          created_at: new Date(),
          current_sentiment_score: -0.35,
          current_sentiment_type: 'negative'
        },
        {
          id: 4,
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          current_price: 420.85,
          price_change_24h: 12.45,
          market_cap: 3120000000000,
          volume_24h: 32000000,
          last_updated: new Date(),
          created_at: new Date(),
          current_sentiment_score: 0.78,
          current_sentiment_type: 'very_positive'
        }
      ];
      
      setStocks(demoStocks);
      setError('⚠️ Using demo data - Backend connection unavailable');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const handleStockSelect = (stock: StockWithSentiment) => {
    setSelectedStock(stock);
  };

  const handleBackToList = () => {
    setSelectedStock(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <ActivityIcon className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium text-gray-700">Loading market data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error as a banner instead of blocking the entire app
  const showErrorBanner = error && error.includes('Backend connection unavailable');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Error banner */}
        {showErrorBanner && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2 text-yellow-800">
              <span>⚠️</span>
              <span className="font-medium">Demo Mode Active</span>
              <span className="text-sm">- Backend connection unavailable, showing sample data</span>
            </div>
            <Button onClick={loadStocks} variant="outline" size="sm">
              Retry Backend
            </Button>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <TrendingUpIcon className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Stock Market Sentiment Analyzer</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            📈 Track real-time stock prices and market sentiment to make informed investment decisions
          </p>
        </div>

        {selectedStock ? (
          <StockDetails 
            stock={selectedStock} 
            onBack={handleBackToList}
          />
        ) : (
          <StockList 
            stocks={stocks} 
            onStockSelect={handleStockSelect}
            onRefresh={loadStocks}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            💡 Sentiment data is generated for demonstration purposes. 
            Real-time integration with news APIs and market data providers coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;