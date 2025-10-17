import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { CreditCard, FileText, User, Package, Trash2, Loader2 } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PERMISSIONS } from "@/lib/permissions";
import { PermissionGuard } from "@/components/ui/permission-guard";

interface InvoiceDetailsViewProps {
  invoice: any;
  payments?: any[];
  onAddPayment?: () => void;
  isPurchaseInvoice?: boolean;
}

export default function InvoiceDetailsView({ invoice, payments, onAddPayment, isPurchaseInvoice = false }: InvoiceDetailsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-status-paid/10 text-status-paid border-status-paid/20";
      case "Pending":
      case "Unpaid":
        return "bg-status-pending/10 text-status-pending border-status-pending/20";
      case "Partial":
      case "Partially Paid":
        return "bg-status-partial/10 text-status-partial border-status-partial/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case "Cash":
        return "bg-success/10 text-success border-success/20";
      case "Bank":
        return "bg-info/10 text-info border-info/20";
      case "UPI":
        return "bg-info/10 text-info border-info/20";
      case "Cheque":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const endpoint = isPurchaseInvoice ? `/api/payments/${paymentId}` : `/api/sales-payments/${paymentId}`;
      const response = await authenticatedApiRequest('DELETE', endpoint);
      // Handle 204 No Content responses safely
      if (response.status === 204 || response.status === 200) {
        try {
          return await response.json();
        } catch {
          return {}; // Return empty object for 204 responses with no body
        }
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment deleted',
        description: 'Payment record has been deleted successfully',
      });
      // Invalidate only relevant queries based on invoice type
      if (isPurchaseInvoice) {
        queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/purchase-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/purchase-invoices', invoice.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/sales-payments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales-invoices', invoice.id] });
      }
      // Close dialog and clear state
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete payment record',
        variant: 'destructive',
      });
    },
  });
  
  // Handler functions
  const handleDeletePayment = (payment: any) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };
  
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Crates</TableHead>
                    <TableHead>Boxes</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>{safeParseFloat(item.weight).toFixed(2)}</TableCell>
                      <TableCell>{Math.round(safeParseFloat(item.crates))}</TableCell>
                      <TableCell>{Math.round(safeParseFloat(item.boxes))}</TableCell>
                      <TableCell>₹{safeParseFloat(item.rate).toFixed(2)}</TableCell>
                      <TableCell>₹{safeParseFloat(item.amount).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={5} className="font-semibold">
                      {isPurchaseInvoice ? 'Total Selling:' : 'Total Amount:'}
                    </TableCell>
                    <TableCell className="font-semibold">₹{getTotalSellingAmount().toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
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
                <p className="text-lg font-bold text-destructive">₹{safeParseFloat(invoice.totalExpense).toLocaleString('en-IN')}</p>
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
          <div className={`grid grid-cols-1 ${isPurchaseInvoice ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6`}>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold text-foreground">₹{getTotalAmount().toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-lg font-bold text-success">₹{safeParseFloat(invoice.paidAmount).toLocaleString('en-IN')}</p>
            </div>
            {isPurchaseInvoice ? (
              <div className="text-center p-4 bg-status-pending/10 border border-status-pending/20 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Balance Amount</p>
                <p className="text-lg font-bold text-status-pending">₹{safeParseFloat(invoice.balanceAmount).toLocaleString('en-IN')}</p>
              </div>
            ) : (
              <>
                <div className="text-center p-4 bg-status-pending/10 border border-status-pending/20 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Udhaar</p>
                  <p className="text-xs text-muted-foreground mb-1">Amount retailer needs to pay</p>
                  <p className="text-lg font-bold text-status-pending">₹{safeParseFloat(invoice.udhaaarAmount).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Shortfall</p>
                  <p className="text-xs text-muted-foreground mb-1">Deficit when marked as Paid</p>
                  <p className="text-lg font-bold text-warning">₹{safeParseFloat(invoice.shortfallAmount).toLocaleString('en-IN')}</p>
                </div>
              </>
            )}
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
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        <PermissionGuard permission={PERMISSIONS.DELETE_PAYMENTS}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayment(payment)}
                            disabled={deletePaymentMutation.isPending}
                            className="text-destructive"
                          >
                            {deletePaymentMutation.isPending && paymentToDelete?.id === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record of ₹{paymentToDelete?.amount ? safeParseFloat(paymentToDelete.amount).toLocaleString('en-IN') : '0'}? This will recalculate the invoice status and update balances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePaymentMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}