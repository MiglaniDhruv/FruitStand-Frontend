import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart } from "lucide-react";
import { RecentPurchase } from "@/types";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/empty-state";

interface RecentPurchasesTableProps {
  purchases: RecentPurchase[] | undefined;
  loading: boolean;
}

export default function RecentPurchasesTable({ purchases, loading }: RecentPurchasesTableProps) {
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
        <CardHeader size="default" className="py-5 sm:py-7">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-5 w-5" />
            Recent Purchases
          </CardTitle>
        </CardHeader>
        <CardContent size="default" className="pb-5 sm:pb-7">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
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

  if (!purchases || purchases.length === 0) {
    return (
      <Card>
        <CardHeader size="default" className="py-5 sm:py-7">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-5 w-5" />
            Recent Purchases
          </CardTitle>
        </CardHeader>
        <CardContent size="default" className="pb-5 sm:pb-7">
          <EmptyState 
            icon={ShoppingCart}
            title="No recent purchases"
            description="Purchase invoices will appear here once you start creating them."
          />
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
    <div className="space-y-4">
      {purchases.map((purchase) => (
        <Card key={purchase.id} hover className="hover:bg-muted/50 cursor-pointer transition-colors duration-150">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="font-medium">{purchase.invoiceNumber}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(purchase.invoiceDate), "MMM dd, yyyy")}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Vendor</div>
              <div className="text-sm">{purchase.vendorName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-sm font-medium">{formatINRCurrency(purchase.netAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant={getStatusBadgeVariant(purchase.status)}>
                {purchase.status}
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
            <TableHead className="text-xs sm:text-sm">Vendor</TableHead>
            <TableHead className="text-xs sm:text-sm">Amount</TableHead>
            <TableHead className="text-xs sm:text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id} className="hover:bg-muted/50 cursor-pointer transition-colors duration-150">
              <TableCell className="text-xs sm:text-sm font-medium">{purchase.invoiceNumber}</TableCell>
              <TableCell className="text-xs sm:text-sm text-muted-foreground">
                {format(new Date(purchase.invoiceDate), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">{purchase.vendorName}</TableCell>
              <TableCell className="text-xs sm:text-sm font-medium">{formatINRCurrency(purchase.netAmount)}</TableCell>
              <TableCell className="text-xs sm:text-sm">
                <Badge variant={getStatusBadgeVariant(purchase.status)}>
                  {purchase.status}
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
      <CardHeader size="default" className="py-5 sm:py-7">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ShoppingCart className="h-5 w-5" />
          Recent Purchases
        </CardTitle>
      </CardHeader>
      <CardContent size="default" className="pb-5 sm:pb-7">
        {isMobile ? <MobileCardView /> : <TableView />}
      </CardContent>
    </Card>
  );
}