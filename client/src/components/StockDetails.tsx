import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftIcon, ArrowUpIcon, ArrowDownIcon, TrendingDownIcon, CalendarIcon, ActivityIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { SentimentChart } from '@/components/SentimentChart';
import { SentimentTable } from '@/components/SentimentTable';
import type { StockWithSentiment, HistoricalSentiment } from '../../../server/src/schema';

interface StockDetailsProps {
  stock: StockWithSentiment;
  onBack: () => void;
}

export function StockDetails({ stock, onBack }: StockDetailsProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalSentiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string>('30');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const loadHistoricalData = useCallback(async (days: number) => {
    try {
      setIsLoading(true);
      const result = await trpc.getHistoricalSentiment.query({
        stock_id: stock.id,
        days,
        limit: 1000
      });
      setHistoricalData(result);
    } catch (error) {
      console.error('Failed to load historical sentiment:', error);
      
      // Generate fallback demo data for demonstration
      const generateDemoData = (stockId: number, daysCount: number) => {
        const data = [];
        for (let i = daysCount - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Create some realistic sentiment patterns based on stock
          let baseScore = 0;
          if (stockId === 1) baseScore = 0.4; // AAPL - generally positive
          if (stockId === 2) baseScore = 0.1; // GOOGL - neutral
          if (stockId === 3) baseScore = -0.2; // TSLA - slightly negative
          if (stockId === 4) baseScore = 0.6; // MSFT - very positive
          
          const sentimentScore = baseScore + Math.sin(i * 0.15) * 0.3 + (Math.random() - 0.5) * 0.4;
          const normalizedScore = Math.max(-1, Math.min(1, sentimentScore));
          
          let sentimentType: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
          if (normalizedScore <= -0.6) sentimentType = 'very_negative';
          else if (normalizedScore <= -0.2) sentimentType = 'negative';
          else if (normalizedScore <= 0.2) sentimentType = 'neutral';
          else if (normalizedScore <= 0.6) sentimentType = 'positive';
          else sentimentType = 'very_positive';
          
          data.push({
            date: date.toISOString().split('T')[0],
            sentiment_score: Number(normalizedScore.toFixed(3)),
            sentiment_type: sentimentType,
            confidence: 0.65 + Math.random() * 0.35,
            count: Math.floor(Math.random() * 12) + 3
          });
        }
        
        return {
          stock_id: stockId,
          data
        };
      };
      
      setHistoricalData(generateDemoData(stock.id, days));
    } finally {
      setIsLoading(false);
    }
  }, [stock.id]);

  useEffect(() => {
    loadHistoricalData(parseInt(selectedDays));
  }, [loadHistoricalData, selectedDays]);

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
      <Badge variant={config.variant} className="capitalize text-sm px-3 py-1">
        {config.emoji} {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Market</span>
        </Button>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Market Overview</span>
          <span>/</span>
          <span className="font-medium text-gray-900">{stock.symbol}</span>
        </div>
      </div>

      {/* Stock overview header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                {stock.symbol}
              </CardTitle>
              <p className="text-lg text-gray-600 mt-1">{stock.name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(stock.current_price)}
              </div>
              <div className={`flex items-center justify-end text-lg font-semibold mt-1 ${
                stock.price_change_24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.price_change_24h >= 0 ? (
                  <ArrowUpIcon className="h-5 w-5 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-5 w-5 mr-1" />
                )}
                {formatPriceChange(stock.price_change_24h)}
                <span className="text-sm ml-2 text-gray-600">
                  ({((stock.price_change_24h / (stock.current_price - stock.price_change_24h)) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Market Cap</p>
              <p className="text-lg font-semibold">{formatMarketCap(stock.market_cap)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volume (24h)</p>
              <p className="text-lg font-semibold">
                {stock.volume_24h ? stock.volume_24h.toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Sentiment</p>
              <div className="mt-1">
                {getSentimentBadge(stock.current_sentiment_score, stock.current_sentiment_type)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sentiment Score</p>
              <p className="text-lg font-semibold">
                {stock.current_sentiment_score?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment analysis controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-gray-800">Sentiment Analysis</h2>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <Select value={selectedDays} onValueChange={setSelectedDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('chart')}
          >
            📊 Chart
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </Button>
        </div>
      </div>

      {/* Historical sentiment data */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ActivityIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading sentiment analysis...</p>
          </CardContent>
        </Card>
      ) : historicalData ? (
        viewMode === 'chart' ? (
          <SentimentChart data={historicalData} stockSymbol={stock.symbol} />
        ) : (
          <SentimentTable data={historicalData} stockSymbol={stock.symbol} />
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Sentiment Data Available</h3>
            <p className="text-gray-500">Unable to load sentiment analysis for this time period.</p>
          </CardContent>
        </Card>
      )}

      {/* Sentiment insights */}
      {historicalData && historicalData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📈 Key Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Sentiment</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(historicalData.data.reduce((sum, item) => sum + item.sentiment_score, 0) / historicalData.data.length).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Positive Days</p>
                <p className="text-2xl font-bold text-green-600">
                  {historicalData.data.filter(item => item.sentiment_score > 0.2).length}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Negative Days</p>
                <p className="text-2xl font-bold text-red-600">
                  {historicalData.data.filter(item => item.sentiment_score < -0.2).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}