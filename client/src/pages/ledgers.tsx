import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { authenticatedApiRequest } from "@/lib/auth";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import type { BankAccountSummary, VendorSummary, RetailerSummary } from "@shared/schema";
import { 
  Download, 
  Book, 
  DollarSign, 
  CreditCard, 
  Users, 
  Store,
  Package,
  AlertCircle,
  FileText,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
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
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@shared/permissions";
import { useToast } from "@/hooks/use-toast";

export default function Ledgers() {
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedRetailer, setSelectedRetailer] = useState("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });
  const [selectedBankAccount, setSelectedBankAccount] = useState("all");
  const [activeTab, setActiveTab] = useState("cashbook");
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ bankAccountId: string; transactionId: string } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dropdown data needed for filters

  const { data: vendors = [], isLoading: vendorsLoading, isError: vendorsError, error: vendorsErrorMsg } = useQuery({
    queryKey: ["/api/vendors"],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors");
      return response.json();
    },
  });

  const { data: retailers = [], isLoading: retailersLoading, isError: retailersError, error: retailersErrorMsg } = useQuery({
    queryKey: ["/api/retailers"],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers");
      return response.json();
    },
  });

  const { data: bankAccounts = [], isLoading: bankAccountsLoading, isError: bankAccountsError, error: bankAccountsErrorMsg } = useQuery({
    queryKey: ["/api/bank-accounts"],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
  });

  // Add new API queries for ledger data
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ["/api/ledgers/kpi"],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/ledgers/kpi");
      return response.json();
    },
  });

  const { data: cashbookData = [], isLoading: cashbookLoading } = useQuery({
    queryKey: ["/api/cashbook", dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/cashbook?${params.toString()}`);
      return response.json();
    },
  });

  const { data: bankbookData = [], isLoading: bankbookLoading, isError: bankbookError } = useQuery({
    queryKey: ["/api/bankbook", selectedBankAccount, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBankAccount !== "all") {
        params.append("bankAccountId", selectedBankAccount);
      }
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/bankbook?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Bankbook API error: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Vendor Summary Query (when "All Vendors" selected)
  const { data: vendorSummaryData = [], isLoading: vendorSummaryLoading } = useQuery<VendorSummary[]>({
    queryKey: ["/api/ledger/vendor/summary", dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedVendor === "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledger/vendor?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Vendor summary API error: ${response.status} - ${response.statusText}`);
      }
      return response.json() as Promise<VendorSummary[]>;
    },
  });

  // Vendor Ledger Detail Query (when specific vendor selected)
  const { data: vendorLedgerData = [], isLoading: vendorLedgerLoading } = useQuery({
    queryKey: ["/api/ledger/vendor/detail", selectedVendor, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedVendor !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("vendorId", selectedVendor);
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledger/vendor?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Vendor ledger API error: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Retailer Summary Query (when "All Retailers" selected)
  const { data: retailerSummaryData = [], isLoading: retailerSummaryLoading } = useQuery<RetailerSummary[]>({
    queryKey: ["/api/ledgers/retailer/summary", dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedRetailer === "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledgers/retailer?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Retailer summary API error: ${response.status} - ${response.statusText}`);
      }
      return response.json() as Promise<RetailerSummary[]>;
    },
  });

  // Retailer Ledger Detail Query (when specific retailer selected)
  const { data: retailerLedgerData = [], isLoading: retailerLedgerLoading } = useQuery({
    queryKey: ["/api/ledgers/retailer/detail", selectedRetailer, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedRetailer !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("retailerId", selectedRetailer);
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledgers/retailer?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Retailer ledger API error: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: udhaarBookData = [], isLoading: udhaarBookLoading } = useQuery({
    queryKey: ["/api/ledgers/udhaar", dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const res = await authenticatedApiRequest("GET", `/api/ledgers/udhaar?${params.toString()}`);
      return res.json();
    },
  });

  const { data: crateLedgerData = [], isLoading: crateLedgerLoading } = useQuery({
    queryKey: ["/api/ledgers/crates", selectedRetailer, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRetailer !== "all") params.append("retailerId", selectedRetailer);
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledgers/crates?${params.toString()}`);
      return response.json();
    },
  });

  // Delete mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async ({ bankAccountId, transactionId }: { bankAccountId: string; transactionId: string }) => {
      const response = await authenticatedApiRequest(
        "DELETE",
        `/api/bank-accounts/${bankAccountId}/transactions/${transactionId}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete transaction");
      }
      if (response.status === 204) return null;
      return response.json().catch(() => null);
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/bankbook"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers/kpi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const isInitialLoading = (vendorsLoading && vendors.length === 0) || 
    (retailersLoading && retailers.length === 0) || 
    (bankAccountsLoading && bankAccounts.length === 0) || 
    (kpiLoading && !kpiData) ||
    (activeTab === "cashbook" && cashbookLoading && cashbookData.length === 0) ||
    (activeTab === "bankbook" && bankbookLoading && bankbookData.length === 0) ||
    (activeTab === "vapari-book" && vendorLedgerLoading && vendorLedgerData.length === 0) ||
    (activeTab === "retailer-ledger" && retailerLedgerLoading && retailerLedgerData.length === 0) ||
    (activeTab === "udhaar-book" && udhaarBookLoading && udhaarBookData.length === 0) ||
    (activeTab === "crate-ledger" && crateLedgerLoading && crateLedgerData.length === 0);
  const hasError = vendorsError || retailersError || bankAccountsError;
  const errorMessage = vendorsErrorMsg || retailersErrorMsg || bankAccountsErrorMsg;

  // Helper functions for delete functionality
  const handleDeleteTransaction = (bankAccountId: string, transactionId: string) => {
    setTransactionToDelete({ bankAccountId, transactionId });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteTransactionMutation.mutate(transactionToDelete);
    }
  };

  const cancelDeleteTransaction = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // Helper function to check if a transaction is manually created (can be deleted)
  const isManualTransaction = (t: any) =>
    !t.isBalanceEntry &&
    (t.referenceType === 'Bank Deposit' || t.referenceType === 'Bank Withdrawal') &&
    (t.referenceId == null);

  if (isInitialLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <SkeletonCard />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <SkeletonTable rows={8} columns={5} showHeader={true} />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (hasError) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">Error Loading Ledger Data</h2>
            <p className="text-gray-600 max-w-md">
              {errorMessage instanceof Error ? errorMessage.message : "Failed to load ledger data. Please try again."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: string | number | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') {
      return '₹0';
    }
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
  };

  return (
    <AppLayout>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Business Ledgers</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Complete ledger management system for APMC operations
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full sm:w-40"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground hidden sm:inline">to</span>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full sm:w-40"
                data-testid="input-end-date"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* KPI Cards */}
          {kpiData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cash Balance</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(kpiData.cashBalance)}
                      </p>
                      <p className="text-xs sm:text-sm mt-1 text-muted-foreground">Current cash in hand</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="text-base sm:text-lg text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Bank Balance</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(kpiData.totalBankBalance)}
                      </p>
                      <p className="text-xs sm:text-sm mt-1 text-muted-foreground">Across all bank accounts</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="text-base sm:text-lg text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="cashbook" data-testid="tab-cashbook">Cashbook</TabsTrigger>
              <TabsTrigger value="bankbook" data-testid="tab-bankbook">Bankbook</TabsTrigger>
              <TabsTrigger value="vapari-book" data-testid="tab-vapari-book">Vapari Book</TabsTrigger>
              <TabsTrigger value="retailer-ledger" data-testid="tab-retailer-ledger">Retailer Ledger</TabsTrigger>
              <TabsTrigger value="udhaar-book" data-testid="tab-udhaar-book">Udhaar Book</TabsTrigger>
              <TabsTrigger value="crate-ledger" data-testid="tab-crate-ledger">Crate Ledger</TabsTrigger>
            </TabsList>


            {/* Cashbook - Cash Only */}
            <TabsContent value="cashbook">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Cashbook - Cash Transactions Only</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashbookLoading && cashbookData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {cashbookData.map((entry: any, index: number) => (
                            <TableRow 
                              key={index} 
                              className={entry.isBalanceEntry ? "bg-muted/50 font-medium" : ""}
                            >
                              <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell className="text-green-600">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                              </TableCell>
                              <TableCell className="text-red-600">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                              </TableCell>
                              <TableCell className={entry.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                {formatCurrency(entry.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {cashbookData.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No transactions found for the selected period
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bankbook - Bank/UPI/Cheque Transactions */}
            <TabsContent value="bankbook">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Bankbook - Bank/UPI/Cheque Transactions</span>
                    </CardTitle>
                    <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                      <SelectTrigger className="w-64" data-testid="select-bank-account">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bank Accounts</SelectItem>
                        {(bankAccounts && Array.isArray(bankAccounts) ? bankAccounts : []).map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName} - {account.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedBankAccount === "all" ? (
                    // Summary view for all bank accounts
                    bankbookError ? (
                      <div className="text-center py-8 text-red-600">
                        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                        <p className="font-medium">Error loading bank accounts summary</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Please try again later
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-4">
                          Summary of all bank accounts for the selected period
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bank Name</TableHead>
                              <TableHead>Account Number</TableHead>
                              <TableHead>Account Holder</TableHead>
                              <TableHead className="text-right">Total Debits</TableHead>
                              <TableHead className="text-right">Total Credits</TableHead>
                              <TableHead className="text-right">Current Balance</TableHead>
                              <TableHead className="text-center">Transactions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bankbookLoading && bankbookData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  Loading bank accounts summary...
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {(bankbookData as BankAccountSummary[]).map((summary) => (
                                  <TableRow key={summary.bankAccountId}>
                                    <TableCell className="font-medium">{summary.bankName}</TableCell>
                                    <TableCell>{summary.accountNumber}</TableCell>
                                    <TableCell>{summary.accountHolderName}</TableCell>
                                    <TableCell className="text-right text-green-600">
                                      {summary.totalDebits > 0 ? formatCurrency(summary.totalDebits) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600">
                                      {summary.totalCredits > 0 ? formatCurrency(summary.totalCredits) : "-"}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${
                                      parseFloat(summary.currentBalance) >= 0 ? "text-green-600" : "text-red-600"
                                    }`}>
                                      {formatCurrency(summary.currentBalance)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary">{summary.transactionCount}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {bankbookData.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                      No bank accounts found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </>
                    )
                  ) : bankbookError ? (
                    <div className="text-center py-8 text-red-600">
                      <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                      <p className="font-medium">Error loading bank transactions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please check the bank account selection or try again later
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankbookLoading && bankbookData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Loading transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {bankbookData.map((entry: any, index: number) => (
                              <TableRow 
                                key={index} 
                                className={entry.isBalanceEntry ? "bg-muted/50 font-medium" : ""}
                              >
                                <TableCell>
                                  {entry.date ? format(new Date(entry.date), "dd/MM/yyyy") : "-"}
                                </TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="text-green-600">
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                                </TableCell>
                                <TableCell className="text-red-600">
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                                </TableCell>
                                <TableCell className={entry.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {formatCurrency(entry.balance)}
                                </TableCell>
                                <TableCell>
                                  {isManualTransaction(entry) && entry.id && selectedBankAccount !== "all" ? (
                                    <PermissionGuard permission={PERMISSIONS.DELETE_PAYMENTS}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteTransaction(selectedBankAccount, entry.id)}
                                        disabled={deleteTransactionMutation.isPending}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </PermissionGuard>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {bankbookData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  No bank transactions found for the selected period and account
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Vapari Book (Vendor Ledger) */}
            <TabsContent value="vapari-book">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Vapari Book - Vendor Ledger</span>
                    </CardTitle>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger className="w-64" data-testid="select-vendor">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {(vendors && Array.isArray(vendors) ? vendors : []).map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedVendor === "all" ? (
                    // Summary view for all vendors
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Summary of all vendor balances
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor Name</TableHead>
                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                            <TableHead className="text-right">Total Invoices</TableHead>
                            <TableHead className="text-right">Total Payments</TableHead>
                            <TableHead className="text-right">Current Balance</TableHead>
                            <TableHead className="text-center">Invoices</TableHead>
                            <TableHead className="hidden lg:table-cell">Last Invoice</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorSummaryLoading && vendorSummaryData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                Loading vendors summary...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {vendorSummaryData.map((summary) => (
                                <TableRow key={summary.vendorId}>
                                  <TableCell className="font-medium">{summary.vendorName}</TableCell>
                                  <TableCell className="hidden md:table-cell">{summary.phone || "-"}</TableCell>
                                  <TableCell className="text-right text-red-600">
                                    {summary.totalInvoices > 0 ? formatCurrency(summary.totalInvoices) : "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600">
                                    {summary.totalPayments > 0 ? formatCurrency(summary.totalPayments) : "-"}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    parseFloat(summary.currentBalance) > 0 ? "text-red-600" : "text-green-600"
                                  }`}>
                                    {formatCurrency(summary.currentBalance)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{summary.invoiceCount}</Badge>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    {summary.lastInvoiceDate ? format(new Date(summary.lastInvoiceDate), "dd/MM/yyyy") : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {vendorSummaryData.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No vendors found
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    // Transaction view for specific vendor
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Detailed transaction history
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorLedgerLoading && vendorLedgerData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Loading transactions...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {vendorLedgerData.map((entry: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {entry.date ? format(new Date(entry.date), "dd/MM/yyyy") : "-"}
                                  </TableCell>
                                  <TableCell>{entry.description}</TableCell>
                                  <TableCell>{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</TableCell>
                                  <TableCell className="text-green-600">
                                    {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                                  </TableCell>
                                  <TableCell className={entry.balance > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                    {formatCurrency(entry.balance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {vendorLedgerData.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No transactions found for this vendor in the selected period
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Retailer Ledger */}
            <TabsContent value="retailer-ledger">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Store className="h-5 w-5" />
                      <span>Retailer Ledger</span>
                    </CardTitle>
                    <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
                      <SelectTrigger className="w-64" data-testid="select-retailer">
                        <SelectValue placeholder="Select retailer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Retailers</SelectItem>
                        {Array.isArray(retailers) && retailers.map((retailer: any) => (
                          <SelectItem key={retailer.id} value={retailer.id}>
                            {retailer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedRetailer === "all" ? (
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Summary of all retailer balances including sales, payments, udhaar, and shortfall amounts
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Retailer Name</TableHead>
                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                            <TableHead className="text-right">Total Sales</TableHead>
                            <TableHead className="text-right">Total Payments</TableHead>
                            <TableHead className="text-right">Udhaar Balance</TableHead>
                            <TableHead className="text-right">Shortfall</TableHead>
                            <TableHead className="text-center">Invoices</TableHead>
                            <TableHead className="hidden lg:table-cell">Last Sale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retailerSummaryLoading && retailerSummaryData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                Loading retailer summary...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {retailerSummaryData.map((summary) => (
                                <TableRow key={summary.retailerId}>
                                  <TableCell className="font-medium">{summary.retailerName}</TableCell>
                                  <TableCell className="hidden md:table-cell">{summary.phone || "-"}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(summary.totalSales)}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(summary.totalPayments)}</TableCell>
                                  <TableCell className={`text-right font-medium ${parseFloat(summary.udhaaarBalance) > 0 ? "text-amber-600" : "text-green-600"}`}>
                                    {formatCurrency(summary.udhaaarBalance)}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${parseFloat(summary.shortfallBalance) > 0 ? "text-red-600" : "text-green-600"}`}>
                                    {formatCurrency(summary.shortfallBalance)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{summary.invoiceCount}</Badge>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    {summary.lastSaleDate ? format(new Date(summary.lastSaleDate), "dd/MM/yyyy") : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {retailerSummaryData.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No retailers found
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Detailed transaction history including sales and payments
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retailerLedgerLoading && retailerLedgerData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Loading transactions...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {retailerLedgerData.map((entry: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                  <TableCell>{entry.description}</TableCell>
                                  <TableCell>{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</TableCell>
                                  <TableCell className="text-green-600">
                                    {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                                  </TableCell>
                                  <TableCell className={entry.balance > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                                    {formatCurrency(entry.balance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {retailerLedgerData.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No transactions found for this retailer in the selected period
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Udhaar Book */}
            <TabsContent value="udhaar-book">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Udhaar Book - Outstanding Credit Balances</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Total Sales</TableHead>
                        <TableHead>Total Payments</TableHead>
                        <TableHead>Outstanding Balance</TableHead>
                        <TableHead>Shortfall Amount</TableHead>
                        <TableHead>Invoices</TableHead>
                        <TableHead>Last Sale Date</TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {udhaarBookLoading && udhaarBookData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Loading outstanding balances...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {udhaarBookData.map((entry: any, index: number) => (
                              <TableRow key={index}>
                              <TableCell className="font-medium">{entry.retailerName}</TableCell>
                              <TableCell>{formatCurrency(entry.totalSales)}</TableCell>
                              <TableCell className="text-green-600">{formatCurrency(entry.totalPayments)}</TableCell>
                              <TableCell className="text-amber-600 font-bold">
                                {(() => {
                                  const balance = entry.udhaarBalance ?? entry.udhaaarBalance;
                                  return typeof balance === 'number' ? formatCurrency(balance) : '-';
                                })()}
                              </TableCell>
                              <TableCell className="text-red-600 font-medium">
                                {parseFloat(entry.shortfallBalance || "0") > 0 
                                  ? formatCurrency(entry.shortfallBalance) 
                                  : "-"
                                }
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{entry.invoiceCount}</Badge>
                              </TableCell>
                              <TableCell>
                                {entry.lastSaleDate ? format(new Date(entry.lastSaleDate), "dd/MM/yyyy") : "-"}
                              </TableCell>
                              </TableRow>
                            ))}
                            {udhaarBookData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  No outstanding credit balances found
                                </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 5. Crate Ledger */}
            <TabsContent value="crate-ledger">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5" />
                      <span>Crate Ledger</span>
                    </CardTitle>
                    <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
                      <SelectTrigger className="w-64" data-testid="select-retailer-crate">
                        <SelectValue placeholder="All retailers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Retailers</SelectItem>
                        {Array.isArray(retailers) && retailers.map((retailer: any) => (
                          <SelectItem key={retailer.id} value={retailer.id}>
                            {retailer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedRetailer === "all" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Retailer</TableHead>
                          <TableHead>Crates Given</TableHead>
                          <TableHead>Crates Returned</TableHead>
                          <TableHead>Current Balance</TableHead>
                          <TableHead>Total Transactions</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crateLedgerLoading && crateLedgerData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Loading crate transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {crateLedgerData.map((entry: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{entry.retailerName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-blue-600">{entry.cratesGiven}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-green-600">{entry.cratesReturned}</Badge>
                                </TableCell>
                                <TableCell className="font-bold">
                                  <span className={entry.balance > 0 ? "text-amber-600" : "text-green-600"}>
                                    {entry.balance}
                                  </span>
                                </TableCell>
                                <TableCell>{entry.totalTransactions}</TableCell>
                                <TableCell>
                                  {entry.balance > 0 ? (
                                    <Badge variant="destructive">Outstanding</Badge>
                                  ) : entry.balance === 0 && entry.cratesGiven > 0 ? (
                                    <Badge className="bg-green-500">Settled</Badge>
                                  ) : (
                                    <Badge variant="secondary">No Activity</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {crateLedgerData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  No crate transactions found for this retailer
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Transaction Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Running Balance</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crateLedgerLoading && crateLedgerData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Loading crate transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {crateLedgerData.map((entry: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{format(new Date(entry.transactionDate), "dd/MM/yyyy")}</TableCell>
                                <TableCell>
                                  <Badge className={entry.transactionType === "Given" ? "bg-blue-500" : "bg-green-500"}>
                                    {entry.transactionType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{entry.quantity}</TableCell>
                                <TableCell className={entry.balance > 0 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                                  {entry.balance}
                                </TableCell>
                                <TableCell>{entry.notes || "-"}</TableCell>
                              </TableRow>
                            ))}
                            {crateLedgerData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  No crate transactions found for this retailer
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone and will also remove any related cashbook entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteTransaction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTransaction}
              disabled={deleteTransactionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>);}