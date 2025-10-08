import Sidebar from "@/components/layout/sidebar";
import { useTenant } from "@/hooks/use-tenant";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { tenant, isLoading, error } = useTenant();
  const isError = !!error;

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">Error Loading Dashboard</h2>
            <p className="text-gray-600 max-w-md">
              {error instanceof Error ? error.message : "Failed to load dashboard. Please try again."}
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

        {/* Empty Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-muted-foreground">Dashboard Content Removed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                All dashboard components have been cleared.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
