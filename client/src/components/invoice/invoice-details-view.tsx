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
import { PERMISSIONS } from "@/lib/permissions";
import { PermissionGuard } from "@/components/ui/permission-guard";

interface InvoiceDetailsViewProps {
  invoice: any;
  payments?: any[];
  onAddPayment?: () => void;
}

export default function InvoiceDetailsView({ invoice, payments, onAddPayment }: InvoiceDetailsViewProps) {
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

  // Check if this is a purchase invoice (has commission/labour fields)
  const isPurchaseInvoice = invoice.commission !== undefined || invoice.labour !== undefined;
  
  // Helper function to safely parse float values and avoid NaN
  const safeParseFloat = (value: any, fallback: number = 0): number => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  };
  
  // Get the correct total amount based on invoice type
  const getTotalAmount = () => {
    if (isPurchaseInvoice) {
      return safeParseFloat(invoice.netAmount);
    } else {
      // For sales invoices, use totalAmount
      return safeParseFloat(invoice.totalAmount);
    }
  };
  
  // Get the correct selling/total label and amount
  const getTotalSellingAmount = () => {
    if (isPurchaseInvoice) {
      return safeParseFloat(invoice.totalSelling);
    } else {
      // For sales invoices, use totalAmount
      return safeParseFloat(invoice.totalAmount);
    }
  };

  return (
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
              <h4 className="font-medium text-foreground mb-2">
                {isPurchaseInvoice ? 'Vendor Details' : 'Retailer Details'}
              </h4>
              <p className="text-sm text-muted-foreground">
                Name: {isPurchaseInvoice ? invoice.vendor?.name : invoice.retailer?.name}
              </p>
              {(isPurchaseInvoice ? invoice.vendor?.contactPerson : invoice.retailer?.contactPerson) && (
                <p className="text-sm text-muted-foreground">
                  Contact: {isPurchaseInvoice ? invoice.vendor.contactPerson : invoice.retailer.contactPerson}
                </p>
              )}
              {(isPurchaseInvoice ? invoice.vendor?.phone : invoice.retailer?.phone) && (
                <p className="text-sm text-muted-foreground">
                  Phone: {isPurchaseInvoice ? invoice.vendor.phone : invoice.retailer.phone}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Invoice Details</h4>
              <p className="text-sm text-muted-foreground">Date: {format(new Date(invoice.invoiceDate), "PPP")}</p>
              <p className="text-sm text-muted-foreground">Total Items: {invoice.items?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Invoice Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.items && invoice.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Rate (₹)</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.item}</TableCell>
                    <TableCell>{safeParseFloat(item.weight).toFixed(2)}</TableCell>
                    <TableCell>₹{safeParseFloat(item.rate).toFixed(2)}</TableCell>
                    <TableCell>₹{safeParseFloat(item.amount).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-semibold">
                    {isPurchaseInvoice ? 'Total Selling:' : 'Total Amount:'}
                  </TableCell>
                  <TableCell className="font-semibold">₹{getTotalSellingAmount().toLocaleString('en-IN')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No items found for this invoice</p>
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown (only for purchase invoices) */}
      {isPurchaseInvoice && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Commission:</span>
                  <span>₹{safeParseFloat(invoice.commission).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labour:</span>
                  <span>₹{safeParseFloat(invoice.labour).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Truck Freight:</span>
                  <span>₹{safeParseFloat(invoice.truckFreight).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Crate Freight:</span>
                  <span>₹{safeParseFloat(invoice.crateFreight).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Post Expenses:</span>
                  <span>₹{safeParseFloat(invoice.postExpenses).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draft Expenses:</span>
                  <span>₹{safeParseFloat(invoice.draftExpenses).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Vatav:</span>
                  <span>₹{safeParseFloat(invoice.vatav).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Expenses:</span>
                  <span>₹{safeParseFloat(invoice.otherExpenses).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advance:</span>
                  <span>₹{safeParseFloat(invoice.advance).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Expense:</span>
              <span>₹{safeParseFloat(invoice.totalExpense).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isPurchaseInvoice ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                {isPurchaseInvoice ? 'Total Selling' : 'Total Amount'}
              </p>
              <p className="text-lg font-bold text-foreground">₹{getTotalSellingAmount().toLocaleString('en-IN')}</p>
            </div>
            {isPurchaseInvoice && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-chart-1">₹{safeParseFloat(invoice.totalExpense).toLocaleString('en-IN')}</p>
              </div>
            )}
            {isPurchaseInvoice && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Less Expenses</p>
                <p className="text-lg font-bold text-foreground">₹{safeParseFloat(invoice.totalLessExpenses).toLocaleString('en-IN')}</p>
              </div>
            )}
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
              <p className="text-xl font-bold text-primary">₹{getTotalAmount().toLocaleString('en-IN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Summary</CardTitle>
            {onAddPayment && invoice.status !== "Paid" && (
              <PermissionGuard permission={PERMISSIONS.CREATE_PAYMENTS}>
                <Button 
                  onClick={onAddPayment}
                  className="flex items-center space-x-2"
                  data-testid="button-add-payment"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Add Payment</span>
                </Button>
              </PermissionGuard>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold text-foreground">₹{getTotalAmount().toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center p-4 bg-chart-2/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-lg font-bold text-chart-2">₹{safeParseFloat(invoice.paidAmount).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center p-4 bg-chart-1/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Balance Amount</p>
              <p className="text-lg font-bold text-chart-1">₹{safeParseFloat(invoice.balanceAmount).toLocaleString('en-IN')}</p>
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
                      <TableCell className="font-medium">₹{safeParseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
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
  );
}