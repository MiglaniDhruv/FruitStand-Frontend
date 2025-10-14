import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { ProfitLossReportData } from '@/types';

interface ProfitLossReportDisplayProps {
  data: ProfitLossReportData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProfitLossReportDisplay({ data, loading }: ProfitLossReportDisplayProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-muted animate-pulse rounded"></div>
          <div className="h-40 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="h-32 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No profit & loss data available for the selected period
      </div>
    );
  }

  const totalCosts = Number(data.costs) + Number(data.expenses);
  const netProfitNum = Number(data.netProfit);
  const isProfit = netProfitNum >= 0;

  return (
    <div className="space-y-6">
      {/* Date Range Display */}
      {data.fromDate && data.toDate && (
        <div className="flex justify-center">
          <Badge variant="outline">
            Period: {format(new Date(data.fromDate), 'dd MMM yyyy')} to {format(new Date(data.toDate), 'dd MMM yyyy')}
          </Badge>
        </div>
      )}

      {/* Revenue and Costs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Section */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold">Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(data.revenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Costs Section */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold">Costs</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Purchases</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(data.costs)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Expenses</span>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(data.expenses)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Costs</span>
                <span className="text-xl font-bold text-red-600">
                  {formatCurrency(totalCosts)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary Section */}
      <Card className="p-4 border-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Profit Summary</CardTitle>
          {isProfit ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Gross Profit (Revenue - Purchases)
            </span>
            <span className="text-lg font-semibold">
              {formatCurrency(data.grossProfit)}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-medium">
                Net Profit (Gross Profit - Expenses)
              </span>
              <span className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}