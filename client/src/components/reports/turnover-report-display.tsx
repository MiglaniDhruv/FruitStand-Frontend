import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import type { TurnoverReportData } from '@/types';

interface TurnoverReportDisplayProps {
  data: TurnoverReportData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TurnoverReportDisplay({ data, loading }: TurnoverReportDisplayProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted animate-pulse rounded"></div>
          <div className="h-32 bg-muted animate-pulse rounded"></div>
          <div className="h-32 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No turnover data available for the selected period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Range Display */}
      {data.fromDate && data.toDate && (
        <div className="flex justify-center">
          <Badge variant="outline">
            Period: {format(new Date(data.fromDate), 'dd MMM yyyy')} to {format(new Date(data.toDate), 'dd MMM yyyy')}
          </Badge>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales Card */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-success">
              {formatCurrency(data.totalSales)}
            </div>
          </CardContent>
        </Card>

        {/* Total Purchases Card */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
            <DollarSign className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-info">
              {formatCurrency(data.totalPurchases)}
            </div>
          </CardContent>
        </Card>

        {/* Net Turnover Card */}
        <Card className="p-4 border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Turnover
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-info">
              {formatCurrency(data.netTurnover)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}