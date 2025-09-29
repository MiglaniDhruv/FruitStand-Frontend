import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PaginationOptions, type PaginatedResult, type CrateTransactionWithRetailer } from "@shared/schema";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  retailerId: z.string().min(1, "Retailer is required"),
  transactionType: z.enum(["Given", "Returned"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  salesInvoiceId: z.string().optional(),
  notes: z.string().optional(),
  withDeposit: z.boolean().default(false),
  depositAmount: z.number().optional(),
}).refine((data) => {
  if (data.withDeposit && (!data.depositAmount || data.depositAmount <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Deposit amount is required when with deposit is selected",
  path: ["depositAmount"],
});

type CrateTransactionFormData = z.infer<typeof crateTransactionSchema>;

export default function CrateManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "transactionDate",
    sortOrder: "desc",
  });
  const [selectedRetailer, setSelectedRetailer] = useState("all");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CrateTransactionFormData>({
    resolver: zodResolver(crateTransactionSchema),
    defaultValues: {
      retailerId: "",
      transactionType: "Given",
      quantity: 1,
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      salesInvoiceId: "",
      notes: "",
      withDeposit: false,
      depositAmount: undefined,
    },
  });

  // Fetch data
  const { data: transactionsResult, isLoading: transactionsLoading, isError, error } = useQuery<PaginatedResult<CrateTransactionWithRetailer>>({
    queryKey: ["/api/crate-transactions", paginationOptions, selectedRetailer, selectedTransactionType],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      
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

  const { data: salesInvoicesResult } = useQuery<PaginatedResult<any>>({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      const response = await authenticatedApiRequest("GET", `/api/sales-invoices?${params.toString()}`);
      return response.json();
    },
  });
  const salesInvoices = salesInvoicesResult?.data || [];

  // Create crate transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (data: CrateTransactionFormData) => {
      const transactionData = {
        ...data,
        salesInvoiceId: data.salesInvoiceId || null,
        depositAmount: data.withDeposit ? data.depositAmount : null,
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

  const handleCreateTransaction = () => {
    form.reset({
      retailerId: "",
      transactionType: "Given",
      quantity: 1,
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      salesInvoiceId: "",
      notes: "",
      withDeposit: false,
      depositAmount: undefined,
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

  const getSalesInvoiceNumber = (invoiceId: string) => {
    const invoice = salesInvoices.find((i: any) => i.id === invoiceId);
    return invoice?.invoiceNumber || "N/A";
  };

  const getTransactionTypeColor = (type: string) => {
    return type === "Given" ? "bg-blue-500" : "bg-green-500";
  };

  const getTransactionTypeIcon = (type: string) => {
    return type === "Given" ? 
      <ArrowUpCircle className="h-4 w-4" /> : 
      <ArrowDownCircle className="h-4 w-4" />;
  };

  // Extract transactions and metadata from paginated result
  const crateTransactions = transactionsResult?.data || [];
  const paginationMetadata = transactionsResult?.pagination;

  // Use reliable retailer balance from database instead of per-page calculations
  const retailerCrateBalances = retailers.map((retailer: any) => ({
    ...retailer,
    given: 0, // Remove per-page-derived sums to avoid misleading values
    returned: 0, // Remove per-page-derived sums to avoid misleading values
    balance: retailer.crateBalance || 0, // Use actual balance from retailer record
  }));

  // Define transactions table columns
  const transactionColumns = [
    {
      accessorKey: "transactionDate",
      header: "Date",
      cell: (value: string) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      accessorKey: "retailerId",
      header: "Retailer",
      cell: (value: string) => getRetailerName(value),
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
      accessorKey: "withDeposit",
      header: "Deposit",
      cell: (value: boolean, row: any) => {
        if (value && row.depositAmount) {
          return <Badge variant="outline">₹{parseFloat(row.depositAmount).toLocaleString("en-IN")}</Badge>;
        }
        return <span className="text-muted-foreground">No deposit</span>;
      },
    },
    {
      accessorKey: "salesInvoiceId",
      header: "Related Invoice",
      cell: (value: string) => value ? getSalesInvoiceNumber(value) : "-",
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: (value: string) => value || "-",
    },
  ];

  // Define retailer balances table columns
  const balanceColumns = [
    {
      accessorKey: "name",
      header: "Retailer",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "given",
      header: "Crates Given",
      cell: (value: number) => <div className="text-blue-600">{value}</div>,
    },
    {
      accessorKey: "returned",
      header: "Crates Returned",
      cell: (value: number) => <div className="text-green-600">{value}</div>,
    },
    {
      accessorKey: "balance",
      header: "Balance",
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
                Track crate transactions with retailers
              </p>
            </div>
            <Button onClick={handleCreateTransaction} data-testid="button-add-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Record Transaction
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
              <TabsTrigger value="balances">Retailer Balances</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Crate Transactions</CardTitle>
                    <div className="flex items-center space-x-2">
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
                    isLoading={transactionsLoading}
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
                    <CardTitle>Retailer Crate Balances</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Retailer crate balances
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={retailerCrateBalances}
                    columns={balanceColumns}
                    isLoading={false}
                    enableRowSelection={true}
                    rowKey="id"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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

              {/* Deposit Option */}
              <FormField
                control={form.control}
                name="withDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Option</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value ? "true" : "false"}
                        className="flex flex-row space-x-6"
                        data-testid="radio-deposit-option"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="without-deposit" />
                          <Label htmlFor="without-deposit">Without Deposit</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="with-deposit" />
                          <Label htmlFor="with-deposit">With Deposit</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deposit Amount (Conditional) */}
              {form.watch("withDeposit") && (
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => {
                    const transactionType = form.watch("transactionType");
                    const isGiven = transactionType === "Given";
                    
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <span>Deposit Amount *</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isGiven 
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }`}>
                            {isGiven ? "Received from retailer" : "Paid to retailer"}
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder={`Enter deposit amount ${isGiven ? "received" : "to pay"}`}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-deposit-amount"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {isGiven 
                            ? "Amount received from retailer as deposit for crates given"
                            : "Amount to be paid back to retailer for returned crates"
                          }
                        </p>
                      </FormItem>
                    );
                  }}
                />
              )}

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