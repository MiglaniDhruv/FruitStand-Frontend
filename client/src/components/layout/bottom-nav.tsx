import { Home, FileText, Receipt, DollarSign, Wallet } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTenantSlug } from '@/contexts/tenant-slug-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { PERMISSIONS } from '@shared/permissions';

interface BottomNavProps {
  onCreateSalesInvoiceClick: () => void;
  onCreatePurchaseInvoiceClick: () => void;
  onRecordRetailerPaymentClick: () => void;
  onRecordVendorPaymentClick: () => void;
}

export function BottomNav({ 
  onCreateSalesInvoiceClick, 
  onCreatePurchaseInvoiceClick,
  onRecordRetailerPaymentClick,
  onRecordVendorPaymentClick
}: BottomNavProps) {
  const isMobile = useIsMobile();
  const { slug } = useTenantSlug();
  const [location, navigate] = useLocation();
  const { hapticMedium } = useHapticFeedback();

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  const handleNavigation = (path: string) => {
    hapticMedium();
    navigate(path);
  };

  const isActive = (path: string) => {
    return location === `/${slug}${path}`;
  };

  // Guard against undefined slug
  if (!slug) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)] animate-slide-up"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {/* Dashboard */}
        <Button
          variant="ghost"
          onClick={() => handleNavigation(`/${slug}/dashboard`)}
          className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[56px]"
          aria-current={isActive('/dashboard') ? 'page' : undefined}
        >
          <Home className={`h-4 w-4 ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
            Home
          </span>
        </Button>

        {/* Sales Invoice */}
        <PermissionGuard permission={PERMISSIONS.CREATE_SALES_INVOICES}>
          <Button
            variant="ghost"
            onClick={onCreateSalesInvoiceClick}
            className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[56px]"
            aria-label="Create Sales Invoice"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sales</span>
          </Button>
        </PermissionGuard>

        {/* Purchase Invoice */}
        <PermissionGuard permission={PERMISSIONS.CREATE_PURCHASE_INVOICES}>
          <Button
            variant="ghost"
            onClick={onCreatePurchaseInvoiceClick}
            className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[56px]"
            aria-label="Create Purchase Invoice"
          >
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Purchase</span>
          </Button>
        </PermissionGuard>

        {/* Retailer Payment */}
        <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
          <Button
            variant="ghost"
            onClick={onRecordRetailerPaymentClick}
            className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[56px]"
            aria-label="Record Retailer Payment"
          >
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Retailer</span>
          </Button>
        </PermissionGuard>

        {/* Vendor Payment */}
        <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
          <Button
            variant="ghost"
            onClick={onRecordVendorPaymentClick}
            className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[56px]"
            aria-label="Record Vendor Payment"
          >
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Vendor</span>
          </Button>
        </PermissionGuard>
      </div>
    </motion.nav>
  );
}
