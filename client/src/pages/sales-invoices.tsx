import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { z } from "zod";
import { Plus, Edit, Trash2, FileText, IndianRupee, Users, TrendingUp, Minus, DollarSign, Eye, History, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const salesInvoiceSchema = z.object({
  retailerId: z.string().min(1, "Retailer is required"),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  totalAmount: z.number().min(0, "Total amount must be positive"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
  balanceAmount: z.number().min(0, "Balance amount cannot be negative"),
  status: z.enum(["Pending", "Partial", "Paid"]),
  notes: z.string().optional(),
});

const salesInvoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  weight: z.number().min(0.1, "Weight must be positive"),
  crates: z.number().min(0.1, "Crates must be positive"),
  rate: z.number().min(0.01, "Rate must be positive"),
  amount: z.number().min(0, "Amount must be positive"),
});

const invoiceFormSchema = z.object({
  invoice: salesInvoiceSchema,
  items: z.array(salesInvoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Sales invoice is required"),
  retailerId: z.string().min(1, "Retailer is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMode: z.enum(["Cash", "Bank", "UPI", "Cheque"]),
  bankAccountId: z.string().optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function SalesInvoiceManagement() {
  const [open, setOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        retailerId: "",
        invoiceNumber: "",
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        status: "Pending",
        notes: "",
      },
      items: [
        {
          itemId: "",
          weight: 0,
          crates: 0,
          rate: 0,
          amount: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: "",
      retailerId: "",
      amount: 0,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMode: "Cash",
      bankAccountId: "",
      transactionReference: "",
      notes: "",
    },
  });

  // Fetch data
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/sales-invoices");
      return response.json();
    },
  });

  const { data: retailers = [] } = useQuery({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers");
      return response.json();
    },
  });

  const { data: salesPayments = [] } = useQuery({
    queryKey: ["/api/sales-payments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/sales-payments");
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

  const { data: items = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/items");
      return response.json();
    },
  });

  const { data: stock = [] } = useQuery({
    queryKey: ["/api/stock"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/stock");
      return response.json();
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const paymentData = {
        ...data,
        amount: data.amount.toFixed(2), // Convert number to string for backend
        bankAccountId: data.bankAccountId || null,
      };
      const response = await authenticatedApiRequest("POST", "/api/sales-payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Sales payment has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-payments"] });
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

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authenticatedApiRequest("POST", "/api/sales-invoices", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sales invoice created",
        description: "New sales invoice has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create sales invoice",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await authenticatedApiRequest("POST", `/api/sales-invoices/${invoiceId}/mark-paid`);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invoice marked as paid",
        description: `Invoice marked as paid. Shortfall of ₹${parseFloat(data.shortfallAdded).toLocaleString("en-IN")} added to retailer balance.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setEditingInvoice(null);
    form.reset({
      invoice: {
        retailerId: "",
        invoiceNumber: "",
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        status: "Pending",
        notes: "",
      },
      items: [
        {
          itemId: "",
          weight: 0,
          crates: 0,
          rate: 0,
          amount: 0,
        },
      ],
    });
    setOpen(true);
  };

  // Helper function to get quantity based on item unit
  const getQuantityForCalculation = (itemId: string, weight: number, crates: number) => {
    const itemDetails = items.find((i: any) => i.id === itemId);
    if (!itemDetails) return weight;
    
    switch (itemDetails.unit) {
      case "kgs":
        return weight;
      case "crate":
        return crates;
      case "box":
        return weight; // Using weight for box unit for now
      default:
        return weight;
    }
  };

  const calculateItemAmount = (index: number) => {
    const itemId = form.watch(`items.${index}.itemId`);
    const weight = form.watch(`items.${index}.weight`);
    const crates = form.watch(`items.${index}.crates`);
    const rate = form.watch(`items.${index}.rate`);
    
    const quantity = getQuantityForCalculation(itemId, weight, crates);
    const amount = quantity * rate;
    form.setValue(`items.${index}.amount`, amount);
    calculateTotalAmount();
  };

  const calculateTotalAmount = () => {
    const items = form.getValues("items");
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    form.setValue("invoice.totalAmount", totalAmount);
    
    const paidAmount = form.getValues("invoice.paidAmount");
    const balanceAmount = totalAmount - paidAmount;
    form.setValue("invoice.balanceAmount", balanceAmount);
    
    // Update payment status
    if (paidAmount === 0) {
      form.setValue("invoice.status", "Pending");
    } else if (paidAmount < totalAmount) {
      form.setValue("invoice.status", "Partial");
    } else {
      form.setValue("invoice.status", "Paid");
    }
  };

  const getAvailableStock = (itemId: string) => {
    const itemStock = stock.find((s: any) => s.itemId === itemId);
    return itemStock?.totalQuantity || 0;
  };

  const getItemName = (itemId: string) => {
    const item = items.find((i: any) => i.id === itemId);
    return item?.name || "Unknown Item";
  };

  const getRetailerName = (retailerId: string) => {
    const retailer = retailers.find((r: any) => r.id === retailerId);
    return retailer?.name || "Unknown Retailer";
  };

  const onSubmit = (data: InvoiceFormData) => {
    // Convert numbers to strings for backend compatibility
    const formattedData = {
      invoice: {
        ...data.invoice,
        totalAmount: data.invoice.totalAmount.toFixed(2),
        paidAmount: data.invoice.paidAmount.toFixed(2),
        balanceAmount: data.invoice.balanceAmount.toFixed(2),
      },
      items: data.items.map(item => ({
        ...item,
        weight: item.weight.toFixed(2),
        crates: item.crates.toFixed(2),
        rate: item.rate.toFixed(2),
        amount: item.amount.toFixed(2),
      })),
    };
    createInvoiceMutation.mutate(formattedData);
  };

  const handleRecordPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    paymentForm.reset({
      invoiceId: invoice.id,
      retailerId: invoice.retailerId,
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
    setSelectedInvoice(invoice);
    setPaymentHistoryDialogOpen(true);
  };

  const handleMarkAsPaid = (invoice: any) => {
    markAsPaidMutation.mutate(invoice.id);
  };

  const onSubmitPayment = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const getInvoicePayments = (invoiceId: string) => {
    return salesPayments.filter((payment: any) => payment.invoiceId === invoiceId);
  };

  const filteredInvoices = invoices.filter((invoice: any) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRetailerName(invoice.retailerId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary stats
  const totalInvoices = invoices.length;
  const totalSales = invoices.reduce((sum: number, invoice: any) => 
    sum + parseFloat(invoice.totalAmount || "0"), 0
  );
  const pendingAmount = invoices
    .filter((invoice: any) => invoice.status !== "Paid")
    .reduce((sum: number, invoice: any) => 
      sum + parseFloat(invoice.balanceAmount || "0"), 0
    );
  const paidAmount = invoices.reduce((sum: number, invoice: any) => 
    sum + parseFloat(invoice.paidAmount || "0"), 0
  );

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-500";
      case "Partial":
        return "bg-yellow-500";
      case "Pending":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Sales Invoice Management</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage sales invoices for retailers
              </p>
            </div>
            <Button onClick={handleCreateNew} data-testid="button-add-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-muted-foreground">Sales invoices</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalSales.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Total invoice value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Received</CardTitle>
                <IndianRupee className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{paidAmount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Payments received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <Users className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{pendingAmount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Outstanding dues</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Invoices Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Sales Invoices</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Shortfall Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{getRetailerName(invoice.retailerId)}</TableCell>
                      <TableCell>₹{parseFloat(invoice.totalAmount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>₹{parseFloat(invoice.paidAmount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>₹{parseFloat(invoice.balanceAmount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-amber-600 font-medium">
                        {parseFloat(invoice.shortfallAmount || "0") > 0 
                          ? `₹${parseFloat(invoice.shortfallAmount).toLocaleString("en-IN")}` 
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordPayment(invoice)}
                            data-testid={`button-record-payment-${invoice.id}`}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPaymentHistory(invoice)}
                            data-testid={`button-payment-history-${invoice.id}`}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {invoice.status !== "Paid" && parseFloat(invoice.balanceAmount) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(invoice)}
                              data-testid={`button-mark-paid-${invoice.id}`}
                              disabled={markAsPaidMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        {searchTerm ? "No invoices found matching your search." : "No sales invoices found. Create your first invoice!"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Create Sales Invoice</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="invoice.retailerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retailer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-retailer">
                            <SelectValue placeholder="Select retailer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {retailers.map((retailer: any) => (
                            <SelectItem key={retailer.id} value={retailer.id}>
                              {retailer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice.invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated" {...field} data-testid="input-invoice-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice.invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-invoice-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Invoice Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      itemId: "",
                      weight: 0,
                      crates: 0,
                      rate: 0,
                      amount: 0,
                    })}
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-item-${index}`}>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {items.map((item: any) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} (Stock: {getAvailableStock(item.id)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.weight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (Kgs) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  calculateItemAmount(index);
                                }}
                                data-testid={`input-weight-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.crates`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crates *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                }}
                                data-testid={`input-crates-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="₹"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  calculateItemAmount(index);
                                }}
                                data-testid={`input-rate-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                readOnly
                                {...field}
                                className="bg-muted"
                                data-testid={`input-amount-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          remove(index);
                          calculateTotalAmount();
                        }}
                        disabled={fields.length === 1}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="invoice.totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          readOnly
                          {...field}
                          className="bg-muted font-medium"
                          data-testid="input-total-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice.paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || 0);
                            calculateTotalAmount();
                          }}
                          data-testid="input-paid-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice.balanceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          readOnly
                          {...field}
                          className="bg-muted"
                          data-testid="input-due-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice.status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <FormControl>
                        <Input
                          readOnly
                          {...field}
                          className="bg-muted"
                          data-testid="input-payment-status"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="invoice.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes..." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-submit"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
              {selectedInvoice && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</div>
                    <div><strong>Retailer:</strong> {getRetailerName(selectedInvoice.retailerId)}</div>
                    <div><strong>Total Amount:</strong> ₹{parseFloat(selectedInvoice.totalAmount).toLocaleString("en-IN")}</div>
                    <div><strong>Due Amount:</strong> ₹{parseFloat(selectedInvoice.balanceAmount).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              )}

              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="₹ 0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-payment-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date *</FormLabel>
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
                      <FormLabel>Payment Mode *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-mode">
                            <SelectValue />
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
              </div>

              {paymentForm.watch("paymentMode") !== "Cash" && (
                <FormField
                  control={paymentForm.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bank-account">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bankName} - {account.accountNumber?.slice(-4)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Input placeholder="Reference number..." {...field} data-testid="input-transaction-ref" />
                    </FormControl>
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
                      <Input placeholder="Additional notes..." {...field} data-testid="input-payment-notes" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-payment-cancel">
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
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryDialogOpen} onOpenChange={setPaymentHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</div>
                  <div><strong>Retailer:</strong> {getRetailerName(selectedInvoice.retailerId)}</div>
                  <div><strong>Total Amount:</strong> ₹{parseFloat(selectedInvoice.totalAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Paid Amount:</strong> ₹{parseFloat(selectedInvoice.paidAmount).toLocaleString("en-IN")}</div>
                  <div><strong>Due Amount:</strong> ₹{parseFloat(selectedInvoice.balanceAmount).toLocaleString("en-IN")}</div>
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
                    {getInvoicePayments(selectedInvoice.id).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">₹{parseFloat(payment.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.paymentMode}</Badge>
                        </TableCell>
                        <TableCell>{payment.transactionReference || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {getInvoicePayments(selectedInvoice.id).length === 0 && (
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