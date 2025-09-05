import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Apple,
  BarChart3,
  Book,
  Boxes,
  CreditCard,
  DollarSign,
  LogOut,
  Sprout,
  Settings,
  Truck,
  User,
  Users,
  Gauge,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Gauge,
  },
  {
    title: "Vendors",
    href: "/vendors",
    icon: Truck,
  },
  {
    title: "Items",
    href: "/items",
    icon: Sprout,
  },
  {
    title: "Stock",
    href: "/stock",
    icon: Boxes,
  },
  {
    title: "Purchase Invoices",
    href: "/purchase-invoices",
    icon: DollarSign,
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Ledgers",
    href: "/ledgers",
    icon: Book,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

const adminItems = [
  {
    title: "User Management",
    href: "/users",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    setLocation("/login");
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
              APMC System
            </h1>
            <p className="text-sm text-muted-foreground">Commission Merchant</p>
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
            <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  data-testid={`link-${item.href.replace("/", "") || "dashboard"}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.title}
                </a>
              </Link>
            );
          })}
        </div>

        {currentUser?.role === "Admin" && (
          <div className="mt-8 pt-4 border-t border-border">
            <div className="space-y-2">
              {adminItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      )}
                      data-testid={`link-${item.href.replace("/", "")}`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.title}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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
