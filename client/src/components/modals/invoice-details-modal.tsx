import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { CreditCard, FileText, User } from "lucide-react";
import PaymentForm from "@/components/forms/payment-form";

interface InvoiceDetailsModalProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvoiceDetailsModal({ invoice, open, onOpenChange }: InvoiceDetailsModalProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: payments } = useQuery<any[]>({
    queryKey: ["/api/payments/invoice", invoice?.id],
    enabled: !!invoice?.id,
  });

  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
      case "Unpaid":
        return "bg-chart-1/10 text-chart-1";
      case "Partially Paid":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case "Cash":
        return "bg-chart-2/10 text-chart-2";
      case "Bank":
        return "bg-chart-3/10 text-chart-3";
      case "UPI":
        return "bg-chart-4/10 text-chart-4";
      case "Cheque":
        return "bg-chart-1/10 text-chart-1";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Invoice Details - {invoice.invoiceNumber}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Invoice Information</span>
                  </CardTitle>
                  <Badge className={getStatusColor(invoice.status)} variant="secondary">
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Vendor Details</h4>
                    <p className="text-sm text-muted-foreground">Name: {invoice.vendor.name}</p>
                    {invoice.vendor.contactPerson && (
                      <p className="text-sm text-muted-foreground">Contact: {invoice.vendor.contactPerson}</p>
                    )}
                    {invoice.vendor.phone && (
                      <p className="text-sm text-muted-foreground">Phone: {invoice.vendor.phone}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Invoice Details</h4>
                    <p className="text-sm text-muted-foreground">Date: {format(new Date(invoice.invoiceDate), "PPP")}</p>
                    <p className="text-sm text-muted-foreground">Commission Rate: {invoice.commissionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commodity</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items?.map((item: any, index: number) => (
                      <TableRow key={index} data-testid={`invoice-item-${index}`}>
                        <TableCell className="font-medium">{item.commodity?.name || "Unknown"}</TableCell>
                        <TableCell>{item.commodity?.quality || "Unknown"}</TableCell>
                        <TableCell>{parseFloat(item.quantity).toFixed(2)}</TableCell>
                        <TableCell>₹{parseFloat(item.rate).toFixed(2)}</TableCell>
                        <TableCell>₹{parseFloat(item.amount).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Amount:</span>
                    <span className="text-foreground">₹{parseFloat(invoice.grossAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission ({invoice.commissionRate}%):</span>
                    <span className="text-foreground">₹{parseFloat(invoice.commissionAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Freight Charges:</span>
                    <span className="text-foreground">₹{parseFloat(invoice.freightCharges || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor Charges:</span>
                    <span className="text-foreground">₹{parseFloat(invoice.laborCharges || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-base">
                    <span className="text-foreground">Net Payable:</span>
                    <span className="text-foreground">₹{parseFloat(invoice.netPayable).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Amount:</span>
                    <span className="text-chart-2">₹{parseFloat(invoice.paidAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Balance Amount:</span>
                    <span className={parseFloat(invoice.balanceAmount) > 0 ? "text-chart-1" : "text-chart-2"}>
                      ₹{parseFloat(invoice.balanceAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            {payments && payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id} data-testid={`payment-history-${payment.id}`}>
                          <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge className={getPaymentModeColor(payment.paymentMode)} variant="secondary">
                              {payment.paymentMode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.chequeNumber || payment.upiReference || 
                             (payment.bankAccount?.accountNumber ? `****${payment.bankAccount.accountNumber.slice(-4)}` : "-")}
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-close-invoice-details"
              >
                Close
              </Button>
              {parseFloat(invoice.balanceAmount) > 0 && (
                <Button 
                  onClick={() => setShowPaymentForm(true)}
                  data-testid="button-record-payment-from-invoice"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>
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