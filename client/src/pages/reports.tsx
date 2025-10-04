import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedApiRequest } from "@/lib/auth";
import { 
  BarChart3,
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Users,
  Package,
  Receipt,
  Calendar,
  Download,
  Eye,
  Filter,
  Percent,
  Target,
  Activity,
  PieChart,
  AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, parseISO, isWithinInterval } from "date-fns";

interface ReportFilter {
  startDate: string;
  endDate: string;
  retailer?: string;
  category?: string;
  paymentMode?: string;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // Fetch all data for reports
  const { data: purchaseInvoices = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["/api/purchase-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/purchase-invoices");
      return response.json();
    },
  });

  const { data: salesInvoices = [], isLoading: salesLoading } = useQuery({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/sales-invoices");
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

  const { data: retailers = [] } = useQuery({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers");
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

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["/api/expense-categories"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/expense-categories");
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

  // Filter data by date range
  const filterByDate = (data: any[], dateField: string) => {
    const startDate = parseISO(filters.startDate);
    const endDate = parseISO(filters.endDate);
    
    return data.filter((item) => {
      try {
        const dateValue = item[dateField];
        if (!dateValue) return false;
        
        // Handle both ISO strings and Date objects
        const itemDate = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
        
        // Check if date is valid
        if (isNaN(itemDate.getTime())) {
          console.warn(`Invalid date found: ${dateValue}`);
          return false;
        }
        
        return isWithinInterval(itemDate, { start: startDate, end: endDate });
      } catch (error) {
        console.warn(`Error parsing date for ${dateField}:`, error);
        return false;
      }
    });
  };

  const filteredPurchases = filterByDate(purchaseInvoices, "invoiceDate");
  const filteredSales = filterByDate(salesInvoices, "invoiceDate");
  const filteredExpenses = filterByDate(expenses, "paymentDate");
  const filteredPayments = filterByDate(payments, "paymentDate");
  const filteredSalesPayments = filterByDate(salesPayments, "paymentDate");

  // Calculate key metrics
  const totalPurchases = filteredPurchases.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);
  const totalSales = filteredSales.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const totalPurchasePayments = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || "0"), 0);
  const totalSalesPayments = filteredSalesPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || "0"), 0);
  const netCashFlow = totalSalesPayments - totalPurchasePayments - totalExpenses;

  // Outstanding amounts
  const purchaseOutstanding = filteredPurchases.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount || "0"), 0);
  const salesOutstanding = filteredSales.reduce((sum, inv) => sum + parseFloat(inv.udhaaarAmount || "0"), 0);

  // Top performers
  const retailerSales = filteredSales.reduce((acc: any, sale) => {
    const retailerId = sale.retailerId;
    const amount = parseFloat(sale.totalAmount || "0");
    acc[retailerId] = (acc[retailerId] || 0) + amount;
    return acc;
  }, {});

  const topRetailers = Object.entries(retailerSales)
    .map(([retailerId, amount]) => ({
      retailer: retailers.find((r: any) => r.id === retailerId),
      amount: amount as number,
    }))
    .filter(item => item.retailer)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const vendorPurchases = filteredPurchases.reduce((acc: any, purchase) => {
    const vendorId = purchase.vendorId;
    const amount = parseFloat(purchase.totalAmount || "0");
    acc[vendorId] = (acc[vendorId] || 0) + amount;
    return acc;
  }, {});

  const topVendors = Object.entries(vendorPurchases)
    .map(([vendorId, amount]) => ({
      vendor: vendors.find((v: any) => v.id === vendorId),
      amount: amount as number,
    }))
    .filter(item => item.vendor)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Expense breakdown
  const expenseBreakdown = filteredExpenses.reduce((acc: any, expense) => {
    const categoryId = expense.categoryId;
    const amount = parseFloat(expense.amount || "0");
    acc[categoryId] = (acc[categoryId] || 0) + amount;
    return acc;
  }, {});

  const topExpenseCategories = Object.entries(expenseBreakdown)
    .map(([categoryId, amount]) => ({
      category: expenseCategories.find((c: any) => c.id === categoryId),
      amount: amount as number,
    }))
    .filter(item => item.category)
    .sort((a, b) => b.amount - a.amount);

  // Payment mode analysis
  const paymentModeAnalysis = [...filteredPayments, ...filteredSalesPayments].reduce((acc: any, payment) => {
    const mode = payment.paymentMode;
    const amount = parseFloat(payment.amount || "0");
    const type = payment.vendorId ? "Purchase" : "Sales";
    
    if (!acc[mode]) acc[mode] = { purchase: 0, sales: 0, total: 0 };
    acc[mode][type.toLowerCase()] += amount;
    acc[mode].total += amount;
    return acc;
  }, {});

  // Recent activity (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentPurchases = purchaseInvoices.filter((inv: any) => {
    try {
      if (!inv.invoiceDate) return false;
      return isWithinInterval(parseISO(inv.invoiceDate), { start: sevenDaysAgo, end: new Date() });
    } catch (error) {
      return false;
    }
  }).length;
  const recentSales = salesInvoices.filter((inv: any) => {
    try {
      if (!inv.invoiceDate) return false;
      return isWithinInterval(parseISO(inv.invoiceDate), { start: sevenDaysAgo, end: new Date() });
    } catch (error) {
      return false;
    }
  }).length;
  const recentExpenses = expenses.filter((exp: any) => {
    try {
      const dateField = exp.expenseDate || exp.paymentDate;
      if (!dateField) return false;
      return isWithinInterval(parseISO(dateField), { start: sevenDaysAgo, end: new Date() });
    } catch (error) {
      return false;
    }
  }).length;

  if (purchasesLoading || salesLoading) {
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
              <h2 className="text-2xl font-semibold text-foreground">Business Reports</h2>
              <p className="text-sm text-muted-foreground">
                Comprehensive business analytics and insights
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
              <Button variant="outline" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className={`h-4 w-4 ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{grossProfit.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Sales - Purchases</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Target className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netProfit.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">After expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <Percent className={`h-4 w-4 ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Net profit margin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
                <Activity className={`h-4 w-4 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netCashFlow.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Net cash flow</p>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
              <TabsTrigger value="purchases">Purchase Analysis</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payments">Payment Analysis</TabsTrigger>
              <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales vs Purchases */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Sales vs Purchases</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Sales</span>
                      <span className="text-green-600 font-semibold">₹{totalSales.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Purchases</span>
                      <span className="text-red-600 font-semibold">₹{totalPurchases.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Expenses</span>
                      <span className="text-orange-600 font-semibold">₹{totalExpenses.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center font-medium">
                        <span>Net Position</span>
                        <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ₹{netProfit.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Recent Activity (7 days)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Sales</span>
                      <Badge variant="outline" className="text-green-600">{recentSales}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Purchases</span>
                      <Badge variant="outline" className="text-blue-600">{recentPurchases}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Expenses</span>
                      <Badge variant="outline" className="text-orange-600">{recentExpenses}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Retailers by Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topRetailers.map((item, index) => (
                        <div key={item.retailer.id} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{item.retailer.name}</span>
                          </div>
                          <span className="text-green-600 font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                      {topRetailers.length === 0 && (
                        <p className="text-muted-foreground text-sm">No sales data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Vendors by Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVendors.map((item, index) => (
                        <div key={item.vendor.id} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{item.vendor.name}</span>
                          </div>
                          <span className="text-red-600 font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                      {topVendors.length === 0 && (
                        <p className="text-muted-foreground text-sm">No purchase data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">₹{totalSales.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">{filteredSales.length} invoices</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{filteredSales.length > 0 ? (totalSales / filteredSales.length).toLocaleString("en-IN") : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Per invoice</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Sales Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">₹{salesOutstanding.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">Pending receipts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sales by Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Pending", "Partial", "Paid"].map(status => {
                        const statusSales = filteredSales.filter(s => s.paymentStatus === status);
                        const statusAmount = statusSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || "0"), 0);
                        const percentage = totalSales > 0 ? (statusAmount / totalSales) * 100 : 0;
                        
                        return (
                          <TableRow key={status}>
                            <TableCell>
                              <Badge variant={status === "Paid" ? "default" : status === "Partial" ? "secondary" : "destructive"}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell>{statusSales.length}</TableCell>
                            <TableCell>₹{statusAmount.toLocaleString("en-IN")}</TableCell>
                            <TableCell>{percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchases" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">₹{totalPurchases.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">{filteredPurchases.length} invoices</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Purchase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{filteredPurchases.length > 0 ? (totalPurchases / filteredPurchases.length).toLocaleString("en-IN") : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Per invoice</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Purchase Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">₹{purchaseOutstanding.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">Pending payments</p>
                  </CardContent>
                </Card>
              </div>

              {/* Vendor Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Invoices</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Average</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topVendors.map((item) => {
                        const vendorInvoices = filteredPurchases.filter(p => p.vendorId === item.vendor.id);
                        const avgAmount = vendorInvoices.length > 0 ? item.amount / vendorInvoices.length : 0;
                        
                        return (
                          <TableRow key={item.vendor.id}>
                            <TableCell className="font-medium">{item.vendor.name}</TableCell>
                            <TableCell>{vendorInvoices.length}</TableCell>
                            <TableCell>₹{item.amount.toLocaleString("en-IN")}</TableCell>
                            <TableCell>₹{avgAmount.toLocaleString("en-IN")}</TableCell>
                          </TableRow>
                        );
                      })}
                      {topVendors.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No purchase data available for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">₹{totalExpenses.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toLocaleString("en-IN") : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Per transaction</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Expense Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : "0"}%
                    </div>
                    <p className="text-xs text-muted-foreground">Of total sales</p>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Transactions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topExpenseCategories.map((item) => {
                        const percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                        const categoryExpenses = filteredExpenses.filter(e => e.categoryId === item.category.id);
                        
                        return (
                          <TableRow key={item.category.id}>
                            <TableCell className="font-medium">{item.category.name}</TableCell>
                            <TableCell className="text-orange-600">₹{item.amount.toLocaleString("en-IN")}</TableCell>
                            <TableCell>{percentage.toFixed(1)}%</TableCell>
                            <TableCell>{categoryExpenses.length}</TableCell>
                          </TableRow>
                        );
                      })}
                      {topExpenseCategories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No expense data available for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">₹{totalSalesPayments.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">From sales</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Payments Made</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">₹{totalPurchasePayments.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">For purchases</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Net Payment Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(totalSalesPayments - totalPurchasePayments) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{(totalSalesPayments - totalPurchasePayments).toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-muted-foreground">Received minus paid</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Mode Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Mode Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Sales Received</TableHead>
                        <TableHead>Purchase Payments</TableHead>
                        <TableHead>Net Flow</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(paymentModeAnalysis).map(([mode, data]: [string, any]) => (
                        <TableRow key={mode}>
                          <TableCell>
                            <Badge variant="outline">{mode}</Badge>
                          </TableCell>
                          <TableCell className="text-green-600">₹{data.sales.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-red-600">₹{data.purchase.toLocaleString("en-IN")}</TableCell>
                          <TableCell className={data.sales - data.purchase >= 0 ? "text-green-600" : "text-red-600"}>
                            ₹{(data.sales - data.purchase).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(paymentModeAnalysis).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No payment data available for the selected period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outstanding" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span>Sales Outstanding</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600 mb-4">
                      ₹{salesOutstanding.toLocaleString("en-IN")}
                    </div>
                    <div className="space-y-2">
                      {filteredSales.filter(s => parseFloat(s.udhaaarAmount || "0") > 0)
                        .sort((a, b) => parseFloat(b.udhaaarAmount || "0") - parseFloat(a.udhaaarAmount || "0"))
                        .slice(0, 5)
                        .map((sale) => {
                          const retailer = retailers.find((r: any) => r.id === sale.retailerId);
                          return (
                            <div key={sale.id} className="flex justify-between items-center text-sm">
                              <span>{retailer?.name || "Unknown"}</span>
                              <span className="text-amber-600 font-medium">
                                ₹{parseFloat(sale.udhaaarAmount || "0").toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span>Purchase Outstanding</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600 mb-4">
                      ₹{purchaseOutstanding.toLocaleString("en-IN")}
                    </div>
                    <div className="space-y-2">
                      {filteredPurchases.filter(p => parseFloat(p.balanceAmount || "0") > 0)
                        .sort((a, b) => parseFloat(b.balanceAmount || "0") - parseFloat(a.balanceAmount || "0"))
                        .slice(0, 5)
                        .map((purchase) => {
                          const vendor = vendors.find((v: any) => v.id === purchase.vendorId);
                          return (
                            <div key={purchase.id} className="flex justify-between items-center text-sm">
                              <span>{vendor?.name || "Unknown"}</span>
                              <span className="text-red-600 font-medium">
                                ₹{parseFloat(purchase.balanceAmount || "0").toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Outstanding Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">{salesOutstanding.toLocaleString("en-IN")}</div>
                      <div className="text-sm text-muted-foreground">To Receive</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{purchaseOutstanding.toLocaleString("en-IN")}</div>
                      <div className="text-sm text-muted-foreground">To Pay</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold ${(salesOutstanding - purchaseOutstanding) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(salesOutstanding - purchaseOutstanding).toLocaleString("en-IN")}
                      </div>
                      <div className="text-sm text-muted-foreground">Net Outstanding</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}