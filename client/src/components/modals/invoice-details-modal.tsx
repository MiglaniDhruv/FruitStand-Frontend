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
import { CreditCard, FileText, User, Package } from "lucide-react";
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
                    <p className="text-sm text-muted-foreground">Item: {invoice.item}</p>
                    <p className="text-sm text-muted-foreground">Weight: {parseFloat(invoice.weight).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Rate: ₹{parseFloat(invoice.rate).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Item & Amount Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Transaction Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Item Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-medium">Item:</span> {invoice.item}</p>
                      <p className="text-sm"><span className="font-medium">Weight:</span> {parseFloat(invoice.weight).toFixed(2)}</p>
                      <p className="text-sm"><span className="font-medium">Rate:</span> ₹{parseFloat(invoice.rate).toFixed(2)}</p>
                      <p className="text-sm"><span className="font-medium">Amount:</span> ₹{parseFloat(invoice.amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Expense Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span>₹{parseFloat(invoice.commission).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labour:</span>
                        <span>₹{parseFloat(invoice.labour).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Truck Freight:</span>
                        <span>₹{parseFloat(invoice.truckFreight).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Crate Freight:</span>
                        <span>₹{parseFloat(invoice.crateFreight).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Post Expenses:</span>
                        <span>₹{parseFloat(invoice.postExpenses).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Draft Expenses:</span>
                        <span>₹{parseFloat(invoice.draftExpenses).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vatav:</span>
                        <span>₹{parseFloat(invoice.vatav).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Expenses:</span>
                        <span>₹{parseFloat(invoice.otherExpenses).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Advance:</span>
                        <span>₹{parseFloat(invoice.advance).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Expense:</span>
                        <span>₹{parseFloat(invoice.totalExpense).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Selling</p>
                    <p className="text-lg font-bold text-foreground">₹{parseFloat(invoice.totalSelling).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-bold text-chart-1">₹{parseFloat(invoice.totalExpense).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Less Expenses</p>
                    <p className="text-lg font-bold text-foreground">₹{parseFloat(invoice.totalLessExpenses).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                    <p className="text-xl font-bold text-primary">₹{parseFloat(invoice.netAmount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Summary</CardTitle>
                  {invoice.status !== "Paid" && (
                    <Button 
                      onClick={() => setShowPaymentForm(true)}
                      className="flex items-center space-x-2"
                      data-testid="button-add-payment"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Add Payment</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold text-foreground">₹{parseFloat(invoice.netAmount).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center p-4 bg-chart-2/10 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-bold text-chart-2">₹{parseFloat(invoice.paidAmount).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center p-4 bg-chart-1/10 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Balance Amount</p>
                    <p className="text-lg font-bold text-chart-1">₹{parseFloat(invoice.balanceAmount).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Payment History */}
                {payments && payments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Payment History</h4>
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
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                            <TableCell className="font-medium">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge className={getPaymentModeColor(payment.paymentMode)} variant="secondary">
                                {payment.paymentMode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.chequeNumber && `Cheque: ${payment.chequeNumber}`}
                              {payment.upiReference && `UPI: ${payment.upiReference}`}
                              {payment.bankAccount?.name && `Bank: ${payment.bankAccount.name}`}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
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