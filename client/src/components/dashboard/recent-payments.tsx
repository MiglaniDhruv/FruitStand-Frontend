import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function RecentPayments() {
  const { data: payments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  return (
    <ErrorBoundary 
      resetKeys={payments ? [payments.length, payments[0]?.id, payments[payments.length - 1]?.id].filter(Boolean) : []}
      fallback={({ error, resetError }) => (
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load recent payments</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>An error occurred while loading recent payments.</p>
                <Button onClick={resetError} size="sm">
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    >
      <Card>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))
          ) : payments && payments.length > 0 ? (
            payments.slice(0, 3).map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between"
                data-testid={`payment-${payment.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-chart-2/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-chart-2 h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{payment.vendor?.name || "Unknown Vendor"}</p>
                    <p className="text-sm text-muted-foreground">{payment.paymentMode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(payment.paymentDate || payment.createdAt), "MMM dd")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent payments</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}
