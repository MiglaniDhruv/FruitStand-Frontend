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

const crateTransactionSchema = z.object({
  retailerId: z.string().min(1, "Retailer is required"),
  transactionType: z.enum(["Given", "Returned"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  salesInvoiceId: z.string().optional(),
  notes: z.string().optional(),
});

type CrateTransactionFormData = z.infer<typeof crateTransactionSchema>;

export default function CrateManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    },
  });

  // Fetch data
  const { data: crateTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/crate-transactions"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/crate-transactions");
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

  const { data: salesInvoices = [] } = useQuery({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/sales-invoices");
      return response.json();
    },
  });

  // Create crate transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (data: CrateTransactionFormData) => {
      const transactionData = {
        ...data,
        salesInvoiceId: data.salesInvoiceId || null,
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

  const handleCreateTransaction = () => {
    form.reset({
      retailerId: "",
      transactionType: "Given",
      quantity: 1,
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      salesInvoiceId: "",
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

  // Filter transactions
  const filteredTransactions = crateTransactions.filter((transaction: any) => {
    const matchesSearch = getRetailerName(transaction.retailerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRetailer = selectedRetailer === "all" || transaction.retailerId === selectedRetailer;
    const matchesType = selectedTransactionType === "all" || transaction.transactionType === selectedTransactionType;
    return matchesSearch && matchesRetailer && matchesType;
  });

  // Calculate retailer crate balances
  const retailerCrateBalances = retailers.map((retailer: any) => {
    const retailerTransactions = crateTransactions.filter((t: any) => t.retailerId === retailer.id);
    const given = retailerTransactions
      .filter((t: any) => t.transactionType === "Given")
      .reduce((sum: number, t: any) => sum + t.quantity, 0);
    const returned = retailerTransactions
      .filter((t: any) => t.transactionType === "Returned")
      .reduce((sum: number, t: any) => sum + t.quantity, 0);
    const balance = given - returned;
    
    return {
      ...retailer,
      given,
      returned,
      balance,
    };
  });

  // Calculate summary stats
  const totalTransactions = crateTransactions.length;
  const totalCratesGiven = crateTransactions
    .filter((t: any) => t.transactionType === "Given")
    .reduce((sum: number, t: any) => sum + t.quantity, 0);
  const totalCratesReturned = crateTransactions
    .filter((t: any) => t.transactionType === "Returned")
    .reduce((sum: number, t: any) => sum + t.quantity, 0);
  const totalCratesOutstanding = totalCratesGiven - totalCratesReturned;
  const retailersWithCrates = retailerCrateBalances.filter((r: any) => r.balance > 0).length;

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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Crate Management</h1>
              <p className="text-muted-foreground">Track crate transactions with retailers</p>
            </div>
            <Button onClick={handleCreateTransaction} data-testid="button-add-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Record Transaction
            </Button>
          </div>

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
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crates Given</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalCratesGiven}</div>
                <p className="text-xs text-muted-foreground">Total dispatched</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crates Returned</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalCratesReturned}</div>
                <p className="text-xs text-muted-foreground">Total received back</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{totalCratesOutstanding}</div>
                <p className="text-xs text-muted-foreground">With retailers</p>
              </CardContent>
            </Card>
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
                      <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
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
                      <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                        <SelectTrigger className="w-32" data-testid="select-type-filter">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Given">Given</SelectItem>
                          <SelectItem value="Returned">Returned</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Search transactions..."
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
                        <TableHead>Date</TableHead>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Sales Invoice</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{format(new Date(transaction.transactionDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-medium">{getRetailerName(transaction.retailerId)}</TableCell>
                          <TableCell>
                            <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                              <div className="flex items-center space-x-1">
                                {getTransactionTypeIcon(transaction.transactionType)}
                                <span>{transaction.transactionType}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.quantity}</TableCell>
                          <TableCell>
                            {transaction.salesInvoiceId ? (
                              <Badge variant="outline">
                                {getSalesInvoiceNumber(transaction.salesInvoiceId)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{transaction.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {searchTerm || selectedRetailer !== "all" || selectedTransactionType !== "all"
                              ? "No transactions found matching your filters."
                              : "No crate transactions found. Record your first transaction!"
                            }
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Retailer Crate Balances</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {retailersWithCrates} retailers have crates
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Crates Given</TableHead>
                        <TableHead>Crates Returned</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retailerCrateBalances.map((retailer: any) => (
                        <TableRow key={retailer.id}>
                          <TableCell className="font-medium">{retailer.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-blue-600">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              {retailer.given}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              {retailer.returned}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className={retailer.balance > 0 ? "text-amber-600" : "text-gray-500"}>
                              {retailer.balance}
                            </span>
                          </TableCell>
                          <TableCell>
                            {retailer.balance > 0 ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Outstanding
                              </Badge>
                            ) : retailer.balance === 0 && (retailer.given > 0 || retailer.returned > 0) ? (
                              <Badge className="bg-green-500">
                                Settled
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                No Activity
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {retailerCrateBalances.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No retailers found. Add retailers to track crate balances.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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