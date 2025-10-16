import { useEffect, useRef } from "react";
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  Landmark,
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
    title: "Bank Accounts",
    href: `/${slug}/bank-accounts`,
    icon: Landmark,
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
    permission: PERMISSIONS.VIEW_LEDGERS,
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

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authService.getCurrentUser();
  const { tenant } = useTenant();
  const { state, isHovering } = useSidebar();

  // Get tenant slug from context
  const { slug: tenantSlug } = useTenantSlug();

  const navigationItems = getNavigationItems(tenantSlug);

  // Ref to track the sidebar content element
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const SCROLL_POSITION_KEY = 'sidebar-scroll-position';

  // Save scroll position to sessionStorage when scrolling
  useEffect(() => {
    const element = sidebarContentRef.current;
    if (!element) return;

    const handleScroll = () => {
      sessionStorage.setItem(SCROLL_POSITION_KEY, element.scrollTop.toString());
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position on mount and prevent reset on navigation
  useEffect(() => {
    const element = sidebarContentRef.current;
    if (!element) return;

    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
      element.scrollTop = parseInt(savedPosition, 10);
    }
  }, []);

  // Scroll to active item when hovering over collapsed sidebar
  useEffect(() => {
    if (!isHovering || state !== "collapsed") return;

    const element = sidebarContentRef.current;
    if (!element) return;

    // Find the active navigation item
    const activeLink = element.querySelector('[data-active="true"]');
    if (activeLink) {
      // Scroll the active item into view with some padding
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHovering, state]);

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });

    // Clear scroll position on logout
    sessionStorage.removeItem(SCROLL_POSITION_KEY);

    // Always redirect to tenant login page
    if (tenantSlug) {
      setLocation(`/${tenantSlug}/login`);
    } else {
      setLocation("/login");
    }
  };

  return (
    <Sidebar collapsible="icon" side="left" id="navigation" tabIndex={-1}>
      {/* Logo and Brand */}
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center space-x-3 p-2 group-data-[collapsible=icon]:p-1">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Apple className="text-primary-foreground text-lg" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-data-[hovering=true]:block">
            <h1 className="text-lg-fluid font-semibold text-foreground">
              Mandify
            </h1>
            {/* <p className="text-sm-fluid text-muted-foreground">
              Commission Merchant
              {tenant && <span className="block">{tenant.name}</span>}
            </p> */}
          </div>
        </div>

        {/* User Info */}
        <div className="p-2 group-data-[collapsible=icon]:p-1 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="text-secondary-foreground text-sm" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-data-[hovering=true]:block">
              <p className="text-sm-fluid font-medium">{currentUser?.name}</p>
              <p className="text-xs-fluid text-muted-foreground">
                {permissionService.getRoleInfo().label}
              </p>
            </div>
          </div>
        </div>

        {/* Tenant Info */}
        {/* <div className="p-4 border-b border-border group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-data-[hovering=true]:block">
          <TenantInfo compact={true} showStatus={false} showSwitcher={false} />
        </div> */}

        {/* Low Credit Warning */}
        <div className="px-4 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-data-[hovering=true]:block">
          <LowCreditWarningBanner />
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent ref={sidebarContentRef}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + '/') || location.startsWith(item.href + '?');
                const isCollapsed = state === "collapsed";
                return (
                  <PermissionGuard key={item.href} permission={item.permission}>
                    <SidebarMenuItem>
                      <Link href={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          tooltip={item.title} 
                          isActive={isActive}
                          {...(isCollapsed && { "aria-label": `Navigate to ${item.title}` })}
                        >
                          <a
                            data-testid={`link-${
                              item.href.replace(/^\/.*?\//, "").replace("/", "") ||
                              "dashboard"
                            }`}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  </PermissionGuard>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Toggle and Logout */}
      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarTrigger 
              className="w-full" 
              {...(state === "collapsed" && { "aria-label": "Toggle sidebar navigation" })}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout} 
              tooltip="Logout"
              {...(state === "collapsed" && { "aria-label": "Logout from application" })}
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
