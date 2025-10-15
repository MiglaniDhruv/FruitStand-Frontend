import React, { ReactNode, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './sidebar';
import Footer from './footer';
import { BottomNav } from './bottom-nav';
import SalesInvoiceModal from '@/components/forms/sales-invoice-modal';
import PurchaseInvoiceModal from '@/components/forms/purchase-invoice-modal';
import RetailerPaymentForm from '@/components/forms/retailer-payment-form';
import VendorPaymentForm from '@/components/forms/vendor-payment-form';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);
  const [showPurchaseInvoiceModal, setShowPurchaseInvoiceModal] = useState(false);
  const [showRetailerPaymentModal, setShowRetailerPaymentModal] = useState(false);
  const [showVendorPaymentModal, setShowVendorPaymentModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hapticLight, hapticMedium } = useHapticFeedback();
  const isMobile = useIsMobile();
  const [location, navigate] = useLocation();

  // Swipe-to-go-back gesture (only on mobile, from left edge)
  const { ref: swipeBackRef } = useSwipeGesture({
    onSwipeRight: () => {
      // Only trigger if we're not on the dashboard (home page)
      if (location !== '/' && !location.endsWith('/dashboard')) {
        hapticMedium();
        window.history.back();
      }
    },
    enabled: isMobile,
    threshold: 100, // Slightly higher threshold to avoid accidental triggers
    maxVerticalMovement: 75, // Allow more vertical movement for this gesture
  });

  const handleSkipToMain = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
    }
  };

  const handleSkipToNav = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const navigation = document.getElementById('navigation');
    if (navigation) {
      navigation.focus();
    }
  };

  const handleCreateSalesInvoiceClick = () => {
    hapticLight();
    setShowSalesInvoiceModal(true);
  };

  const handleCreatePurchaseInvoiceClick = () => {
    hapticLight();
    setShowPurchaseInvoiceModal(true);
  };

  const handleRecordRetailerPaymentClick = () => {
    hapticLight();
    setShowRetailerPaymentModal(true);
  };

  const handleRecordVendorPaymentClick = () => {
    hapticLight();
    setShowVendorPaymentModal(true);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Skip Navigation Links - Accessible for keyboard users */}
      <a 
        href="#main-content" 
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <a 
        href="#navigation" 
        onClick={handleSkipToNav}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to navigation
      </a>
      
      <AppSidebar />
      <SidebarInset id="main-content" tabIndex={-1} ref={swipeBackRef as React.RefObject<HTMLDivElement>}>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" data-sidebar="trigger" />
        </header>
        <div className="flex-1 flex flex-col overflow-auto" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + var(--bottom-nav-h, 0px) + 8px)' }}>
          {children}
        </div>
        <Footer />
        <BottomNav
          onCreateSalesInvoiceClick={handleCreateSalesInvoiceClick}
          onCreatePurchaseInvoiceClick={handleCreatePurchaseInvoiceClick}
          onRecordRetailerPaymentClick={handleRecordRetailerPaymentClick}
          onRecordVendorPaymentClick={handleRecordVendorPaymentClick}
        />
        {isMobile && (
          <>
            <SalesInvoiceModal
              open={showSalesInvoiceModal}
              onOpenChange={setShowSalesInvoiceModal}
            />
            <PurchaseInvoiceModal
              open={showPurchaseInvoiceModal}
              onOpenChange={setShowPurchaseInvoiceModal}
            />
            <RetailerPaymentForm
              open={showRetailerPaymentModal}
              onOpenChange={setShowRetailerPaymentModal}
              retailerId={undefined}
            />
            <VendorPaymentForm
              open={showVendorPaymentModal}
              onOpenChange={setShowVendorPaymentModal}
              vendorId={undefined}
            />
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}