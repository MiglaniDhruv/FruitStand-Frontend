import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { TopRetailerByUdhaar } from "@/types";

interface TopUdhaarRetailersProps {
  retailers: TopRetailerByUdhaar[] | undefined;
  loading: boolean;
}

export default function TopUdhaarRetailers({ retailers, loading }: TopUdhaarRetailersProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Top Retailers by Udhaar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Retailer Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Udhaar Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (!retailers || retailers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Top Retailers by Udhaar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No retailers with outstanding udhaar</p>
        </CardContent>
      </Card>
    );
  }

  // Robust currency parsing helper
  const parseCurrencyToNumber = (currencyString: string | null | undefined): number => {
    if (!currencyString) return 0;
    // Strip all non-numeric characters except dot and minus
    const cleanedString = currencyString.replace(/[^0-9.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
  };

  // Calculate total udhaar sum for display at bottom
  const totalUdhaar = retailers.reduce((sum, retailer) => {
    return sum + parseCurrencyToNumber(retailer.udhaaarBalance);
  }, 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Top Retailers by Udhaar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Retailer Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Udhaar Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retailers.map((retailer, index) => (
                <TableRow 
                  key={retailer.id} 
                  className={`hover:bg-muted/50 ${index === 0 ? 'bg-amber-50' : ''}`}
                >
                  <TableCell className="font-medium">
                    <span className={`${index === 0 ? 'font-bold text-amber-600' : ''}`}>
                      #{index + 1}
                    </span>
                  </TableCell>
                  <TableCell className={`${index === 0 ? 'font-bold' : ''}`}>
                    {retailer.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {retailer.phone || "-"}
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    {retailer.udhaaarBalance}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Total sum row */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Total Udhaar (Top {retailers.length} Retailers):
              </span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(totalUdhaar)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}