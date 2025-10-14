import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { ShortfallReportData } from '@/types';

interface ShortfallReportDisplayProps {
  data: ShortfallReportData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ShortfallReportDisplay({ data, loading }: ShortfallReportDisplayProps) {
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
        No retailers with shortfall balance
      </div>
    );
  }

  // Sort entries by shortfall balance descending (highest first)
  const sortedEntries = [...data.entries].sort((a, b) => 
    Number(b.shortfallBalance) - Number(a.shortfallBalance)
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

      {/* Shortfall Entries Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Retailer Name</TableHead>
              <TableHead className="text-right">Shortfall Balance</TableHead>
              <TableHead className="text-right">Last Transaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry, index) => {
              const shortfallAmount = Number(entry.shortfallBalance);
              const isHighShortfall = shortfallAmount > 10000;
              
              return (
                <TableRow 
                  key={index} 
                  className={`hover:bg-muted/50 ${isHighShortfall ? 'bg-red-50 hover:bg-red-100' : ''}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {entry.retailerName}
                      {isHighShortfall && (
                        <Badge variant="destructive" className="text-xs">
                          High
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(entry.shortfallBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.lastTransactionDate ? (
                      format(new Date(entry.lastTransactionDate), 'dd MMM yyyy')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Total Shortfall Summary */}
      <Card className="p-4 border-destructive/20 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold text-destructive">
            Total Shortfall Amount
          </CardTitle>
          <AlertCircle className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(data.totalShortfall)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}