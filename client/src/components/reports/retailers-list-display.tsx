import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store } from 'lucide-react';
import type { RetailersListData } from '@/types';

interface RetailersListDisplayProps {
  data: RetailersListData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RetailersListDisplay({ data, loading }: RetailersListDisplayProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
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
        No retailers found
      </div>
    );
  }

  // Sort entries by udhaaarBalance descending (highest receivable first)
  const sortedEntries = [...data.entries].sort((a, b) => 
    Number(b.udhaaarBalance) - Number(a.udhaaarBalance)
  );

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Total Retailers</div>
            <div className="text-2xl font-bold">{data.entries.length}</div>
          </CardContent>
        </Card>
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Total Receivable</div>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(data.totalReceivable)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retailers Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Retailer Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Amount Receivable (Udhaar)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry, index) => {
              const balance = Number(entry.udhaaarBalance);
              const isHighReceivable = balance > 50000;
              
              return (
                <TableRow 
                  key={index} 
                  className={`hover:bg-muted/50 ${isHighReceivable ? 'bg-success/5 hover:bg-success/10' : ''}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {entry.retailerName}
                      {isHighReceivable && (
                        <Badge variant="success" className="text-xs">
                          High
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.phone || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell 
                    className="max-w-xs truncate" 
                    title={entry.address || ''}
                  >
                    {entry.address || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-success">
                      {formatCurrency(entry.udhaaarBalance)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Total Receivable Summary */}
      <Card className="p-4 border-success/20 bg-success/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold text-success">
            Total Amount Receivable from Retailers
          </CardTitle>
          <Store className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-success">
            {formatCurrency(data.totalReceivable)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}