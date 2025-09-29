import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import KPICards from "@/components/dashboard/kpi-cards";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import QuickActions from "@/components/dashboard/quick-actions";
import LowStockAlert from "@/components/dashboard/low-stock-alert";
import RecentPayments from "@/components/dashboard/recent-payments";
import { useTenant } from "@/hooks/use-tenant";
import { Search, Bell, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardKPIs } from "@/types";

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ["/api/dashboard/kpis"],
  });
  
  const { tenant, isLoading: tenantLoading } = useTenant();

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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 w-64"
                  data-testid="input-search"
                />
              </div>
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          <KPICards kpis={kpis} loading={kpisLoading} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <RecentTransactions />
            </div>
            
            <div className="space-y-6">
              <QuickActions />
              <LowStockAlert />
              <RecentPayments />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
