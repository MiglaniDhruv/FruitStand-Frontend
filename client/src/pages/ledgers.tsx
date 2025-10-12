import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
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
  Search
} from "lucide-react";
import { format } from "date-fns";

export default function Ledgers() {
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedRetailer, setSelectedRetailer] = useState("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });
  const [searchInput, setSearchInput] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [selectedBankAccount, setSelectedBankAccount] = useState("all");
  const [activeTab, setActiveTab] = useState("cashbook");

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
    enabled: selectedBankAccount !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("bankAccountId", selectedBankAccount);
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/bankbook?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Bankbook API error: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: vendorLedgerData = [], isLoading: vendorLedgerLoading } = useQuery({
    queryKey: ["/api/ledger/vendor", selectedVendor, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedVendor !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledger/vendor/${selectedVendor}?${params.toString()}`);
      return response.json();
    },
  });

  const { data: retailerLedgerData = [], isLoading: retailerLedgerLoading } = useQuery({
    queryKey: ["/api/ledgers/retailer", selectedRetailer, dateFilter.startDate, dateFilter.endDate],
    placeholderData: (prevData) => prevData,
    enabled: selectedRetailer !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append("fromDate", dateFilter.startDate);
      if (dateFilter.endDate) params.append("toDate", dateFilter.endDate);
      const response = await authenticatedApiRequest("GET", `/api/ledgers/retailer/${selectedRetailer}?${params.toString()}`);
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

  if (isInitialLoading) {
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

  if (hasError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
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
      </div>
    );
  }

  const formatCurrency = (amount: string | number | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') {
      return '₹0';
    }
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
  };



  // Filter handler functions
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
  };

  const handleTransactionTypeChange = (value: string) => {
    setTransactionTypeFilter(value);
  };

  // Filter functions for each ledger type
  const filterLedgerEntries = (entries: any[]) => {
    if (!searchInput && transactionTypeFilter === "all") return entries;

    return entries.filter(entry => {
      const matchesSearch = !searchInput || entry.description?.toLowerCase().includes(searchInput.toLowerCase());

      let matchesType = true;
      if (transactionTypeFilter !== 'all') {
        switch (transactionTypeFilter) {
          case 'Opening':
          case 'Closing':
            matchesType = entry.isBalanceEntry && entry.type === transactionTypeFilter;
            break;
          case 'Receipt':
            matchesType = !entry.isBalanceEntry && Number(entry.debit) > 0;
            break;
          case 'Payment':
            matchesType = !entry.isBalanceEntry && Number(entry.credit) > 0 && entry.referenceType !== 'Expense';
            break;
          case 'Expense':
            matchesType = !entry.isBalanceEntry && Number(entry.credit) > 0 && entry.referenceType === 'Expense';
            break;
          default:
            matchesType = true;
        }
      }
      return matchesSearch && matchesType;
    });
  };

  const filterVendorLedgerEntries = (entries: any[]) => {
    if (!searchInput && transactionTypeFilter === "all") return entries;
    
    return entries.filter(entry => {
      const matchesSearch = !searchInput || entry.description?.toLowerCase().includes(searchInput.toLowerCase());
      let matchesType = true;
      if (transactionTypeFilter !== "all") {
        const map: Record<string, string> = {
          Purchase: 'Invoice',
          Payment: 'Payment',
        };
        if (map[transactionTypeFilter]) {
          matchesType = entry.referenceType === map[transactionTypeFilter];
        }
      }
      return matchesSearch && matchesType;
    });
  };

  const filterRetailerLedgerEntries = (entries: any[]) => {
    if (!searchInput && transactionTypeFilter === "all") return entries;
    
    return entries.filter(entry => {
      const matchesSearch = !searchInput || entry.description?.toLowerCase().includes(searchInput.toLowerCase());
      let matchesType = true;
      if (transactionTypeFilter !== "all") {
        const map: Record<string, string> = {
          Sale: 'Sales Invoice',
          Receipt: 'Sales Payment',
        };
        if (map[transactionTypeFilter]) {
          matchesType = entry.referenceType === map[transactionTypeFilter];
        }
      }
      return matchesSearch && matchesType;
    });
  };

  const filterUdhaarBookEntries = (entries: any[]) => {
    if (!searchInput) return entries;
    const q = searchInput.toLowerCase();
    return entries.filter(entry => {
      const name = entry.retailerName || entry.retailer?.name;
      return name?.toLowerCase().includes(q);
    });
  };

  const filterCrateLedgerEntries = (entries: any[]) => {
    if (!searchInput && transactionTypeFilter === "all") return entries;
    
    return entries.filter(entry => {
      let matchesSearch = true;
      let matchesType = true;
      
      // Check if this is summary view (has retailerName property) or detailed view (has transactionType property)
      if (entry.retailerName) {
        matchesSearch = !searchInput || entry.retailerName.toLowerCase().includes(searchInput.toLowerCase());
        matchesType = true;
      } else if (entry.transactionType) {
        // Detailed view
        matchesSearch = !searchInput || (entry.notes && entry.notes.toLowerCase().includes(searchInput.toLowerCase()));
        
        if (transactionTypeFilter !== "all") {
          // Map UI filter values to crate transaction types
          const typeMapping: { [key: string]: string } = {
            "Receipt": "Returned",  // Crates returned = receipt of crates back
            "Payment": "Given",     // Crates given = payment of crates out
          };
          
          // Check if the filter maps to a crate transaction type, otherwise skip filtering
          if (typeMapping[transactionTypeFilter]) {
            matchesType = entry.transactionType === typeMapping[transactionTypeFilter];
          } else {
            // For transaction types that don't apply to crates (Sale, Purchase, etc.), show all
            matchesType = true;
          }
        }
      }
      
      return matchesSearch && matchesType;
    });
  };





  const cashbookEntries = filterLedgerEntries(cashbookData);
  const bankbookEntries = filterLedgerEntries(bankbookData);
  const vendorLedgerEntries = filterVendorLedgerEntries(vendorLedgerData);
  const retailerLedgerEntries = filterRetailerLedgerEntries(retailerLedgerData);
  const udhaarBookEntries = filterUdhaarBookEntries(
    udhaarBookData.map((entry: any) => ({
      ...entry,
      udhaarBalance: entry.udhaarBalance ?? entry.udhaaarBalance ?? 0
    }))
  );
  const crateLedgerEntries = filterCrateLedgerEntries(crateLedgerData);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Business Ledgers</h2>
              <p className="text-sm text-muted-foreground">
                Complete ledger management system for APMC operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by party name or description..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  className="pl-8"
                  data-testid="input-search-ledgers"
                />
              </div>
              <Select value={transactionTypeFilter} onValueChange={handleTransactionTypeChange}>
                <SelectTrigger className="w-40" data-testid="select-transaction-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Opening">Opening</SelectItem>
                  <SelectItem value="Closing">Closing</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
                data-testid="input-end-date"
              />
              <Button variant="outline" data-testid="button-export-ledger">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* KPI Cards */}
          {kpiData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cash Balance</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(kpiData.cashBalance)}
                      </p>
                      <p className="text-sm mt-1 text-muted-foreground">Current cash in hand</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="text-lg text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Bank Balance</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(kpiData.totalBankBalance)}
                      </p>
                      <p className="text-sm mt-1 text-muted-foreground">Across all bank accounts</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="text-lg text-blue-600" />
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
                      {cashbookLoading && cashbookEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {cashbookEntries.map((entry: any, index: number) => (
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
                          {cashbookEntries.length === 0 && (
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
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a bank account to view transactions
                    </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankbookLoading && bankbookEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Loading transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {bankbookEntries.map((entry: any, index: number) => (
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
                            {bankbookEntries.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a vendor to view their ledger
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorLedgerLoading && vendorLedgerEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Loading transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {vendorLedgerEntries.map((entry, index) => (
                              <TableRow key={index}>
                                <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
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
                            {vendorLedgerEntries.length === 0 && (
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
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a retailer to view their ledger
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retailerLedgerLoading && retailerLedgerEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Loading transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {retailerLedgerEntries.map((entry, index) => (
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
                            {retailerLedgerEntries.length === 0 && (
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
                      {udhaarBookLoading && udhaarBookEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Loading outstanding balances...
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {udhaarBookEntries.map((entry, index) => (
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
                          {udhaarBookEntries.length === 0 && (
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
                        {crateLedgerLoading && crateLedgerEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Loading crate transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {crateLedgerEntries.map((entry: any, index) => (
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
                            {crateLedgerEntries.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  No crate transactions found
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
                        {crateLedgerLoading && crateLedgerEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Loading crate transactions...
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {crateLedgerEntries.map((entry: any, index) => (
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
                            {crateLedgerEntries.length === 0 && (
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
    </div>
  );
}