import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { File } from "lucide-react";
import { Link } from "wouter";

export default function RecentTransactions() {
  const { data: invoices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
      case "Unpaid":
        return "bg-chart-1/10 text-chart-1";
      case "Partially Paid":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Purchase Invoices</CardTitle>
          <Link href="/purchase-invoices">
            <Button variant="ghost" size="sm" data-testid="button-view-all-invoices">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))
          ) : invoices && invoices.length > 0 ? (
            invoices.slice(0, 5).map((invoice: any) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                data-testid={`transaction-${invoice.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <File className="text-secondary-foreground h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">{invoice.vendor.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">₹{parseFloat(invoice.netPayable).toLocaleString('en-IN')}</p>
                  <Badge className={getStatusColor(invoice.status)} variant="secondary">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
