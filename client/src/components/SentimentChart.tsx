import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HistoricalSentiment } from '../../../server/src/schema';

interface SentimentChartProps {
  data: HistoricalSentiment;
  stockSymbol: string;
}

export function SentimentChart({ data, stockSymbol }: SentimentChartProps) {
  const { data: sentimentData } = data;

  // Create a simple ASCII-style chart using CSS and HTML
  // This is a basic implementation - in a real app you might use libraries like Chart.js or Recharts
  const getBarColor = (score: number) => {
    if (score > 0.6) return 'bg-green-600';
    if (score > 0.2) return 'bg-green-400';
    if (score > -0.2) return 'bg-yellow-400';
    if (score > -0.6) return 'bg-red-400';
    return 'bg-red-600';
  };

  const getBarHeight = (score: number) => {
    // Normalize score from -1 to 1 range to 0-100% height
    const normalized = ((score + 1) / 2) * 100;
    return Math.max(2, Math.min(100, normalized));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSentimentEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      very_positive: '🚀',
      positive: '📈',
      neutral: '⚖️',
      negative: '📉',
      very_negative: '💥'
    };
    return emojis[type] || '❓';
  };

  // Get recent data points for display (limit to prevent overcrowding)
  const displayData = sentimentData.slice(-30); // Show last 30 data points max
  const averageSentiment = sentimentData.reduce((sum, item) => sum + item.sentiment_score, 0) / sentimentData.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>📊 Sentiment Trend - {stockSymbol}</span>
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Positive</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Neutral</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Negative</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary stats */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Period Average</p>
              <p className="text-xl font-bold">{averageSentiment.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Points</p>
              <p className="text-xl font-bold">{sentimentData.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sentiment Entries</p>
              <p className="text-xl font-bold">
                {sentimentData.reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart visualization */}
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>+1.0</span>
            <span>+0.5</span>
            <span>0.0</span>
            <span>-0.5</span>
            <span>-1.0</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 border-l border-b border-gray-300 relative h-64 overflow-x-auto">
            {/* Zero line */}
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-400"></div>
            
            {/* Chart bars */}
            <div className="flex items-end justify-start space-x-1 h-full px-2" style={{ width: `${Math.max(800, displayData.length * 25)}px` }}>
              {displayData.map((item, index) => {
                const height = getBarHeight(item.sentiment_score);
                const color = getBarColor(item.sentiment_score);
                
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center relative group cursor-pointer"
                    style={{ minWidth: '20px' }}
                  >
                    {/* Bar */}
                    <div className="relative flex items-end h-64">
                      <div
                        className={`${color} rounded-sm transition-all duration-200 group-hover:opacity-80 relative`}
                        style={{ 
                          width: '16px',
                          height: `${height}%`,
                          transformOrigin: 'bottom'
                        }}
                        title={`${formatDate(item.date)}: ${item.sentiment_score.toFixed(3)} (${item.sentiment_type})`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          <div className="text-center">
                            <div className="font-semibold">{formatDate(item.date)}</div>
                            <div>Score: {item.sentiment_score.toFixed(3)}</div>
                            <div>{getSentimentEmoji(item.sentiment_type)} {item.sentiment_type.replace('_', ' ')}</div>
                            <div>Entries: {item.count}</div>
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-8 mt-2 flex justify-between text-xs text-gray-500 overflow-hidden">
            <span>{formatDate(displayData[0]?.date || '')}</span>
            {displayData.length > 1 && (
              <span>{formatDate(displayData[displayData.length - 1].date)}</span>
            )}
          </div>
        </div>

        {/* Recent sentiment indicators */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Sentiment Trend</h4>
          <div className="flex space-x-2 flex-wrap">
            {displayData.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs bg-gray-50 rounded-full px-3 py-1">
                <span className="text-gray-600">{formatDate(item.date)}</span>
                <span>{getSentimentEmoji(item.sentiment_type)}</span>
                <Badge variant={item.sentiment_score > 0.2 ? 'default' : item.sentiment_score < -0.2 ? 'destructive' : 'secondary'} className="text-xs">
                  {item.sentiment_score.toFixed(2)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}