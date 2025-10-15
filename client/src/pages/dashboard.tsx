import AppLayout from "@/components/layout/app-layout";
import { useTenant } from "@/hooks/use-tenant";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { DashboardKPIs } from "@/types";
import DashboardCards from "@/components/dashboard/dashboard-cards";
import RecentPurchasesTable from "@/components/dashboard/recent-purchases-table";
import RecentSalesTable from "@/components/dashboard/recent-sales-table";
import FavouriteRetailers from "@/components/dashboard/favourite-retailers";
import FavouriteVendors from "@/components/dashboard/favourite-vendors";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { tenant, isLoading, error } = useTenant();
  const isError = !!error;

  // Fetch dashboard KPIs data
  const {
    data: kpis,
    isLoading: dashboardLoading,
    isError: dashboardIsError,
    error: dashboardError
  } = useQuery<DashboardKPIs>({
    queryKey: ['/api/dashboard/kpis', tenant?.id],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/dashboard/kpis');
      return response.json();
    },
    enabled: !!tenant?.id && !isError, // Only fetch if tenant is loaded and no tenant error
  });

  if (isLoading || dashboardLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Header skeleton */}
            <Skeleton className="h-8 w-64" />
            
            {/* KPI cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} variant="stat" />
              ))}
            </div>
            
            {/* Tables skeleton */}
            <div className="space-y-6">
              <SkeletonTable rows={5} columns={6} />
              <SkeletonTable rows={4} columns={5} />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Only tenant errors trigger full-page error
  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="text-center space-y-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-red-600">Error Loading Tenant</h1>
            <p className="text-gray-600 max-w-md">
              {error instanceof Error 
                ? error.message 
                : "Failed to load tenant data. Please try again."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground heading-page">
                  Dashboard{tenant ? ` - ${tenant.name}` : ""}
                </h1>
                {tenant && !tenant.isActive && (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Inactive</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Overview of {tenant?.name || "your"} commission merchant operations
              </p>
            </div>
          </div>
        </header>
        
        <Separator className="my-0" />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* KPI Cards Section */}
          <section aria-label="Key Performance Indicators">
            <h2 className="sr-only">Key Performance Indicators</h2>
            {dashboardIsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Failed to load KPI data. Please refresh to try again.</p>
              </div>
            ) : (
              <DashboardCards kpis={kpis} loading={dashboardLoading} />
            )}
          </section>
          
          <Separator className="my-6 sm:my-8" />

          {/* Tables Grid Section */}
          <section aria-label="Recent Transactions">
            <h2 className="sr-only">Recent Transactions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboardIsError ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">Failed to load purchase data.</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">Failed to load sales data.</p>
                  </div>
                </>
              ) : (
                <>
                  <RecentPurchasesTable purchases={kpis?.recentPurchases} loading={dashboardLoading} />
                  <RecentSalesTable sales={kpis?.recentSales} loading={dashboardLoading} />
                </>
              )}
            </div>
          </section>

          <Separator className="my-6 sm:my-8" />

          {/* Top Retailers Section */}
          <section aria-label="Favourite Retailers">
            <h2 className="sr-only">Favourite Retailers</h2>
            {dashboardIsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Failed to load favourite retailers.</p>
              </div>
            ) : (
              <FavouriteRetailers retailers={kpis?.favouriteRetailers} loading={dashboardLoading} />
            )}
          </section>

          <Separator className="my-6 sm:my-8" />

          {/* Favourite Vendors Section */}
          <section aria-label="Favourite Vendors">
            <h2 className="sr-only">Favourite Vendors</h2>
            {dashboardIsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Failed to load favourite vendors.</p>
              </div>
            ) : (
              <FavouriteVendors vendors={kpis?.favouriteVendors} loading={dashboardLoading} />
            )}
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
