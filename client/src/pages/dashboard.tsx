import Sidebar from "@/components/layout/sidebar";
import { useTenant } from "@/hooks/use-tenant";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { DashboardKPIs } from "@/types";
import DashboardCards from "@/components/dashboard/dashboard-cards";
import RecentPurchasesTable from "@/components/dashboard/recent-purchases-table";
import RecentSalesTable from "@/components/dashboard/recent-sales-table";
import FavouriteRetailers from "@/components/dashboard/favourite-retailers";

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
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only tenant errors trigger full-page error
  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">Error Loading Tenant</h2>
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
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  Dashboard{tenant ? ` - ${tenant.name}` : ""}
                </h2>
                {tenant && !tenant.isActive && (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Inactive</span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Overview of {tenant?.name || "your"} commission merchant operations
              </p>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
          {/* KPI Cards Section */}
          {dashboardIsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Failed to load KPI data. Please refresh to try again.</p>
            </div>
          ) : (
            <DashboardCards kpis={kpis} loading={dashboardLoading} />
          )}

          {/* Tables Grid Section */}
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

          {/* Top Retailers Section */}
          {dashboardIsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Failed to load favourite retailers data.</p>
            </div>
          ) : (
            <FavouriteRetailers retailers={kpis?.favouriteRetailers} loading={dashboardLoading} />
          )}
        </main>
      </div>
    </div>
  );
}
