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
  FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Ledgers() {
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedRetailer, setSelectedRetailer] = useState("all");
  const [selectedBankAccount, setSelectedBankAccount] = useState("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });

  // Fetch all data needed for ledgers
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["/api/purchase-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/purchase-invoices");
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

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/payments");
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

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/expenses");
      return response.json();
    },
  });

  const { data: crateTransactions = [] } = useQuery({
    queryKey: ["/api/crate-transactions"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/crate-transactions");
      return response.json();
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors");
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

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["/api/expense-categories"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/expense-categories");
      return response.json();
    },
  });

  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v: any) => v.id === vendorId);
    return vendor?.name || "Unknown Vendor";
  };

  const getRetailerName = (retailerId: string) => {
    const retailer = retailers.find((r: any) => r.id === retailerId);
    return retailer?.name || "Unknown Retailer";
  };

  const getBankAccountName = (accountId: string) => {
    const account = bankAccounts.find((a: any) => a.id === accountId);
    return account?.bankName || "Unknown Bank";
  };

  const getCategoryName = (categoryId: string) => {
    const category = expenseCategories.find((c: any) => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  // Filter data by date range
  const filterByDate = (data: any[], dateField: string) => {
    return data.filter((item) => {
      const itemDate = parseISO(item[dateField]);
      const startDate = parseISO(dateFilter.startDate);
      const endDate = parseISO(dateFilter.endDate);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredPurchases = filterByDate(purchaseInvoices, "invoiceDate");
  const filteredSales = filterByDate(salesInvoices, "invoiceDate");
  const filteredPayments = filterByDate(payments, "paymentDate");
  const filteredSalesPayments = filterByDate(salesPayments, "paymentDate");
  const filteredExpenses = filterByDate(expenses, "expenseDate");
  const filteredCrateTransactions = filterByDate(crateTransactions, "transactionDate");

  // 1. Board Book - Summary of all transactions
  const getBoardBookEntries = () => {
    const entries: any[] = [];

    // Add purchase invoices
    filteredPurchases.forEach(purchase => {
      entries.push({
        date: purchase.invoiceDate,
        description: `Purchase from ${getVendorName(purchase.vendorId)} - Invoice ${purchase.invoiceNumber}`,
        type: "Purchase",
        debit: parseFloat(purchase.totalAmount || "0"),
        credit: 0,
        reference: purchase.invoiceNumber,
      });
    });

    // Add sales invoices
    filteredSales.forEach(sale => {
      entries.push({
        date: sale.invoiceDate,
        description: `Sale to ${getRetailerName(sale.retailerId)} - Invoice ${sale.invoiceNumber}`,
        type: "Sale",
        debit: 0,
        credit: parseFloat(sale.totalAmount || "0"),
        reference: sale.invoiceNumber,
      });
    });

    // Add purchase payments
    filteredPayments.forEach(payment => {
      const purchase = purchaseInvoices.find(p => p.id === payment.invoiceId);
      entries.push({
        date: payment.paymentDate,
        description: `Payment to ${getVendorName(purchase?.vendorId || "")} - ${payment.paymentMode}`,
        type: "Payment Out",
        debit: 0,
        credit: parseFloat(payment.amount || "0"),
        reference: `PAY-${payment.id?.slice(0, 8)}`,
      });
    });

    // Add sales payments
    filteredSalesPayments.forEach(payment => {
      const sale = salesInvoices.find(s => s.id === payment.salesInvoiceId);
      entries.push({
        date: payment.paymentDate,
        description: `Payment from ${getRetailerName(sale?.retailerId || "")} - ${payment.paymentMode}`,
        type: "Payment In",
        debit: parseFloat(payment.amount || "0"),
        credit: 0,
        reference: `REC-${payment.id?.slice(0, 8)}`,
      });
    });

    // Add expenses
    filteredExpenses.forEach(expense => {
      entries.push({
        date: expense.expenseDate,
        description: `${getCategoryName(expense.categoryId)} - ${expense.description}`,
        type: "Expense",
        debit: 0,
        credit: parseFloat(expense.amount || "0"),
        reference: `EXP-${expense.id?.slice(0, 8)}`,
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 2. Cashbook - Cash inflows/outflows
  const getCashbookEntries = () => {
    const entries: any[] = [];
    let runningBalance = 0;

    // Sales payments in cash
    const cashSalesPayments = filteredSalesPayments.filter((p: any) => p.paymentMode === "Cash");
    cashSalesPayments.forEach((payment: any) => {
      const sale = salesInvoices.find((s: any) => s.id === payment.salesInvoiceId);
      const amount = parseFloat(payment.amount || "0");
      runningBalance += amount;
      entries.push({
        date: payment.paymentDate,
        description: `Cash receipt from ${getRetailerName(sale?.retailerId || "")}`,
        inflow: amount,
        outflow: 0,
        balance: runningBalance,
      });
    });

    // Purchase payments in cash
    const cashPurchasePayments = filteredPayments.filter((p: any) => p.paymentMode === "Cash");
    cashPurchasePayments.forEach((payment: any) => {
      const purchase = purchaseInvoices.find((p: any) => p.id === payment.invoiceId);
      const amount = parseFloat(payment.amount || "0");
      runningBalance -= amount;
      entries.push({
        date: payment.paymentDate,
        description: `Cash payment to ${getVendorName(purchase?.vendorId || "")}`,
        inflow: 0,
        outflow: amount,
        balance: runningBalance,
      });
    });

    // Cash expenses
    const cashExpenses = filteredExpenses.filter((e: any) => e.paymentMode === "Cash");
    cashExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || "0");
      runningBalance -= amount;
      entries.push({
        date: expense.expenseDate,
        description: `Cash expense - ${expense.description}`,
        inflow: 0,
        outflow: amount,
        balance: runningBalance,
      });
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // 3. Bankbook - Bank/UPI/Cheque inflows/outflows
  const getBankbookEntries = () => {
    const entries: any[] = [];

    // Non-cash sales payments
    const bankSalesPayments = filteredSalesPayments.filter((p: any) => p.paymentMode !== "Cash");
    bankSalesPayments.forEach((payment: any) => {
      const sale = salesInvoices.find((s: any) => s.id === payment.salesInvoiceId);
      entries.push({
        date: payment.paymentDate,
        description: `${payment.paymentMode} receipt from ${getRetailerName(sale?.retailerId || "")}`,
        bankAccount: getBankAccountName(payment.bankAccountId || ""),
        debit: parseFloat(payment.amount || "0"),
        credit: 0,
        paymentMode: payment.paymentMode,
      });
    });

    // Non-cash purchase payments
    const bankPurchasePayments = filteredPayments.filter((p: any) => p.paymentMode !== "Cash");
    bankPurchasePayments.forEach((payment: any) => {
      const purchase = purchaseInvoices.find((p: any) => p.id === payment.invoiceId);
      entries.push({
        date: payment.paymentDate,
        description: `${payment.paymentMode} payment to ${getVendorName(purchase?.vendorId || "")}`,
        bankAccount: getBankAccountName(payment.bankAccountId || ""),
        debit: 0,
        credit: parseFloat(payment.amount || "0"),
        paymentMode: payment.paymentMode,
      });
    });

    // Non-cash expenses
    const bankExpenses = filteredExpenses.filter((e: any) => e.paymentMode !== "Cash");
    bankExpenses.forEach((expense: any) => {
      entries.push({
        date: expense.expenseDate,
        description: `${expense.paymentMode} expense - ${expense.description}`,
        bankAccount: getBankAccountName(expense.bankAccountId || ""),
        debit: 0,
        credit: parseFloat(expense.amount || "0"),
        paymentMode: expense.paymentMode,
      });
    });

    const filteredEntries = selectedBankAccount === "all" 
      ? entries 
      : entries.filter(e => e.bankAccount === getBankAccountName(selectedBankAccount));

    return filteredEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 4. Vapari Book (Vendor Ledger) - Vendor-wise purchases, payments, balances
  const getVendorLedgerEntries = () => {
    if (selectedVendor === "all") return [];

    const entries: any[] = [];
    let runningBalance = 0;

    // Vendor purchases
    const vendorPurchases = filteredPurchases.filter((p: any) => p.vendorId === selectedVendor);
    vendorPurchases.forEach((purchase: any) => {
      const amount = parseFloat(purchase.totalAmount || "0");
      runningBalance += amount;
      entries.push({
        date: purchase.invoiceDate,
        description: `Purchase Invoice ${purchase.invoiceNumber}`,
        debit: amount,
        credit: 0,
        balance: runningBalance,
        type: "Purchase",
      });
    });

    // Vendor payments
    const vendorPayments = filteredPayments.filter((payment: any) => {
      const purchase = purchaseInvoices.find((p: any) => p.id === payment.invoiceId);
      return purchase?.vendorId === selectedVendor;
    });
    vendorPayments.forEach((payment: any) => {
      const amount = parseFloat(payment.amount || "0");
      runningBalance -= amount;
      entries.push({
        date: payment.paymentDate,
        description: `Payment via ${payment.paymentMode}`,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        type: "Payment",
      });
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // 5. Retailer Ledger - Retailer-wise sales, payments, balances
  const getRetailerLedgerEntries = () => {
    if (selectedRetailer === "all") return [];

    const entries: any[] = [];
    let runningBalance = 0;

    // Retailer sales
    const retailerSales = filteredSales.filter((s: any) => s.retailerId === selectedRetailer);
    retailerSales.forEach((sale: any) => {
      const amount = parseFloat(sale.totalAmount || "0");
      runningBalance += amount;
      entries.push({
        date: sale.invoiceDate,
        description: `Sales Invoice ${sale.invoiceNumber}`,
        debit: amount,
        credit: 0,
        balance: runningBalance,
        type: "Sale",
      });
    });

    // Retailer payments
    const retailerPayments = filteredSalesPayments.filter((payment: any) => {
      const sale = salesInvoices.find((s: any) => s.id === payment.salesInvoiceId);
      return sale?.retailerId === selectedRetailer;
    });
    retailerPayments.forEach((payment: any) => {
      const amount = parseFloat(payment.amount || "0");
      runningBalance -= amount;
      entries.push({
        date: payment.paymentDate,
        description: `Payment received via ${payment.paymentMode}`,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        type: "Payment",
      });
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // 6. Udhaar Book - Retailer outstanding credit balances
  const getUdhaarBookEntries = () => {
    const retailerBalances: any[] = [];

    retailers.forEach((retailer: any) => {
      // Calculate total sales to this retailer
      const retailerSales = filteredSales.filter((s: any) => s.retailerId === retailer.id);
      const totalSales = retailerSales.reduce((sum: any, sale: any) => sum + parseFloat(sale.totalAmount || "0"), 0);

      // Calculate total payments from this retailer
      const retailerPayments = filteredSalesPayments.filter((payment: any) => {
        const sale = salesInvoices.find((s: any) => s.id === payment.salesInvoiceId);
        return sale?.retailerId === retailer.id;
      });
      const totalPayments = retailerPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || "0"), 0);

      const outstandingBalance = totalSales - totalPayments;

      // Only include retailers with outstanding credit balances (positive amounts)
      if (outstandingBalance > 0) {
        const lastSaleDate = retailerSales.length > 0 
          ? Math.max(...retailerSales.map(s => new Date(s.invoiceDate).getTime()))
          : null;

        retailerBalances.push({
          retailer,
          totalSales,
          totalPayments,
          outstandingBalance,
          lastSaleDate: lastSaleDate ? new Date(lastSaleDate) : null,
          invoiceCount: retailerSales.length,
        });
      }
    });

    return retailerBalances.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  };

  // 7. Crate Ledger - Retailer-wise crate issues, returns, balances
  const getCrateLedgerEntries = () => {
    if (selectedRetailer === "all") {
      // Show summary for all retailers
      const retailerCrateBalances: any[] = [];

      retailers.forEach((retailer: any) => {
        const retailerTransactions = filteredCrateTransactions.filter((t: any) => t.retailerId === retailer.id);
        
        const cratesGiven = retailerTransactions
          .filter((t: any) => t.transactionType === "Given")
          .reduce((sum: any, t: any) => sum + parseInt(t.quantity || "0"), 0);
        
        const cratesReturned = retailerTransactions
          .filter((t: any) => t.transactionType === "Returned")
          .reduce((sum: any, t: any) => sum + parseInt(t.quantity || "0"), 0);
        
        const balance = cratesGiven - cratesReturned;

        if (cratesGiven > 0 || cratesReturned > 0) {
          retailerCrateBalances.push({
            retailer,
            cratesGiven,
            cratesReturned,
            balance,
            transactions: retailerTransactions.length,
          });
        }
      });

      return retailerCrateBalances;
    } else {
      // Show detailed transactions for selected retailer
      const retailerTransactions = filteredCrateTransactions.filter((t: any) => t.retailerId === selectedRetailer);
      let runningBalance = 0;

      return retailerTransactions.map((transaction: any) => {
        const quantity = parseInt(transaction.quantity || "0");
        if (transaction.transactionType === "Given") {
          runningBalance += quantity;
        } else {
          runningBalance -= quantity;
        }

        return {
          ...transaction,
          balance: runningBalance,
        };
      }).sort((a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
    }
  };

  const boardBookEntries = getBoardBookEntries();
  const cashbookEntries = getCashbookEntries();
  const bankbookEntries = getBankbookEntries();
  const vendorLedgerEntries = getVendorLedgerEntries();
  const retailerLedgerEntries = getRetailerLedgerEntries();
  const udhaarBookEntries = getUdhaarBookEntries();
  const crateLedgerEntries = getCrateLedgerEntries();

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
            <div className="flex items-center space-x-2">
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
          <Tabs defaultValue="board-book" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="board-book" data-testid="tab-board-book">Board Book</TabsTrigger>
              <TabsTrigger value="cashbook" data-testid="tab-cashbook">Cashbook</TabsTrigger>
              <TabsTrigger value="bankbook" data-testid="tab-bankbook">Bankbook</TabsTrigger>
              <TabsTrigger value="vapari-book" data-testid="tab-vapari-book">Vapari Book</TabsTrigger>
              <TabsTrigger value="retailer-ledger" data-testid="tab-retailer-ledger">Retailer Ledger</TabsTrigger>
              <TabsTrigger value="udhaar-book" data-testid="tab-udhaar-book">Udhaar Book</TabsTrigger>
              <TabsTrigger value="crate-ledger" data-testid="tab-crate-ledger">Crate Ledger</TabsTrigger>
            </TabsList>

            {/* 1. Board Book */}
            <TabsContent value="board-book">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Book className="h-5 w-5" />
                    <span>Board Book - All Transactions Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {boardBookEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={
                              entry.type === "Sale" ? "default" :
                              entry.type === "Payment In" ? "default" :
                              "secondary"
                            }>
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell><code className="text-xs">{entry.reference}</code></TableCell>
                          <TableCell>{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</TableCell>
                          <TableCell className="text-green-600">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {boardBookEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No transactions found for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Cashbook */}
            <TabsContent value="cashbook">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Cashbook - Cash Inflows & Outflows</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Inflow</TableHead>
                        <TableHead>Outflow</TableHead>
                        <TableHead>Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashbookEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-green-600">
                            {entry.inflow > 0 ? formatCurrency(entry.inflow) : "-"}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {entry.outflow > 0 ? formatCurrency(entry.outflow) : "-"}
                          </TableCell>
                          <TableCell className={entry.balance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {formatCurrency(entry.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {cashbookEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No cash transactions found for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Bankbook */}
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
                        <SelectValue placeholder="All bank accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {bankAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName} - {account.accountNumber?.slice(-4)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Bank Account</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankbookEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{entry.bankAccount}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.paymentMode}</Badge>
                          </TableCell>
                          <TableCell className="text-green-600">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {bankbookEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No bank transactions found for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Vapari Book (Vendor Ledger) */}
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
                        {vendors.map((vendor: any) => (
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
                          <TableHead>Type</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorLedgerEntries.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell>
                              <Badge variant={entry.type === "Purchase" ? "destructive" : "default"}>
                                {entry.type}
                              </Badge>
                            </TableCell>
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
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No transactions found for this vendor in the selected period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 5. Retailer Ledger */}
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
                        {retailers.map((retailer: any) => (
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
                          <TableHead>Type</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retailerLedgerEntries.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell>
                              <Badge variant={entry.type === "Sale" ? "default" : "secondary"}>
                                {entry.type}
                              </Badge>
                            </TableCell>
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
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No transactions found for this retailer in the selected period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6. Udhaar Book */}
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
                        <TableHead>Invoices</TableHead>
                        <TableHead>Last Sale Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {udhaarBookEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{entry.retailer.name}</TableCell>
                          <TableCell>{formatCurrency(entry.totalSales)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(entry.totalPayments)}</TableCell>
                          <TableCell className="text-amber-600 font-bold">
                            {formatCurrency(entry.outstandingBalance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.invoiceCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {entry.lastSaleDate ? format(entry.lastSaleDate, "dd/MM/yyyy") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {udhaarBookEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No outstanding credit balances found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 7. Crate Ledger */}
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
                        {retailers.map((retailer: any) => (
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
                        {crateLedgerEntries.map((entry: any, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{entry.retailer.name}</TableCell>
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
                            <TableCell>{entry.transactions}</TableCell>
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