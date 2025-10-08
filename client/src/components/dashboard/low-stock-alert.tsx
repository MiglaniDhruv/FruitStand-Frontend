import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";

export default function LowStockAlert() {
  const { data: stock, isLoading } = useQuery<any[]>({
    queryKey: ["/api/stock"],
  });

  if (isLoading) return null;

  // Filter items with low stock (less than 20 units)
  const lowStockItems = stock?.filter((item: any) => {
    const totalQty = parseFloat(item.quantityInKgs) + parseFloat(item.quantityInCrates);
    return totalQty < 20 && totalQty > 0;
  }) || [];

  if (lowStockItems.length === 0) return null;

  return (
    <ErrorBoundary 
      resetKeys={stock ? [stock.length, stock[0]?.id, stock[stock.length - 1]?.id].filter(Boolean) : []}
      fallback={({ error, resetError }) => (
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load stock alerts</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>An error occurred while loading stock alerts.</p>
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
        <CardTitle>Low Stock Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowStockItems.slice(0, 3).map((item: any) => {
            const remainingQty = item.commodity.unit === "Kgs" 
              ? parseFloat(item.quantityInKgs)
              : parseFloat(item.quantityInCrates);
            
            return (
              <Alert key={item.id} variant="destructive" data-testid={`alert-low-stock-${item.id}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{item.commodity.name} {item.commodity.quality}</div>
                  <div className="text-sm">{remainingQty} {item.commodity.unit} remaining</div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}
