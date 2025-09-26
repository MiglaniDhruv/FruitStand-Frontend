import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationOptions, PaginatedResult, InvoiceWithItems } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Eye, CreditCard, History } from "lucide-react";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";
import InvoiceDetailsModal from "@/components/modals/invoice-details-modal";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";

// Payment form schema
const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMode: z.enum(["Cash", "Bank", "UPI", "Cheque"], {
    required_error: "Payment mode is required",
  }),
  bankAccountId: z.string().optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PurchaseInvoices() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "invoiceDate",
    sortOrder: "desc"
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Payment management state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Payment form
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: "",
      vendorId: "",
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMode: "Cash",
      bankAccountId: "",
      transactionReference: "",
      notes: "",
    },
  });

  // Fetch data
  const { data: invoicesResult, isLoading, isError, error } = useQuery<PaginatedResult<InvoiceWithItems>>({
    queryKey: ["/api/purchase-invoices", paginationOptions, statusFilter],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      if (statusFilter !== "all") params.append('status', statusFilter);
      
      const response = await authenticatedApiRequest("GET", `/api/purchase-invoices?${params.toString()}`);
      return response.json();
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/payments");
      return response.json();
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPaginationOptions(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setPaginationOptions(prev => ({ ...prev, search, page: 1 }));
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  // Payment creation mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const paymentData = {
        ...data,
        amount: data.amount.toString(), // Convert number to string for backend
        bankAccountId: data.bankAccountId || null,
      };
      const response = await authenticatedApiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Purchase payment has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      setPaymentDialogOpen(false);
      paymentForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getBankAccountName = (bankAccountId: string) => {
    const account = bankAccounts.find((account: any) => account.id === bankAccountId);
    return account?.accountName || "Unknown Bank";
  };

  const getInvoicePayments = (invoiceId: string) => {
    return payments.filter((payment: any) => payment.invoiceId === invoiceId);
  };

  const handleRecordPayment = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
    paymentForm.reset({
      invoiceId: invoice.id,
      vendorId: invoice.vendorId,
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMode: "Cash",
      bankAccountId: "",
      transactionReference: "",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleViewPaymentHistory = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentHistoryDialogOpen(true);
  };

  const onSubmitPayment = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "vendor.name",
      header: "Vendor",
      cell: (value: string) => value,
    },
    {
      accessorKey: "invoiceDate",
      header: "Date",
      cell: (value: string) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: (value: any[]) => `${value?.length || 0} items`,
    },
    {
      accessorKey: "netAmount",
      header: "Net Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "paidAmount",
      header: "Paid Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value: string) => (
        <Badge className={getStatusColor(value)} variant="secondary">
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: (value: string, invoice: any) => (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewInvoice(invoice)}
            data-testid={`button-view-invoice-${invoice.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {invoice.status !== "Paid" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRecordPayment(invoice)}
              data-testid={`button-record-payment-${invoice.id}`}
              title="Record Payment"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewPaymentHistory(invoice)}
            data-testid={`button-payment-history-${invoice.id}`}
            title="View Payment History"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Extract invoices and metadata from paginated result
  const invoices = invoicesResult?.data || [];
  const paginationMetadata = invoicesResult?.pagination;

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

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Purchase Invoices</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : "Failed to load purchase invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Purchase Invoices</h2>
              <p className="text-sm text-muted-foreground">
                Manage purchase invoices and track payments
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Invoices</CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>

                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={invoices}
                columns={columns}
                paginationMetadata={paginationMetadata}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isLoading}
                enableRowSelection={true}
                rowKey="id"
              />
            </CardContent>
          </Card>
        </main>
      </div>

      <PurchaseInvoiceModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />

      <InvoiceDetailsModal
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      />

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          
          {selectedInvoiceForPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div><strong>Invoice:</strong> {selectedInvoiceForPayment.invoiceNumber}</div>
                  <div><strong>Vendor:</strong> {selectedInvoiceForPayment.vendor.name}</div>
                  <div><strong>Total Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.netAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Paid Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.paidAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Balance Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.balanceAmount).toLocaleString("en-IN")}</div>
                </div>
              </div>

              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
                  <FormField
                    control={paymentForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter payment amount"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-payment-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-payment-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-mode">
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(paymentForm.watch("paymentMode") === "Bank" || 
                    paymentForm.watch("paymentMode") === "UPI" || 
                    paymentForm.watch("paymentMode") === "Cheque") && (
                    <FormField
                      control={paymentForm.control}
                      name="bankAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Account</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bank-account">
                                <SelectValue placeholder="Select bank account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bankAccounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.accountName} - {account.accountNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={paymentForm.control}
                    name="transactionReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Reference</FormLabel>
                        <FormControl>
                          <Input placeholder="Reference number/ID" {...field} data-testid="input-transaction-reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes" {...field} data-testid="input-payment-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentDialogOpen(false)}
                      data-testid="button-payment-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPaymentMutation.isPending}
                      data-testid="button-payment-submit"
                    >
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryDialogOpen} onOpenChange={setPaymentHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          
          {selectedInvoiceForPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div><strong>Invoice:</strong> {selectedInvoiceForPayment.invoiceNumber}</div>
                  <div><strong>Vendor:</strong> {selectedInvoiceForPayment.vendor.name}</div>
                  <div><strong>Total Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.netAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Paid Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.paidAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Balance Amount:</strong> ₹{parseFloat(selectedInvoiceForPayment.balanceAmount).toLocaleString("en-IN")}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Payment Records</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getInvoicePayments(selectedInvoiceForPayment.id).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">₹{parseFloat(payment.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.paymentMode}</Badge>
                        </TableCell>
                        <TableCell>{payment.transactionReference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {getInvoicePayments(selectedInvoiceForPayment.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No payments recorded for this invoice
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setPaymentHistoryDialogOpen(false)} data-testid="button-history-close">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
