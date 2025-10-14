import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { ExpensesSummaryData } from '@/types';

interface ExpensesSummaryDisplayProps {
  data: ExpensesSummaryData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const colorPalette = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-orange-500',
];

export default function ExpensesSummaryDisplay({ data, loading }: ExpensesSummaryDisplayProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
        <div className="h-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  // No data state
  if (!data || !data.entries || data.entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No expenses data available for the selected period
      </div>
    );
  }

  // Sort entries by amount descending (highest first)
  const sortedEntries = [...data.entries].sort((a, b) => 
    Number(b.amount) - Number(a.amount)
  );

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

      {/* Expenses by Category Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry, index) => {
              const percentage = Number(entry.percentage);
              const colorClass = colorPalette[index % colorPalette.length];
              
              return (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                      {entry.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colorClass}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium min-w-[3rem]">
                        {Number(entry.percentage).toFixed(2)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Visual Breakdown */}
      <Card className="p-4">
        <CardHeader className="space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex w-full h-4 rounded-full overflow-hidden">
            {sortedEntries.map((entry, index) => {
              const percentage = Number(entry.percentage);
              const colorClass = colorPalette[index % colorPalette.length];
              
              return (
                <div
                  key={index}
                  className={colorClass}
                  style={{ width: `${percentage}%` }}
                  title={`${entry.category}: ${percentage.toFixed(2)}%`}
                ></div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Total Expenses Summary */}
      <Card className="p-4 border-red-200 bg-red-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold text-red-800">
            Total Expenses
          </CardTitle>
          <TrendingDown className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(data.totalExpenses)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}