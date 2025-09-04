import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';
import type { StockWithSentiment } from '../../../server/src/schema';

interface StockListProps {
  stocks: StockWithSentiment[];
  onStockSelect: (stock: StockWithSentiment) => void;
  onRefresh: () => void;
}

export function StockList({ stocks, onStockSelect, onRefresh }: StockListProps) {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatPriceChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap: number | null) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const getSentimentBadge = (score: number | null, type: string | null) => {
    if (!score || !type) {
      return <Badge variant="secondary">No Data</Badge>;
    }

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", emoji: string }> = {
      very_positive: { variant: "default", emoji: "🚀" },
      positive: { variant: "default", emoji: "📈" },
      neutral: { variant: "secondary", emoji: "⚖️" },
      negative: { variant: "destructive", emoji: "📉" },
      very_negative: { variant: "destructive", emoji: "💥" }
    };

    const config = variants[type] || { variant: "outline" as const, emoji: "❓" };
    
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.emoji} {type.replace('_', ' ')}
      </Badge>
    );
  };

  const getSentimentIcon = (score: number | null) => {
    if (!score) return <MinusIcon className="h-4 w-4 text-gray-400" />;
    if (score > 0.2) return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
    if (score < -0.2) return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
    return <MinusIcon className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Market Overview</h2>
          <p className="text-gray-600">Click on any stock to view detailed sentiment analysis</p>
        </div>
        <Button 
          onClick={onRefresh} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCwIcon className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stock cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stocks.map((stock: StockWithSentiment) => (
          <Card 
            key={stock.id} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
            onClick={() => onStockSelect(stock)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">
                    {stock.symbol}
                  </CardTitle>
                  <p className="text-sm text-gray-600 truncate">{stock.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatPrice(stock.current_price)}
                  </div>
                  <div className={`flex items-center text-sm font-medium ${
                    stock.price_change_24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stock.price_change_24h >= 0 ? (
                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPriceChange(stock.price_change_24h)}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Market info */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Market Cap:</span>
                  <span className="font-medium">{formatMarketCap(stock.market_cap)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Volume (24h):</span>
                  <span className="font-medium">
                    {stock.volume_24h ? stock.volume_24h.toLocaleString() : 'N/A'}
                  </span>
                </div>

                {/* Sentiment section */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Market Sentiment</span>
                    {getSentimentIcon(stock.current_sentiment_score)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {getSentimentBadge(stock.current_sentiment_score, stock.current_sentiment_type)}
                    {stock.current_sentiment_score && (
                      <span className="text-xs text-gray-500">
                        Score: {stock.current_sentiment_score.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Call to action */}
                <div className="pt-2">
                  <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700">
                    View Details & Trends →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stocks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <TrendingDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Stocks Available</h3>
            <p className="text-gray-500">Market data is currently unavailable. Please try refreshing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}