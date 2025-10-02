import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import InvoiceDetailsView from "@/components/invoice/invoice-details-view";
import PaymentForm from "@/components/forms/payment-form";
import { authenticatedApiRequest } from "@/lib/auth";

interface InvoiceDetailsModalProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvoiceDetailsModal({ invoice, open, onOpenChange }: InvoiceDetailsModalProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Determine if this is a purchase or sales invoice and fetch appropriate payments
  const isPurchaseInvoice = invoice?.commission !== undefined || invoice?.labour !== undefined;
  
  // Fetch all payments and filter by invoiceId
  const { data: allPayments } = useQuery<any[]>({
    queryKey: isPurchaseInvoice ? ["/api/payments"] : ["/api/sales-payments"],
    queryFn: async () => {
      const endpoint = isPurchaseInvoice ? "/api/payments" : "/api/sales-payments";
      const response = await authenticatedApiRequest('GET', endpoint);
      return response.json();
    },
    enabled: !!invoice?.id,
  });

  // Filter payments for this specific invoice
  const payments = allPayments?.filter((payment: any) => payment.invoiceId === invoice?.id) || [];

  if (!invoice) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Invoice Details - {invoice.invoiceNumber}</span>
            </DialogTitle>
          </DialogHeader>

          <InvoiceDetailsView
            invoice={invoice}
            payments={payments}
            onAddPayment={() => setShowPaymentForm(true)}
          />
        </DialogContent>
      </Dialog>

      <PaymentForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        preSelectedInvoiceId={invoice?.id}
      />
    </>
  );
}