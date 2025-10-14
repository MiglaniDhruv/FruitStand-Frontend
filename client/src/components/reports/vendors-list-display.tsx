import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';
import type { VendorsListData } from '@/types';

interface VendorsListDisplayProps {
  data: VendorsListData | undefined;
  loading: boolean;
}

const formatCurrency = (value: string | number) => 
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function VendorsListDisplay({ data, loading }: VendorsListDisplayProps) {
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
        No vendors found
      </div>
    );
  }

  // Sort entries by balance descending (highest payable first)
  const sortedEntries = [...data.entries].sort((a, b) => 
    Number(b.balance) - Number(a.balance)
  );

  const averagePayable = Number(data.totalPayable) / data.entries.length;

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Total Vendors</div>
            <div className="text-2xl font-bold">{data.entries.length}</div>
          </CardContent>
        </Card>
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Average Payable</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(averagePayable)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Amount Payable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry, index) => {
              const balance = Number(entry.balance);
              const isHighPayable = balance > 50000;
              
              return (
                <TableRow 
                  key={index} 
                  className={`hover:bg-muted/50 ${isHighPayable ? 'bg-red-50 hover:bg-red-100' : ''}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {entry.vendorName}
                      {isHighPayable && (
                        <Badge variant="destructive" className="text-xs">
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
                    <span className="font-semibold text-red-600">
                      {formatCurrency(entry.balance)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Total Payable Summary */}
      <Card className="p-4 border-red-200 bg-red-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold text-red-800">
            Total Amount Payable to Vendors
          </CardTitle>
          <Truck className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(data.totalPayable)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}