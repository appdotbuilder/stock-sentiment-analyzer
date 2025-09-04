import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HistoricalSentiment } from '../../../server/src/schema';

interface SentimentTableProps {
  data: HistoricalSentiment;
  stockSymbol: string;
}

export function SentimentTable({ data, stockSymbol }: SentimentTableProps) {
  const { data: sentimentData } = data;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSentimentBadge = (score: number, type: string) => {
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

  const getScoreColor = (score: number) => {
    if (score > 0.2) return 'text-green-600 font-semibold';
    if (score < -0.2) return 'text-red-600 font-semibold';
    return 'text-yellow-600 font-semibold';
  };

  const getConfidenceBar = (confidence: number) => {
    const percentage = confidence * 100;
    let colorClass = 'bg-green-500';
    
    if (percentage < 50) colorClass = 'bg-red-500';
    else if (percentage < 75) colorClass = 'bg-yellow-500';
    
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className={`${colorClass} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{percentage.toFixed(0)}%</span>
      </div>
    );
  };

  // Reverse the data to show most recent first
  const sortedData = [...sentimentData].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>📋 Sentiment Data Table - {stockSymbol}</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Detailed sentiment analysis data for the selected time period ({sentimentData.length} data points)
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-20 text-center">Score</TableHead>
                <TableHead className="w-32">Sentiment</TableHead>
                <TableHead className="w-24">Confidence</TableHead>
                <TableHead className="w-20 text-center">Entries</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(item.sentiment_score)}>
                      {item.sentiment_score.toFixed(3)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getSentimentBadge(item.sentiment_score, item.sentiment_type)}
                  </TableCell>
                  <TableCell>
                    {getConfidenceBar(item.confidence)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {item.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.sentiment_score > 0.5 ? '🎯 Strong positive sentiment' : 
                     item.sentiment_score > 0.2 ? '✅ Positive momentum' :
                     item.sentiment_score > -0.2 ? '📊 Neutral market view' :
                     item.sentiment_score > -0.5 ? '⚠️ Concerning signals' : 
                     '🚨 Strong negative sentiment'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Summary statistics */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">Average Score</p>
              <p className="text-lg font-bold">
                {(sentimentData.reduce((sum, item) => sum + item.sentiment_score, 0) / sentimentData.length).toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Highest Score</p>
              <p className="text-lg font-bold text-green-600">
                {Math.max(...sentimentData.map(item => item.sentiment_score)).toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Lowest Score</p>
              <p className="text-lg font-bold text-red-600">
                {Math.min(...sentimentData.map(item => item.sentiment_score)).toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg. Confidence</p>
              <p className="text-lg font-bold">
                {((sentimentData.reduce((sum, item) => sum + item.confidence, 0) / sentimentData.length) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}