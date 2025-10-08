import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SalesInvoiceWithDetails,
} from "@shared/schema";
import { buildPaginationParams } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { logEventHandlerError, logMutationError, logFormError, logCalculationError, logNavigationError } from "@/lib/error-logger";
import { z } from "zod";
import {
  Plus,
  FileText,
  IndianRupee,
  Users,
  TrendingUp,
  Minus,
  Eye,
  Trash2,
  Package,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { useTenantSlug } from "@/contexts/tenant-slug-context";

const salesInvoiceSchema = z.object({
  retailerId: z.string().min(1, "Retailer is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  totalAmount: z.number().min(0, "Total amount must be positive"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
  balanceAmount: z.number().min(0, "Balance amount cannot be negative"),
  status: z.enum(["Pending", "Partial", "Paid"]),
  notes: z.string().optional(),
});

const salesInvoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  weight: z.number().min(0, "Weight must be non-negative"),
  crates: z.number().min(0, "Crates must be non-negative"),
  boxes: z.number().min(0, "Boxes must be non-negative"),
  rate: z.number().min(0, "Rate must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
});

const crateTransactionSchema = z.object({
  enabled: z.boolean().default(false),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
}).refine((data) => {
  // If enabled, quantity is required
  if (data.enabled && !data.quantity) {
    return false;
  }
  return true;
}, {
  message: "Quantity is required when crate transaction is enabled",
  path: ["quantity"],
});

const invoiceFormSchema = z.object({
  invoice: salesInvoiceSchema,
  items: z
    .array(salesInvoiceItemSchema)
    .min(1, "At least one item is required"),
  crateTransaction: crateTransactionSchema.optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

export default function SalesInvoiceManagement() {
  const [open, setOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>(
    {
      page: 1,
      limit: 10,
      search: "",
      sortBy: "invoiceDate",
      sortOrder: "desc",
    }
  );
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/sales-invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Sales invoice has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
    },
    onError: (error) => {
      logMutationError(error, 'deleteSalesInvoice');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    try {
      if (!id) {
        throw new Error('Invalid invoice ID');
      }
      
      if (confirm("Are you sure you want to delete this sales invoice? This action cannot be undone.")) {
        await deleteInvoiceMutation.mutateAsync(id);
      }
    } catch (error) {
      logEventHandlerError(error, 'handleDelete', { invoiceId: id });
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const [, setLocation] = useLocation();
  const { slug } = useTenantSlug();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        retailerId: "",
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
          boxes: 0,
          rate: 0,
          amount: 0,
        },
      ],
      crateTransaction: {
        enabled: false,
        quantity: undefined,
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Queries
  const {
    data: invoicesResult,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedResult<SalesInvoiceWithDetails>>({
    queryKey: ["/api/sales-invoices", paginationOptions, statusFilter],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (paginationOptions.page || 1).toString(),
        limit: (paginationOptions.limit || 10).toString(),
        search: paginationOptions.search || "",
        sortBy: paginationOptions.sortBy || "invoiceDate",
        sortOrder: paginationOptions.sortOrder || "desc",
      });

      // Only add status filter if it's not "all"
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await authenticatedApiRequest(
        "GET",
        `/api/sales-invoices?${params.toString()}`
      );
      return response.json();
    },
  });

  const { data: retailersResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const params = buildPaginationParams({
        limit: 100,
        page: 1,
        search: "",
        sortBy: "name",
        sortOrder: "asc",
      });
      const response = await authenticatedApiRequest(
        "GET",
        `/api/retailers?${params.toString()}`
      );
      return response.json();
    },
  });

  const { data: itemsResult, isLoading: itemsLoading, error: itemsError } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const params = buildPaginationParams({
        limit: 100,
        page: 1,
        search: "",
        sortBy: "name",
        sortOrder: "asc",
      });
      const response = await authenticatedApiRequest(
        "GET",
        `/api/items?${params.toString()}`
      );
      return response.json();
    },
  });

  const { data: stockResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/stock"],
    queryFn: async () => {
      const response = await authenticatedApiRequest(
        "GET",
        "/api/stock?limit=1000"
      );
      return response.json();
    },
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPaginationOptions((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setPaginationOptions((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions((prev) => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder as "asc" | "desc",
    }));
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPaginationOptions((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const handleCreateNew = () => {
    try {
      setEditingInvoice(null);
      form.reset({
        invoice: {
          retailerId: "",
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
            boxes: 0,
            rate: 0,
            amount: 0,
          },
        ],
        crateTransaction: {
          enabled: false,
          quantity: undefined,
        },
      });
      setOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateNew');
      toast({
        title: "Error",
        description: "Failed to open new invoice form",
        variant: "destructive",
      });
    }
  };

  const getQuantityForCalculation = (item: any) => {
    return item.weight || item.crates + item.boxes || 1;
  };

  const calculateItemAmount = (rate: number, item: any) => {
    try {
      if (!item) {
        throw new Error('Invalid item data for calculation');
      }
      if (isNaN(rate) || rate < 0) {
        throw new Error('Invalid rate for calculation');
      }
      const quantity = getQuantityForCalculation(item);
      return rate * quantity;
    } catch (error) {
      logCalculationError(error, 'calculateItemAmount', { rate, item });
      return 0; // Safe default
    }
  };

  const calculateTotalAmount = () => {
    try {
      const items = form.watch("items");
      if (!Array.isArray(items)) {
        throw new Error('Invalid items array for total calculation');
      }
      return items.reduce((total, item) => {
        return total + calculateItemAmount(item.rate, item);
      }, 0);
    } catch (error) {
      logCalculationError(error, 'calculateTotalAmount');
      return 0; // Safe default
    }
  };

  const getAvailableStock = (itemId: string) => {
    const stock = stockResult?.data?.find((s: any) => s.itemId === itemId);
    return stock?.availableQuantity || 0;
  };

  const getItemName = (itemId: string) => {
    const item = itemsResult?.data?.find((i: any) => i.id === itemId);
    return item?.name || "Unknown Item";
  };

  const getRetailerName = (retailerId: string) => {
    const retailer = retailersResult?.data?.find(
      (r: any) => r.id === retailerId
    );
    return retailer?.name || "Unknown Retailer";
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      // Validate form data
      if (!data || !data.invoice) {
        throw new Error('Invalid form data');
      }
      
      if (!data.invoice.retailerId) {
        throw new Error('Retailer is required');
      }
      
      if (!data.items || data.items.length === 0) {
        throw new Error('At least one item is required');
      }
      
      // Calculate totals with error handling
      const totalAmount = calculateTotalAmount();
      if (totalAmount <= 0) {
        throw new Error('Invalid total amount calculated');
      }
      
      const invoiceData: any = {
        invoice: {
          ...data.invoice,
          totalAmount: totalAmount.toString(),
        },
        items: data.items.map((item) => {
          if (!item.itemId) {
            throw new Error('Item ID is required for all items');
          }
          return {
            ...item,
            weight: item.weight.toString(),
            crates: item.crates.toString(),
            boxes: item.boxes.toString(),
            rate: item.rate.toString(),
            amount: calculateItemAmount(item.rate, item).toString(),
          };
        }),
      };

      // Add crate transaction if enabled
      if (data.crateTransaction?.enabled && data.crateTransaction.quantity) {
        invoiceData.crateTransaction = {
          partyType: 'retailer',
          retailerId: data.invoice.retailerId,
          transactionType: 'Given',
          quantity: data.crateTransaction.quantity,
          transactionDate: data.invoice.invoiceDate,
          notes: `Crates given with invoice`,
        };
      }

      const endpoint = editingInvoice
        ? `/api/sales-invoices/${editingInvoice.id}`
        : "/api/sales-invoices";
      const method = editingInvoice ? "PUT" : "POST";

      const response = await authenticatedApiRequest(
        method,
        endpoint,
        invoiceData
      );

      if (!response.ok) {
        throw new Error("Failed to save invoice");
      }

      toast({
        title: editingInvoice ? "Invoice updated" : "Invoice created",
        description: editingInvoice
          ? "Sales invoice has been updated successfully"
          : data.crateTransaction?.enabled
          ? "Sales invoice and crate transaction created successfully"
          : "Sales invoice has been created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setOpen(false);
      form.reset();
    } catch (error) {
      logFormError(error, 'salesInvoiceForm', data);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save invoice",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = (invoice: any) => {
    try {
      if (!invoice || !invoice.id) {
        throw new Error('Invalid invoice data for navigation');
      }
      if (!slug) {
        throw new Error('Invalid tenant slug for navigation');
      }
      setLocation(`/${slug}/sales-invoices/${invoice.id}`);
    } catch (error) {
      logNavigationError(error, `sales-invoice-${invoice?.id}`);
      toast({
        title: "Error",
        description: "Failed to navigate to invoice details",
        variant: "destructive",
      });
    }
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
      cell: (value: string) => (
        <div className="font-medium">{value || "AUTO"}</div>
      ),
    },
    {
      accessorKey: "retailer.name",
      header: "Retailer",
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
      accessorKey: "totalAmount",
      header: "Total Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "paidAmount",
      header: "Paid Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "udhaaarAmount",
      header: "Udhaar",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "shortfallAmount",
      header: "Shortfall",
      cell: (value: string) => {
        const amount = parseFloat(value || "0");
        return (
          <span className={amount > 0 ? "text-red-600 font-medium" : ""}>
            ₹{amount.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Payment Status",
      cell: (value: string) => (
        <Badge className={getPaymentStatusColor(value)} variant="secondary">
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
            data-testid={`button-view-${invoice.id}`}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(invoice.id)}
            data-testid={`button-delete-${invoice.id}`}
            title="Delete Invoice"
            disabled={deleteInvoiceMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Extract invoices and metadata from paginated result
  const invoices = invoicesResult?.data || [];
  const retailers = retailersResult?.data || [];
  const items = itemsResult?.data || [];
  const paginationMetadata = invoicesResult?.pagination;

  // Debug logs
  console.log("Items loading:", itemsLoading);
  console.log("Items error:", itemsError);
  console.log("Items result:", itemsResult);
  console.log("Items array:", items);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
        return "bg-chart-1/10 text-chart-1";
      case "Partial":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
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

  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Sales Invoices
            </h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error
                ? error.message
                : "Failed to load sales invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.totalAmount || "0"),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.paidAmount || "0"),
    0
  );
  const totalUdhaar = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.udhaaarAmount || "0"),
    0
  );
  const totalShortfall = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.shortfallAmount || "0"),
    0
  );
  const totalInvoices = invoices.length;

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Sales Invoices
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage sales invoices and track payments
              </p>
            </div>
            <Button
              onClick={handleCreateNew}
              data-testid="button-create-invoice"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="p-6 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Udhaar Amount
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{totalUdhaar.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Shortfall
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalShortfall.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Deficit from paid invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invoices
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Invoices</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices by number or retailer..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-invoices"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilterChange}
                  >
                    <SelectTrigger
                      className="w-48"
                      data-testid="select-status-filter"
                    >
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
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

      {/* Create Invoice Dialog - Keep this as it's for creating invoices, not payments */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit" : "Create"} Sales Invoice
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoice.retailerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retailer *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
                  name="invoice.invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-invoice-date"
                        />
                      </FormControl>
                      <FormMessage />
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
                          placeholder="Enter paid amount"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          data-testid="input-paid-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Invoice Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        itemId: "",
                        weight: 0,
                        crates: 0,
                        boxes: 0,
                        rate: 0,
                        amount: 0,
                      })
                    }
                    data-testid="button-add-item"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.itemId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item *</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    data-testid={`select-item-${index}`}
                                  >
                                    <SelectValue placeholder="Select item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {itemsLoading ? (
                                    <SelectItem value="loading" disabled>
                                      Loading items...
                                    </SelectItem>
                                  ) : itemsError ? (
                                    <SelectItem value="error" disabled>
                                      Error loading items
                                    </SelectItem>
                                  ) : items.length === 0 ? (
                                    <SelectItem value="no-items" disabled>
                                      No items available
                                    </SelectItem>
                                  ) : (
                                    items.map((item: any) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                      </SelectItem>
                                    ))
                                  )}
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
                              <FormLabel>Weight (KG)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
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
                              <FormLabel>Crates</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  data-testid={`input-crates-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.boxes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Boxes</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  data-testid={`input-boxes-${index}`}
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
                              <FormLabel>Rate (₹)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid={`input-rate-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <div className="text-sm">
                            <div className="text-muted-foreground mb-1">
                              Amount
                            </div>
                            <div className="font-medium">
                              ₹
                              {calculateItemAmount(
                                form.watch(`items.${index}.rate`),
                                form.watch(`items.${index}`)
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {form.watch(`items.${index}.itemId`) && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Available Stock:{" "}
                          {getAvailableStock(
                            form.watch(`items.${index}.itemId`)
                          )}{" "}
                          units
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>₹{calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>

              {/* Crate Transaction Section */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Crate Transaction (Optional)</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="crateTransaction.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-crate-transaction"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Record crate transaction with this invoice
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Automatically track crates given to the retailer
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch("crateTransaction.enabled") && (
                  <FormField
                    control={form.control}
                    name="crateTransaction.quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Crates *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number of crates"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || undefined)
                            }
                            data-testid="input-crate-quantity"
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Crates will be marked as "Given" to {form.watch("invoice.retailerId") ? getRetailerName(form.watch("invoice.retailerId")) : "the selected retailer"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="invoice.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter notes (optional)"
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit">
                  {editingInvoice ? "Update" : "Create"} Invoice
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
