import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { RecentSale } from "@/types";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecentSalesTableProps {
  sales: RecentSale[] | undefined;
  loading: boolean;
}

export default function RecentSalesTable({ sales, loading }: RecentSalesTableProps) {
  const isMobile = useIsMobile();
  // Helper to check if value looks already formatted
  const looksFormatted = (value: string): boolean => {
    return value.includes('₹') || value.includes(',');
  };

  // Helper to format currency consistently
  const formatINRCurrency = (value: string | number): string => {
    if (typeof value === 'string' && looksFormatted(value)) {
      return value; // Already formatted
    }
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) return '₹0.00';
    return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Retailer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-3 sm:h-4 w-16 sm:w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3 sm:h-4 w-16 sm:w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3 sm:h-4 w-20 sm:w-24" /></TableCell>
                  <TableCell><Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /></TableCell>
                  <TableCell><Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 sm:py-6">No recent sales found</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const MobileCardView = () => (
    <div className="space-y-3">
      {sales.map((sale) => (
        <Card key={sale.id} className="hover:bg-muted/50 cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="font-medium">{sale.invoiceNumber}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(sale.invoiceDate), "MMM dd, yyyy")}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Retailer</div>
              <div className="text-sm">{sale.retailerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-sm font-medium">{formatINRCurrency(sale.totalAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant={getStatusBadgeVariant(sale.status)}>
                {sale.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TableView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sm:text-sm">Invoice Number</TableHead>
            <TableHead className="text-xs sm:text-sm">Date</TableHead>
            <TableHead className="text-xs sm:text-sm">Retailer</TableHead>
            <TableHead className="text-xs sm:text-sm">Amount</TableHead>
            <TableHead className="text-xs sm:text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell className="text-xs sm:text-sm font-medium">{sale.invoiceNumber}</TableCell>
              <TableCell className="text-xs sm:text-sm text-muted-foreground">
                {format(new Date(sale.invoiceDate), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">{sale.retailerName}</TableCell>
              <TableCell className="text-xs sm:text-sm font-medium">{formatINRCurrency(sale.totalAmount)}</TableCell>
              <TableCell className="text-xs sm:text-sm">
                <Badge variant={getStatusBadgeVariant(sale.status)}>
                  {sale.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-5 w-5" />
          Recent Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {isMobile ? <MobileCardView /> : <TableView />}
      </CardContent>
    </Card>
  );
}