import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@shared/permissions";
import SalesInvoiceModal from "@/components/forms/sales-invoice-modal";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";
import RetailerPaymentForm from "@/components/forms/retailer-payment-form";
import VendorPaymentForm from "@/components/forms/vendor-payment-form";
import { FileText, Receipt, DollarSign, Wallet } from "lucide-react";

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  // State management for modals
  const [salesInvoiceOpen, setSalesInvoiceOpen] = useState<boolean>(false);
  const [purchaseInvoiceOpen, setPurchaseInvoiceOpen] = useState<boolean>(false);
  const [retailerPaymentOpen, setRetailerPaymentOpen] = useState<boolean>(false);
  const [vendorPaymentOpen, setVendorPaymentOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const setVar = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty("--footer-h", `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener("resize", setVar);
    return () => { ro.disconnect(); window.removeEventListener("resize", setVar); };
  }, []);

  return (
    <>
      {/* Footer container */}
      <div 
        ref={ref}
        className="sticky bottom-0 mt-auto bg-card border-t border-border shadow-lg z-30"
        data-testid="footer-quick-actions"
      >
        {/* Inner container for buttons */}
        <div className="w-full px-6 py-3">
          {/* Buttons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {/* Sales Invoice button */}
            <PermissionGuard permission={PERMISSIONS.CREATE_SALES_INVOICES}>
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setSalesInvoiceOpen(true)}
                data-testid="button-quick-sales-invoice"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Sales Invoice</span>
                <span className="sm:hidden">Sales</span>
              </Button>
            </PermissionGuard>

            {/* Purchase Invoice button */}
            <PermissionGuard permission={PERMISSIONS.CREATE_PURCHASE_INVOICES}>
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setPurchaseInvoiceOpen(true)}
                data-testid="button-quick-purchase-invoice"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Purchase Invoice</span>
                <span className="sm:hidden">Purchase</span>
              </Button>
            </PermissionGuard>

            {/* Retailer Payment button */}
            <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setRetailerPaymentOpen(true)}
                data-testid="button-quick-retailer-payment"
              >
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Retailer Payment</span>
                <span className="sm:hidden">Retailer</span>
              </Button>
            </PermissionGuard>

            {/* Vendor Payment button */}
            <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setVendorPaymentOpen(true)}
                data-testid="button-quick-vendor-payment"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Vendor Payment</span>
                <span className="sm:hidden">Vendor</span>
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Modal components */}
      <SalesInvoiceModal 
        open={salesInvoiceOpen} 
        onOpenChange={setSalesInvoiceOpen} 
      />
      <PurchaseInvoiceModal 
        open={purchaseInvoiceOpen} 
        onOpenChange={setPurchaseInvoiceOpen} 
      />
      <RetailerPaymentForm 
        open={retailerPaymentOpen} 
        onOpenChange={setRetailerPaymentOpen} 
        retailerId={undefined} 
      />
      <VendorPaymentForm 
        open={vendorPaymentOpen} 
        onOpenChange={setVendorPaymentOpen} 
        vendorId={undefined} 
      />
    </>
  );
}