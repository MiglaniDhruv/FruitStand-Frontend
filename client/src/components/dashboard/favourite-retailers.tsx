import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { FavouriteRetailer } from "@/types";

interface FavouriteRetailersProps {
  retailers: FavouriteRetailer[] | undefined;
  loading: boolean;
}

export default function FavouriteRetailers({ retailers, loading }: FavouriteRetailersProps) {
  // Helper function to parse currency strings for display
  const parseCurrency = (currencyStr: string): number => {
    if (!currencyStr) return 0;
    // Remove ₹ symbol, commas, and parse as float
    const cleanStr = currencyStr.replace(/[₹,]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            Favourite Retailers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Udhaar Balance</TableHead>
                  <TableHead>Shortfall Balance</TableHead>
                  <TableHead>Crates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!retailers || retailers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            Favourite Retailers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm mb-2">No favourite retailers yet.</p>
            <p className="text-xs">Mark retailers as favourites from the Retailers page to see them here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          Favourite Retailers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Udhaar Balance</TableHead>
                <TableHead>Shortfall Balance</TableHead>
                <TableHead>Crates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retailers.map((retailer) => (
                <TableRow key={retailer.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{retailer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {retailer.phone || "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`${parseCurrency(retailer.udhaaarBalance) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {retailer.udhaaarBalance}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`${parseCurrency(retailer.shortfallBalance) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {retailer.shortfallBalance}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{retailer.crateBalance}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}