import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PaginationOptions, type PaginatedResult, type CrateTransactionWithParty } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { z } from "zod";
import { 
  Plus, 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Users, 
  TrendingUp,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { buildPaginationParams } from "@/lib/pagination";

const crateTransactionSchema = z.object({
  partyType: z.enum(["retailer", "vendor"], {
    required_error: "Party type is required"
  }),
  retailerId: z.string().optional(),
  vendorId: z.string().optional(),
  transactionType: z.enum(["Given", "Received", "Returned"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  salesInvoiceId: z.string().optional(),
  purchaseInvoiceId: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Ensure retailerId is provided when partyType is 'retailer'
  if (data.partyType === 'retailer' && !data.retailerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Retailer selection is required",
      path: ["retailerId"]
    });
  }
  // Ensure vendorId is provided when partyType is 'vendor'
  if (data.partyType === 'vendor' && !data.vendorId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Vendor selection is required",
      path: ["vendorId"]
    });
  }
});

type CrateTransactionFormData = z.infer<typeof crateTransactionSchema>;

export default function CrateManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "",
    sortOrder: "desc",
  });
  const [selectedRetailer, setSelectedRetailer] = useState("all");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all");
  const [selectedPartyType, setSelectedPartyType] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CrateTransactionFormData>({
    resolver: zodResolver(crateTransactionSchema),
    defaultValues: {
      partyType: "retailer",
      retailerId: "",
      vendorId: "",
      transactionType: "Given",
      quantity: 1,
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      salesInvoiceId: "",
      purchaseInvoiceId: "",
      notes: "",
    },
  });

  // Fetch data
  const { data: transactionsResult, isLoading: transactionsLoading, isFetching: transactionsFetching, isError, error } = useQuery<PaginatedResult<CrateTransactionWithParty>>({
    queryKey: ["/api/crate-transactions", paginationOptions, selectedRetailer, selectedTransactionType, selectedPartyType],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      
      // Add party type filter
      if (selectedPartyType !== "all") {
        params.append("partyType", selectedPartyType);
      }
      
      // Add retailer filter
      if (selectedRetailer !== "all") {
        params.append("retailerId", selectedRetailer);
      }
      
      // Add transaction type filter
      if (selectedTransactionType !== "all") {
        params.append("type", selectedTransactionType.toLowerCase());
      }
      
      const response = await authenticatedApiRequest("GET", `/api/crate-transactions?${params.toString()}`);
      return response.json();
    },
  });

  const { data: retailersResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      const response = await authenticatedApiRequest("GET", `/api/retailers?${params.toString()}`);
      return response.json();
    },
  });
  const retailers = retailersResult?.data || [];

  const { data: vendorsResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions); // Fetch all vendors
      const response = await authenticatedApiRequest("GET", `/api/vendors?${params.toString()}`);
      return response.json();
    },
  });
  const vendors = vendorsResult?.data || [];

  const { data: salesInvoicesResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      const response = await authenticatedApiRequest("GET", `/api/sales-invoices?${params.toString()}`);
      return response.json();
    },
  });
  const salesInvoices = salesInvoicesResult?.data || [];

  const { data: purchaseInvoicesResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/purchase-invoices"],
    queryFn: async () => {
      const params = buildPaginationParams({ page: 1, limit: 1000 });
      const response = await authenticatedApiRequest("GET", `/api/purchase-invoices?${params.toString()}`);
      return response.json();
    },
  });
  const purchaseInvoices = purchaseInvoicesResult?.data || [];

  // Create crate transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (data: CrateTransactionFormData) => {
      const transactionData = {
        ...data,
        salesInvoiceId: data.salesInvoiceId || null,
        purchaseInvoiceId: data.purchaseInvoiceId || null,
        // Remove the party ID that doesn't match partyType
        retailerId: data.partyType === 'retailer' ? data.retailerId : null,
        vendorId: data.partyType === 'vendor' ? data.vendorId : null,
      };
      const response = await authenticatedApiRequest("POST", "/api/crate-transactions", transactionData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Crate transaction recorded",
        description: "Crate transaction has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record crate transaction",
        variant: "destructive",
      });
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

  const handleRetailerFilterChange = (retailer: string) => {
    setSelectedRetailer(retailer);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handleTransactionTypeFilterChange = (transactionType: string) => {
    setSelectedTransactionType(transactionType);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handlePartyTypeFilterChange = (partyType: string) => {
    setSelectedPartyType(partyType);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateTransaction = () => {
    form.reset({
      partyType: "retailer",
      retailerId: "",
      vendorId: "",
      transactionType: "Given",
      quantity: 1,
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      salesInvoiceId: "",
      purchaseInvoiceId: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CrateTransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  const getRetailerName = (retailerId: string) => {
    const retailer = retailers.find((r: any) => r.id === retailerId);
    return retailer?.name || "Unknown Retailer";
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v: any) => v.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  const getPartyName = (transaction: any) => {
    if (transaction.partyType === 'vendor' && transaction.vendorId) {
      return getVendorName(transaction.vendorId);
    }
    if (transaction.partyType === 'retailer' && transaction.retailerId) {
      return getRetailerName(transaction.retailerId);
    }
    return "Unknown Party";
  };

  const getSalesInvoiceNumber = (invoiceId: string) => {
    const invoice = salesInvoices.find((i: any) => i.id === invoiceId);
    return invoice?.invoiceNumber || "N/A";
  };

  const getPurchaseInvoiceNumber = (invoiceId: string) => {
    const invoice = purchaseInvoices.find((i: any) => i.id === invoiceId);
    return invoice?.invoiceNumber || "N/A";
  };

  const getTransactionTypeColor = (type: string) => {
    if (type === "Given") return "bg-blue-500";
    if (type === "Received") return "bg-purple-500";
    return "bg-green-500"; // Returned
  };

  const getTransactionTypeIcon = (type: string) => {
    if (type === "Given") return <ArrowUpCircle className="h-4 w-4" />;
    if (type === "Received") return <ArrowDownCircle className="h-4 w-4" />;
    return <ArrowDownCircle className="h-4 w-4" />; // Returned
  };

  // Extract transactions and metadata from paginated result
  const crateTransactions = transactionsResult?.data || [];
  const paginationMetadata = transactionsResult?.pagination;

  // Combine retailer and vendor crate balances
  const retailerCrateBalances = retailers.map((retailer: any) => ({
    ...retailer,
    partyType: 'Retailer',
    balance: retailer.crateBalance || 0,
  }));

  const vendorCrateBalances = vendors.map((vendor: any) => ({
    ...vendor,
    partyType: 'Vendor',
    balance: vendor.crateBalance || 0,
  }));

  const allPartyBalances = [...retailerCrateBalances, ...vendorCrateBalances];

  // Define transactions table columns
  const transactionColumns = [
    {
      accessorKey: "transactionDate",
      header: "Date",
      cell: (value: string) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      accessorKey: "partyType",
      header: "Party Type",
      cell: (value: string) => (
        <Badge variant="outline">
          {value === 'retailer' ? 'Retailer' : 'Vendor'}
        </Badge>
      ),
    },
    {
      accessorKey: "retailerId",
      header: "Party Name",
      cell: (value: string, row: any) => getPartyName(row),
    },
    {
      accessorKey: "transactionType",
      header: "Type",
      cell: (value: string) => (
        <div className="flex items-center space-x-2">
          {getTransactionTypeIcon(value)}
          <Badge className={getTransactionTypeColor(value)}>
            {value}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: (value: string) => <div className="font-medium">{value} crates</div>,
    },
    {
      accessorKey: "salesInvoiceId",
      header: "Related Invoice",
      cell: (value: string, row: any) => {
        if (row.salesInvoiceId) return getSalesInvoiceNumber(row.salesInvoiceId);
        if (row.purchaseInvoiceId) return getPurchaseInvoiceNumber(row.purchaseInvoiceId);
        return "-";
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: (value: string) => value || "-",
    },
  ];

  // Define party balances table columns
  const balanceColumns = [
    {
      accessorKey: "partyType",
      header: "Type",
      cell: (value: string) => (
        <Badge variant={value === 'Retailer' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "name",
      header: "Party Name",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "balance",
      header: "Crate Balance",
      cell: (value: number) => (
        <div className={`font-medium ${value > 0 ? 'text-orange-600' : value < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {value} crates
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Status",
      cell: (value: number) => {
        if (value > 0) {
          return (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Badge variant="destructive">Outstanding</Badge>
            </div>
          );
        } else if (value < 0) {
          return <Badge variant="secondary">Excess Return</Badge>;
        } else {
          return <Badge variant="default">Settled</Badge>;
        }
      },
    },
  ];

  // Calculate summary stats using server totals
  const totalTransactions = paginationMetadata?.total || 0;
  // Note: Crate aggregates removed as they would be misleading from current page only
  // Consider adding /api/crate-transactions/stats endpoint for accurate totals with same filters

  if (transactionsLoading) {
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
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Crate Transactions</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : "Failed to load crate transactions. Please try again."}
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
              <h2 className="text-2xl font-semibold text-foreground">Crate Management</h2>
              <p className="text-sm text-muted-foreground">
                Track crate transactions with retailers and vendors
              </p>
            </div>
            <Button onClick={handleCreateTransaction} data-testid="button-add-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Record Transaction
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTransactions}</div>
                <p className="text-xs text-muted-foreground">All crate movements</p>
              </CardContent>
            </Card>
            
            {/* Crate aggregates removed - would be misleading from current page only */}
            {/* Consider adding /api/crate-transactions/stats endpoint for accurate totals with same filters */}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="balances">Party Balances</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Crate Transactions</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Select value={selectedPartyType} onValueChange={handlePartyTypeFilterChange}>
                        <SelectTrigger className="w-32" data-testid="select-party-type-filter">
                          <SelectValue placeholder="All Parties" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Parties</SelectItem>
                          <SelectItem value="retailer">Retailers</SelectItem>
                          <SelectItem value="vendor">Vendors</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedRetailer} onValueChange={handleRetailerFilterChange}>
                        <SelectTrigger className="w-40" data-testid="select-retailer-filter">
                          <SelectValue placeholder="All Retailers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Retailers</SelectItem>
                          {retailers.map((retailer: any) => (
                            <SelectItem key={retailer.id} value={retailer.id}>
                              {retailer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedTransactionType} onValueChange={handleTransactionTypeFilterChange}>
                        <SelectTrigger className="w-32" data-testid="select-type-filter">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Given">Given</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                          <SelectItem value="Returned">Returned</SelectItem>
                        </SelectContent>
                      </Select>

                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={crateTransactions}
                    columns={transactionColumns}
                    paginationMetadata={paginationMetadata}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onSearchChange={handleSearchChange}
                    onSortChange={handleSortChange}
                    isLoading={transactionsFetching}
                    enableRowSelection={true}
                    rowKey="id"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Party Crate Balances</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Retailer and vendor crate balances
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={allPartyBalances}
                    columns={balanceColumns}
                    isLoading={false}
                    enableRowSelection={true}
                    rowKey="id"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
    </div>

    {/* Record Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Crate Transaction</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="partyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Type *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset party-specific fields when party type changes
                        form.setValue('retailerId', '');
                        form.setValue('vendorId', '');
                        // Update transaction type based on party type
                        if (value === 'vendor') {
                          form.setValue('transactionType', 'Received');
                        } else {
                          form.setValue('transactionType', 'Given');
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-party-type">
                          <SelectValue placeholder="Select party type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="retailer">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Retailer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="vendor">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4" />
                            <span>Vendor</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('partyType') === 'retailer' && (
                <FormField
                  control={form.control}
                  name="retailerId"
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
              )}

              {form.watch('partyType') === 'vendor' && (
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-transaction-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch('partyType') === 'retailer' ? (
                            // Retailer transaction types
                            <>
                              <SelectItem value="Given">
                                <div className="flex items-center space-x-2">
                                  <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                                  <span>Given</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Returned">
                                <div className="flex items-center space-x-2">
                                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                  <span>Returned</span>
                                </div>
                              </SelectItem>
                            </>
                          ) : (
                            // Vendor transaction types
                            <>
                              <SelectItem value="Received">
                                <div className="flex items-center space-x-2">
                                  <ArrowDownCircle className="h-4 w-4 text-purple-600" />
                                  <span>Received</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Returned">
                                <div className="flex items-center space-x-2">
                                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                  <span>Returned</span>
                                </div>
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-transaction-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('partyType') === 'retailer' && (
                <FormField
                  control={form.control}
                  name="salesInvoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Sales Invoice (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sales-invoice">
                            <SelectValue placeholder="Select sales invoice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesInvoices.map((invoice: any) => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} - {getRetailerName(invoice.retailerId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {form.watch('partyType') === 'vendor' && (
                <FormField
                  control={form.control}
                  name="purchaseInvoiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Purchase Invoice (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-purchase-invoice">
                            <SelectValue placeholder="Select purchase invoice" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {purchaseInvoices.map((invoice: any) => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} - {getVendorName(invoice.vendorId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTransactionMutation.isPending}
                  data-testid="button-submit"
                >
                  {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}