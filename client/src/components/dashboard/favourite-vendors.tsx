import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { FavouriteVendor } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface FavouriteVendorsProps {
  vendors: FavouriteVendor[] | undefined;
  loading: boolean;
}

// Helper function to parse currency strings
const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  // Remove ₹ symbol, commas, and parse as float
  const cleanStr = currencyString.replace(/[₹,]/g, "");
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

function FavouriteVendors({ vendors, loading }: FavouriteVendorsProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Favourite Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vendors || vendors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Favourite Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">No favourite vendors yet.</p>
            <p className="text-sm">
              Mark vendors as favourites from the Vendors page to see them here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MobileCardView = () => (
    <div className="space-y-4">
      {vendors.map((vendor) => {
        const balance = parseCurrency(vendor.balance);
        return (
          <Card key={vendor.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {vendor.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Phone</p>
                  <p className="font-medium">{vendor.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Crates</p>
                  <Badge variant="secondary">{vendor.crateBalance}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Balance</p>
                  <p
                    className={`font-medium ${
                      balance > 0 ? "text-red-600" : ""
                    }`}
                  >
                    {vendor.balance}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const TableView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Crates</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => {
          const balance = parseCurrency(vendor.balance);
          return (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell>{vendor.phone || "-"}</TableCell>
              <TableCell
                className={balance > 0 ? "text-red-600 font-medium" : ""}
              >
                {vendor.balance}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{vendor.crateBalance}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Favourite Vendors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? <MobileCardView /> : <TableView />}
      </CardContent>
    </Card>
  );
}

export default FavouriteVendors;
