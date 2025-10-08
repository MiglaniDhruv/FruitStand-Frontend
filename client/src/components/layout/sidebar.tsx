import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PERMISSIONS, permissionService } from "@/lib/permissions";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { useTenant } from "@/hooks/use-tenant";
import { useTenantSlug } from "@/contexts/tenant-slug-context";
import { TenantInfo } from "@/components/tenant/tenant-info";
import { LowCreditWarningBanner } from "@/components/whatsapp/low-credit-warning-banner";
import {
  Apple,
  BarChart3,
  Book,
  Boxes,
  DollarSign,
  LogOut,
  Package,
  Receipt,
  Sprout,
  Settings,
  Store,
  TrendingDown,
  Truck,
  User,
  Users,
  Gauge,
  MessageSquare,
} from "lucide-react";

const getNavigationItems = (slug: string) => [
  {
    title: "Dashboard",
    href: `/${slug}/dashboard`,
    icon: Gauge,
    permission: PERMISSIONS.VIEW_DASHBOARD,
  },
  {
    title: "Vendors",
    href: `/${slug}/vendors`,
    icon: Truck,
    permission: PERMISSIONS.VIEW_VENDORS,
  },
  {
    title: "Retailers",
    href: `/${slug}/retailers`,
    icon: Store,
    permission: PERMISSIONS.VIEW_VENDORS, // Using VIEW_VENDORS for now, will add specific permission later
  },
  {
    title: "Items",
    href: `/${slug}/items`,
    icon: Sprout,
    permission: PERMISSIONS.VIEW_ITEMS,
  },
  {
    title: "Stock",
    href: `/${slug}/stock`,
    icon: Boxes,
    permission: PERMISSIONS.VIEW_STOCK,
  },
  {
    title: "Sales Invoices",
    href: `/${slug}/sales-invoices`,
    icon: Receipt,
    permission: PERMISSIONS.VIEW_PURCHASE_INVOICES, // Using existing permission for now
  },
  {
    title: "Purchase Invoices",
    href: `/${slug}/purchase-invoices`,
    icon: DollarSign,
    permission: PERMISSIONS.VIEW_PURCHASE_INVOICES,
  },
  {
    title: "Expenses",
    href: `/${slug}/expenses`,
    icon: TrendingDown,
    permission: PERMISSIONS.VIEW_PAYMENTS, // Using existing permission for now
  },
  {
    title: "Crates",
    href: `/${slug}/crates`,
    icon: Package,
    permission: PERMISSIONS.VIEW_STOCK, // Using existing permission for now
  },
  {
    title: "Ledgers",
    href: `/${slug}/ledgers`,
    icon: Book,
    permission: PERMISSIONS.VIEW_LEDGERS,
  },
  {
    title: "Reports",
    href: `/${slug}/reports`,
    icon: BarChart3,
    permission: PERMISSIONS.VIEW_REPORTS,
  },
    {
    title: "WhatsApp Logs",
    href: `/${slug}/whatsapp-logs`,
    icon: MessageSquare,
    permission: PERMISSIONS.VIEW_WHATSAPP_LOGS,
  },
  {
    title: "User Management",
    href: `/${slug}/users`,
    icon: Users,
    permission: PERMISSIONS.VIEW_USERS,
  },
  {
    title: "Settings",
    href: `/${slug}/settings`,
    icon: Settings,
    permission: PERMISSIONS.VIEW_SETTINGS,
  },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authService.getCurrentUser();
  const { tenant } = useTenant();

  // Get tenant slug from context
  const { slug: tenantSlug } = useTenantSlug();

  const navigationItems = getNavigationItems(tenantSlug);

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });

    // Always redirect to tenant login page
    if (tenantSlug) {
      setLocation(`/${tenantSlug}/login`);
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Apple className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {tenant?.settings?.companyName || "APMC System"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Commission Merchant
              {tenant && <span className="block">{tenant.name}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <User className="text-secondary-foreground text-sm" />
          </div>
          <div>
            <p className="text-sm font-medium">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground">
              {permissionService.getRoleInfo().label}
            </p>
          </div>
        </div>
      </div>

      {/* Tenant Info */}
      <div className="p-4 border-b border-border">
        <TenantInfo compact={true} showStatus={false} showSwitcher={false} />
      </div>

      {/* Low Credit Warning */}
      <div className="px-4">
        <LowCreditWarningBanner />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            return (
              <PermissionGuard key={item.href} permission={item.permission}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`link-${
                      item.href.replace(/^\/.*?\//, "").replace("/", "") ||
                      "dashboard"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.title}
                  </a>
                </Link>
              </PermissionGuard>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive w-full rounded-md transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
