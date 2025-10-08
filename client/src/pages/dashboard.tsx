import Sidebar from "@/components/layout/sidebar";
import { useTenant } from "@/hooks/use-tenant";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { tenant } = useTenant();

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
