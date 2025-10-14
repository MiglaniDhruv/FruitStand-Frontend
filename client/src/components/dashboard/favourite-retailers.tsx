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
import { useIsMobile } from "@/hooks/use-mobile";

interface FavouriteRetailersProps {
  retailers: FavouriteRetailer[] | undefined;
  loading: boolean;
}

export default function FavouriteRetailers({ retailers, loading }: FavouriteRetailersProps) {
  const isMobile = useIsMobile();
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
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            Favourite Retailers
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
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
                    <TableCell><Skeleton className="h-3 sm:h-4 w-20 sm:w-24" /></TableCell>
                    <TableCell><Skeleton className="h-3 sm:h-4 w-16 sm:w-20" /></TableCell>
                    <TableCell><Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /></TableCell>
                    <TableCell><Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 sm:h-6 w-10 sm:w-12" /></TableCell>
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
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            Favourite Retailers
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Star className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-xs sm:text-sm mb-2">No favourite retailers yet.</p>
            <p className="text-[10px] sm:text-xs">Mark retailers as favourites from the Retailers page to see them here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MobileCardView = () => (
    <div className="space-y-3">
      {retailers.map((retailer) => (
        <Card key={retailer.id} className="hover:bg-muted/50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="font-medium text-base">{retailer.name}</div>
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm">{retailer.phone || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Crates</div>
                <Badge variant="secondary">{retailer.crateBalance}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Udhaar Balance</div>
                <div className={`text-sm ${parseCurrency(retailer.udhaaarBalance) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {retailer.udhaaarBalance}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Shortfall Balance</div>
                <div className={`text-sm ${parseCurrency(retailer.shortfallBalance) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {retailer.shortfallBalance}
                </div>
              </div>
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
            <TableHead className="text-xs sm:text-sm">Name</TableHead>
            <TableHead className="text-xs sm:text-sm">Phone</TableHead>
            <TableHead className="text-xs sm:text-sm">Udhaar Balance</TableHead>
            <TableHead className="text-xs sm:text-sm">Shortfall Balance</TableHead>
            <TableHead className="text-xs sm:text-sm">Crates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {retailers.map((retailer) => (
            <TableRow key={retailer.id} className="hover:bg-muted/50">
              <TableCell className="text-xs sm:text-sm font-medium">{retailer.name}</TableCell>
              <TableCell className="text-xs sm:text-sm text-muted-foreground">
                {retailer.phone || "-"}
              </TableCell>
              <TableCell className="text-xs sm:text-sm">
                <span className={`${parseCurrency(retailer.udhaaarBalance) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {retailer.udhaaarBalance}
                </span>
              </TableCell>
              <TableCell className="text-xs sm:text-sm">
                <span className={`${parseCurrency(retailer.shortfallBalance) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {retailer.shortfallBalance}
                </span>
              </TableCell>
              <TableCell className="text-xs sm:text-sm">
                <Badge variant="secondary">{retailer.crateBalance}</Badge>
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
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          Favourite Retailers
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {isMobile ? <MobileCardView /> : <TableView />}
      </CardContent>
    </Card>
  );
}