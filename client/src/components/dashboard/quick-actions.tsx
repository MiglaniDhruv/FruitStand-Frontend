import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, UserPlus, Boxes } from "lucide-react";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";

export default function QuickActions() {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              className="w-full justify-center"
              onClick={() => setShowInvoiceModal(true)}
              data-testid="button-new-purchase-invoice"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Invoice
            </Button>
            <Button variant="secondary" className="w-full justify-center" data-testid="button-record-payment">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Button variant="secondary" className="w-full justify-center" data-testid="button-add-vendor">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
            <Button variant="secondary" className="w-full justify-center" data-testid="button-update-stock">
              <Boxes className="mr-2 h-4 w-4" />
              Update Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      <PurchaseInvoiceModal 
        open={showInvoiceModal} 
        onOpenChange={setShowInvoiceModal} 
      />
    </>
  );
}
