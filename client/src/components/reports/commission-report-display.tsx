import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { CommissionReportData } from '@/types';

interface CommissionReportDisplayProps {
  data: CommissionReportData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CommissionReportDisplay({ data, loading }: CommissionReportDisplayProps) {
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
        No commission data available for the selected period
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

      {/* Commission Entries Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.entries.map((entry, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                <TableCell className="font-medium">{entry.invoiceNumber}</TableCell>
                <TableCell>
                  {format(new Date(entry.invoiceDate), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>{entry.vendorName}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.totalAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {entry.commissionRate}%
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(entry.commissionAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total Commission Summary */}
      <Card className="p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            Total Commission Earned
          </CardTitle>
          <DollarSign className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(data.totalCommission)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}