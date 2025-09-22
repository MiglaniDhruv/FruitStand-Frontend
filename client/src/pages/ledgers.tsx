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
import { DataTable } from "@/components/ui/data-table";
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
      // Safety check: ensure item and dateField exist
      if (!item || !item[dateField]) {
        return false;
      }
      
      try {
        const itemDate = parseISO(item[dateField]);
        const startDate = parseISO(dateFilter.startDate);
        const endDate = parseISO(dateFilter.endDate);
        
        // Check if dates are valid
        if (isNaN(itemDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return false;
        }
        
        return itemDate >= startDate && itemDate <= endDate;
      } catch (error) {
        console.warn(`Error parsing date for field ${dateField}:`, item[dateField]);
        return false;
      }
    });
  };

  const filteredPurchases = filterByDate(purchaseInvoices, "invoiceDate");
  const filteredSales = filterByDate(salesInvoices, "invoiceDate");
  const filteredPayments = filterByDate(payments, "paymentDate");
  const filteredSalesPayments = filterByDate(salesPayments, "paymentDate");
  const filteredExpenses = filterByDate(expenses, "paymentDate");
  const filteredCrateTransactions = filterByDate(crateTransactions, "transactionDate");

  // Combined Cashbook - All cash and bank transactions with daily balances
  const getCombinedCashbookEntries = () => {
    const allEntries: any[] = [];

    // Sales payments (all modes)
    filteredSalesPayments.forEach((payment: any) => {
      const sale = salesInvoices.find((s: any) => s.id === payment.salesInvoiceId);
      const amount = parseFloat(payment.amount || "0");
      allEntries.push({
        date: payment.paymentDate,
        description: `${payment.paymentMode} receipt from ${getRetailerName(sale?.retailerId || "")}`,
        paymentMode: payment.paymentMode,
        bankAccount: payment.paymentMode !== "Cash" ? getBankAccountName(payment.bankAccountId || "") : "Cash",
        inflow: amount,
        outflow: 0,
        type: "Receipt",
      });
    });

    // Purchase payments (all modes)
    filteredPayments.forEach((payment: any) => {
      const purchase = purchaseInvoices.find((p: any) => p.id === payment.invoiceId);
      const amount = parseFloat(payment.amount || "0");
      allEntries.push({
        date: payment.paymentDate,
        description: `${payment.paymentMode} payment to ${getVendorName(purchase?.vendorId || "")}`,
        paymentMode: payment.paymentMode,
        bankAccount: payment.paymentMode !== "Cash" ? getBankAccountName(payment.bankAccountId || "") : "Cash",
        inflow: 0,
        outflow: amount,
        type: "Payment",
      });
    });

    // Expenses (all modes)
    filteredExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || "0");
      allEntries.push({
        date: expense.paymentDate,
        description: `${expense.paymentMode} expense - ${expense.description}`,
        paymentMode: expense.paymentMode,
        bankAccount: expense.paymentMode !== "Cash" ? getBankAccountName(expense.bankAccountId || "") : "Cash",
        inflow: 0,
        outflow: amount,
        type: "Expense",
      });
    });

    // Crate deposit transactions (cash transactions)
    filteredCrateTransactions
      .filter((transaction: any) => parseFloat(transaction.depositAmount || "0") > 0)
      .forEach((transaction: any) => {
        const amount = parseFloat(transaction.depositAmount || "0");
        const retailerName = getRetailerName(transaction.retailerId);
        
        if (transaction.transactionType === "Given") {
          // Retailer pays deposit to business (cash inflow)
          allEntries.push({
            date: transaction.transactionDate,
            description: `Crate deposit received from ${retailerName} - ${transaction.quantity} crates`,
            paymentMode: "Cash",
            bankAccount: "Cash",
            inflow: amount,
            outflow: 0,
            type: "Crate Deposit",
          });
        } else if (transaction.transactionType === "Returned") {
          // Business pays deposit back to retailer (cash outflow)
          allEntries.push({
            date: transaction.transactionDate,
            description: `Crate deposit returned to ${retailerName} - ${transaction.quantity} crates`,
            paymentMode: "Cash",
            bankAccount: "Cash",
            inflow: 0,
            outflow: amount,
            type: "Crate Deposit",
          });
        }
      });

    // Sort entries by date (with validation)
    const sortedEntries = allEntries
      .filter(entry => entry.date && !isNaN(new Date(entry.date).getTime())) // Filter out invalid dates
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance and add daily opening/closing
    let runningBalance = 0;
    const entriesWithBalance = [];
    let currentDate = "";
    let dayOpeningBalance = 0;

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      
      // Validate date before formatting
      if (!entry.date) {
        console.warn('Entry has no date, skipping:', entry);
        continue;
      }
      
      let entryDate;
      try {
        const dateObj = new Date(entry.date);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date in entry, skipping:', entry.date, entry);
          continue;
        }
        entryDate = format(dateObj, "yyyy-MM-dd");
      } catch (error) {
        console.warn('Error formatting date, skipping entry:', entry.date, error);
        continue;
      }
      
      // Add opening balance for new day
      if (entryDate !== currentDate) {
        if (currentDate !== "") {
          // Add closing balance for previous day
          entriesWithBalance.push({
            date: currentDate,
            description: "Day Closing Balance",
            paymentMode: "Balance",
            bankAccount: "All Accounts",
            inflow: 0,
            outflow: 0,
            balance: runningBalance,
            type: "Closing",
            isBalanceEntry: true,
          });
        }
        
        currentDate = entryDate;
        dayOpeningBalance = runningBalance;
        
        // Add opening balance for new day
        entriesWithBalance.push({
          date: entryDate,
          description: "Day Opening Balance",
          paymentMode: "Balance",
          bankAccount: "All Accounts",
          inflow: 0,
          outflow: 0,
          balance: runningBalance,
          type: "Opening",
          isBalanceEntry: true,
        });
      }
      
      // Calculate new balance
      runningBalance += entry.inflow - entry.outflow;
      
      // Add the actual transaction
      entriesWithBalance.push({
        ...entry,
        balance: runningBalance,
        isBalanceEntry: false,
      });
    }
    
    // Add final closing balance
    if (currentDate !== "") {
      entriesWithBalance.push({
        date: currentDate,
        description: "Day Closing Balance",
        paymentMode: "Balance",
        bankAccount: "All Accounts",
        inflow: 0,
        outflow: 0,
        balance: runningBalance,
        type: "Closing",
        isBalanceEntry: true,
      });
    }

    return entriesWithBalance;
  };


  // 2. Vapari Book (Vendor Ledger) - Vendor-wise purchases, payments, balances
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

  // 3. Retailer Ledger - Retailer-wise sales, payments, balances
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

    // Crate deposit transactions
    const retailerCrateTransactions = filteredCrateTransactions.filter((transaction: any) => 
      transaction.retailerId === selectedRetailer && parseFloat(transaction.depositAmount || "0") > 0
    );
    retailerCrateTransactions.forEach((transaction: any) => {
      const amount = parseFloat(transaction.depositAmount || "0");
      const retailerName = getRetailerName(transaction.retailerId);
      
      // "Given" transactions = retailer pays deposit (credit to business)
      // "Returned" transactions = retailer gets deposit back (debit from business)
      if (transaction.transactionType === "Given") {
        runningBalance -= amount; // Credit to business (reduces retailer's debt)
        entries.push({
          date: transaction.transactionDate,
          description: `Crate ${transaction.transactionType} - ${transaction.quantity} crates (Deposit: ₹${amount.toLocaleString('en-IN')})`,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          type: "Crate Deposit",
        });
      } else if (transaction.transactionType === "Returned") {
        runningBalance += amount; // Debit to business (increases retailer's receivable)
        entries.push({
          date: transaction.transactionDate,
          description: `Crate ${transaction.transactionType} - ${transaction.quantity} crates (Deposit: ₹${amount.toLocaleString('en-IN')})`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          type: "Crate Deposit",
        });
      }
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

  const cashbookEntries = getCombinedCashbookEntries();
  const vendorLedgerEntries = getVendorLedgerEntries();
  const retailerLedgerEntries = getRetailerLedgerEntries();
  const udhaarBookEntries = getUdhaarBookEntries();
  const crateLedgerEntries = getCrateLedgerEntries();

  // Define column configurations for all tables
  // 1. Cashbook columns
  const cashbookColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: (value: string) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "paymentMode",
      header: "Payment Mode",
      cell: (value: string, row: any) => {
        if (row.isBalanceEntry) {
          return <Badge variant="secondary">{value}</Badge>;
        }
        return <Badge variant="outline">{value}</Badge>;
      },
    },
    {
      accessorKey: "bankAccount",
      header: "Account",
    },
    {
      accessorKey: "inflow",
      header: "Inflow",
      cell: (value: number) => (
        <div className="text-green-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "outflow",
      header: "Outflow",
      cell: (value: number) => (
        <div className="text-red-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: (value: number) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(value)}
        </div>
      ),
    },
  ];

  // 2. Vendor ledger columns
  const vendorLedgerColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: (value: string) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (value: string) => (
        <Badge variant={value === "Purchase" ? "destructive" : "default"}>
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "debit",
      header: "Debit",
      cell: (value: number) => (
        <div className="text-red-600 font-medium">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: (value: number) => (
        <div className="text-green-600 font-medium">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: (value: number) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(value)}
        </div>
      ),
    },
  ];

  // 3. Retailer ledger columns
  const retailerLedgerColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: (value: string) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (value: string) => (
        <Badge variant={value === "Sale" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "debit",
      header: "Debit",
      cell: (value: number) => (
        <div className="text-red-600 font-medium">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: (value: number) => (
        <div className="text-green-600 font-medium">
          {value > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: (value: number) => (
        <div className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(value)}
        </div>
      ),
    },
  ];

  // 4. Udhaar book columns
  const udhaarBookColumns = [
    {
      accessorKey: "retailer.name",
      header: "Retailer",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "totalSales",
      header: "Total Sales",
      cell: (value: number) => formatCurrency(value),
    },
    {
      accessorKey: "totalPayments",
      header: "Total Payments",
      cell: (value: number) => <div className="text-green-600">{formatCurrency(value)}</div>,
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding Balance",
      cell: (value: number) => <div className="text-amber-600 font-bold">{formatCurrency(value)}</div>,
    },
    {
      accessorKey: "retailer.shortfallBalance",
      header: "Shortfall Amount",
      cell: (value: string) => (
        <div className="text-red-600 font-medium">
          {parseFloat(value || "0") > 0 ? formatCurrency(value) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "invoiceCount",
      header: "Invoices",
      cell: (value: number) => <Badge variant="outline">{value}</Badge>,
    },
    {
      accessorKey: "lastSaleDate",
      header: "Last Sale Date",
      cell: (value: Date) => value ? format(value, "dd/MM/yyyy") : "-",
    },
  ];

  // 5. Crate ledger summary columns
  const crateLedgerSummaryColumns = [
    {
      accessorKey: "retailer.name",
      header: "Retailer",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "cratesGiven",
      header: "Crates Given",
      cell: (value: number) => <Badge variant="outline" className="text-blue-600">{value}</Badge>,
    },
    {
      accessorKey: "cratesReturned",
      header: "Crates Returned",
      cell: (value: number) => <Badge variant="outline" className="text-green-600">{value}</Badge>,
    },
    {
      accessorKey: "balance",
      header: "Current Balance",
      cell: (value: number) => (
        <div className={`font-bold ${value > 0 ? 'text-amber-600' : 'text-green-600'}`}>
          {value}
        </div>
      ),
    },
    {
      accessorKey: "totalTransactions",
      header: "Total Transactions",
      cell: (value: number) => <Badge variant="secondary">{value}</Badge>,
    },
    {
      accessorKey: "balance",
      header: "Status",
      cell: (value: number) => {
        if (value > 0) {
          return <Badge variant="destructive">Outstanding</Badge>;
        } else if (value === 0) {
          return <Badge className="bg-green-500">Settled</Badge>;
        } else {
          return <Badge variant="secondary">No Activity</Badge>;
        }
      },
    },
  ];

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
          <Tabs defaultValue="cashbook" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cashbook" data-testid="tab-cashbook">Cashbook</TabsTrigger>
              <TabsTrigger value="vapari-book" data-testid="tab-vapari-book">Vapari Book</TabsTrigger>
              <TabsTrigger value="retailer-ledger" data-testid="tab-retailer-ledger">Retailer Ledger</TabsTrigger>
              <TabsTrigger value="udhaar-book" data-testid="tab-udhaar-book">Udhaar Book</TabsTrigger>
              <TabsTrigger value="crate-ledger" data-testid="tab-crate-ledger">Crate Ledger</TabsTrigger>
            </TabsList>


            {/* Combined Cashbook */}
            <TabsContent value="cashbook">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Cashbook - All Cash & Bank Transactions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Inflow</TableHead>
                        <TableHead>Outflow</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashbookEntries.map((entry: any, index: number) => (
                        <TableRow 
                          key={index} 
                          className={entry.isBalanceEntry ? "bg-muted/50 font-medium" : ""}
                        >
                          <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>
                            {entry.isBalanceEntry ? (
                              <Badge variant="secondary">{entry.paymentMode}</Badge>
                            ) : (
                              <Badge variant="outline">{entry.paymentMode}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{entry.bankAccount}</TableCell>
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
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No transactions found for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                      {udhaarBookEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{entry.retailer.name}</TableCell>
                          <TableCell>{formatCurrency(entry.totalSales)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(entry.totalPayments)}</TableCell>
                          <TableCell className="text-amber-600 font-bold">
                            {formatCurrency(entry.outstandingBalance)}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {parseFloat(entry.retailer.shortfallBalance || "0") > 0 
                              ? formatCurrency(entry.retailer.shortfallBalance) 
                              : "-"
                            }
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
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No outstanding credit balances found
                          </TableCell>
                        </TableRow>
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