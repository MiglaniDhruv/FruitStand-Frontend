import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { authenticatedApiRequest } from '@/lib/auth';
import { FileText, Download, FileSpreadsheet, TrendingUp, DollarSign, Users, Store, Receipt, TrendingDown, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { 
  TurnoverReportData, 
  ProfitLossReportData, 
  CommissionReportData, 
  ShortfallReportData, 
  ExpensesSummaryData, 
  VendorsListData, 
  RetailersListData 
} from '@/types';
import TurnoverReportDisplay from '@/components/reports/turnover-report-display';
import ProfitLossReportDisplay from '@/components/reports/profit-loss-report-display';
import CommissionReportDisplay from '@/components/reports/commission-report-display';
import ShortfallReportDisplay from '@/components/reports/shortfall-report-display';
import ExpensesSummaryDisplay from '@/components/reports/expenses-summary-display';
import VendorsListDisplay from '@/components/reports/vendors-list-display';
import RetailersListDisplay from '@/components/reports/retailers-list-display';

export default function Reports() {
  const { toast } = useToast();
  
  // Date filter state - first day of current year to today
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [activeTab, setActiveTab] = useState('turnover');
  
  // Downloading states for each report type
  const [downloadingPDF, setDownloadingPDF] = useState<Record<string, boolean>>({});
  const [downloadingExcel, setDownloadingExcel] = useState<Record<string, boolean>>({});

  // Data fetching with React Query - enable queries based on active tab for performance
  const isTurnoverActive = activeTab === 'turnover';
  const { data: turnoverData, isLoading: turnoverLoading, isError: turnoverError, refetch: refetchTurnover } = useQuery({
    queryKey: ['/api/reports/turnover', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      const response = await authenticatedApiRequest('GET', `/api/reports/turnover?${params}`);
      return await response.json() as TurnoverReportData;
    },
    enabled: isTurnoverActive,
    placeholderData: (prevData) => prevData,
  });

  const isProfitLossActive = activeTab === 'profit-loss';
  const { data: profitLossData, isLoading: profitLossLoading, isError: profitLossError, refetch: refetchProfitLoss } = useQuery({
    queryKey: ['/api/reports/profit-loss', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      const response = await authenticatedApiRequest('GET', `/api/reports/profit-loss?${params}`);
      return await response.json() as ProfitLossReportData;
    },
    enabled: isProfitLossActive,
    placeholderData: (prevData) => prevData,
  });

  const isCommissionActive = activeTab === 'commission';
  const { data: commissionData, isLoading: commissionLoading, isError: commissionError, refetch: refetchCommission } = useQuery({
    queryKey: ['/api/reports/commission', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      const response = await authenticatedApiRequest('GET', `/api/reports/commission?${params}`);
      return await response.json() as CommissionReportData;
    },
    enabled: isCommissionActive,
    placeholderData: (prevData) => prevData,
  });

  const isShortfallActive = activeTab === 'shortfall';
  const { data: shortfallData, isLoading: shortfallLoading, isError: shortfallError, refetch: refetchShortfall } = useQuery({
    queryKey: ['/api/reports/shortfall', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      const response = await authenticatedApiRequest('GET', `/api/reports/shortfall?${params}`);
      return await response.json() as ShortfallReportData;
    },
    enabled: isShortfallActive,
    placeholderData: (prevData) => prevData,
  });

  const isExpensesActive = activeTab === 'expenses';
  const { data: expensesData, isLoading: expensesLoading, isError: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['/api/reports/expenses', dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      const response = await authenticatedApiRequest('GET', `/api/reports/expenses?${params}`);
      return await response.json() as ExpensesSummaryData;
    },
    enabled: isExpensesActive,
    placeholderData: (prevData) => prevData,
  });

  // Vendors and Retailers - no date filtering (current state reports)
  const isVendorsActive = activeTab === 'vendors';
  const { data: vendorsData, isLoading: vendorsLoading, isError: vendorsError, refetch: refetchVendors } = useQuery({
    queryKey: ['/api/reports/vendors'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/reports/vendors');
      return await response.json() as VendorsListData;
    },
    enabled: isVendorsActive,
    placeholderData: (prevData) => prevData,
  });

  const isRetailersActive = activeTab === 'retailers';
  const { data: retailersData, isLoading: retailersLoading, isError: retailersError, refetch: refetchRetailers } = useQuery({
    queryKey: ['/api/reports/retailers'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/reports/retailers');
      return await response.json() as RetailersListData;
    },
    enabled: isRetailersActive,
    placeholderData: (prevData) => prevData,
  });

  // Export functions
  const handleDownloadPDF = async (reportType: string) => {
    try {
      setDownloadingPDF(prev => ({ ...prev, [reportType]: true }));
      
      const params = new URLSearchParams();
      if (reportType !== 'vendors' && reportType !== 'retailers') {
        if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
        if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      }
      
      const response = await authenticatedApiRequest('GET', `/api/reports/${reportType}/pdf?${params}`);
      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        throw new Error(`Failed to download PDF (${response.status}): ${msg || response.statusText}`);
      }
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${reportType}-report.pdf`;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches) filename = matches[1];
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPDF(prev => ({ ...prev, [reportType]: false }));
    }
  };

  const handleDownloadExcel = async (reportType: string) => {
    try {
      setDownloadingExcel(prev => ({ ...prev, [reportType]: true }));
      
      const params = new URLSearchParams();
      if (reportType !== 'vendors' && reportType !== 'retailers') {
        if (dateFilter.startDate) params.append('fromDate', dateFilter.startDate);
        if (dateFilter.endDate) params.append('toDate', dateFilter.endDate);
      }
      
      const response = await authenticatedApiRequest('GET', `/api/reports/${reportType}/excel?${params}`);
      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        throw new Error(`Failed to download Excel (${response.status}): ${msg || response.statusText}`);
      }
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${reportType}-report.xlsx`;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches) filename = matches[1];
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Excel file downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download Excel file',
        variant: 'destructive',
      });
    } finally {
      setDownloadingExcel(prev => ({ ...prev, [reportType]: false }));
    }
  };

  // Calculate loading state based on active tab
  const loadingByTab = {
    turnover: turnoverLoading && !turnoverData,
    'profit-loss': profitLossLoading && !profitLossData,
    commission: commissionLoading && !commissionData,
    shortfall: shortfallLoading && !shortfallData,
    expenses: expensesLoading && !expensesData,
    vendors: vendorsLoading && !vendorsData,
    retailers: retailersLoading && !retailersData,
  };
  const isInitialLoading = loadingByTab[activeTab as keyof typeof loadingByTab];

  // Loading skeleton UI
  if (isInitialLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col overflow-auto" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-8 bg-muted animate-pulse rounded"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-32 bg-muted animate-pulse rounded"></div>
              <div className="h-32 bg-muted animate-pulse rounded"></div>
              <div className="h-32 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col overflow-auto" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
        {/* Header Section */}
        <div className="p-4 sm:p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comprehensive financial reports and analytics for your business
            </p>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 items-center">
              <label htmlFor="startDate" className="text-sm font-medium">From:</label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-auto"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label htmlFor="endDate" className="text-sm font-medium">To:</label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-auto"
              />
            </div>
            <Badge variant="outline" className="ml-auto">
              Active Tab: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Badge>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
              <TabsTrigger value="turnover" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Turnover</span>
              </TabsTrigger>
              <TabsTrigger value="profit-loss" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">P&L</span>
              </TabsTrigger>
              <TabsTrigger value="commission" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Commission</span>
              </TabsTrigger>
              <TabsTrigger value="shortfall" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Shortfall</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                <span className="hidden sm:inline">Expenses</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Vendors</span>
              </TabsTrigger>
              <TabsTrigger value="retailers" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Retailers</span>
              </TabsTrigger>
            </TabsList>

            {/* Turnover Report Tab */}
            <TabsContent value="turnover">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Turnover Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('turnover')}
                      disabled={downloadingPDF.turnover}
                    >
                      {downloadingPDF.turnover ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('turnover')}
                      disabled={downloadingExcel.turnover}
                    >
                      {downloadingExcel.turnover ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {turnoverError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load turnover data.</p>
                      <Button onClick={() => refetchTurnover()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <TurnoverReportDisplay data={turnoverData} loading={turnoverLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profit & Loss Report Tab */}
            <TabsContent value="profit-loss">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Profit & Loss Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('profit-loss')}
                      disabled={downloadingPDF['profit-loss']}
                    >
                      {downloadingPDF['profit-loss'] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('profit-loss')}
                      disabled={downloadingExcel['profit-loss']}
                    >
                      {downloadingExcel['profit-loss'] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {profitLossError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load profit & loss data.</p>
                      <Button onClick={() => refetchProfitLoss()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <ProfitLossReportDisplay data={profitLossData} loading={profitLossLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Commission Report Tab */}
            <TabsContent value="commission">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Commission Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('commission')}
                      disabled={downloadingPDF.commission}
                    >
                      {downloadingPDF.commission ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('commission')}
                      disabled={downloadingExcel.commission}
                    >
                      {downloadingExcel.commission ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {commissionError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load commission data.</p>
                      <Button onClick={() => refetchCommission()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <CommissionReportDisplay data={commissionData} loading={commissionLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shortfall Report Tab */}
            <TabsContent value="shortfall">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Shortfall Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('shortfall')}
                      disabled={downloadingPDF.shortfall}
                    >
                      {downloadingPDF.shortfall ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('shortfall')}
                      disabled={downloadingExcel.shortfall}
                    >
                      {downloadingExcel.shortfall ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {shortfallError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load shortfall data.</p>
                      <Button onClick={() => refetchShortfall()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <ShortfallReportDisplay data={shortfallData} loading={shortfallLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expenses Summary Tab */}
            <TabsContent value="expenses">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Expenses Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('expenses')}
                      disabled={downloadingPDF.expenses}
                    >
                      {downloadingPDF.expenses ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('expenses')}
                      disabled={downloadingExcel.expenses}
                    >
                      {downloadingExcel.expenses ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {expensesError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load expenses data.</p>
                      <Button onClick={() => refetchExpenses()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <ExpensesSummaryDisplay data={expensesData} loading={expensesLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vendors List Tab */}
            <TabsContent value="vendors">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Vendors List
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('vendors')}
                      disabled={downloadingPDF.vendors}
                    >
                      {downloadingPDF.vendors ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('vendors')}
                      disabled={downloadingExcel.vendors}
                    >
                      {downloadingExcel.vendors ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorsError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load vendors data.</p>
                      <Button onClick={() => refetchVendors()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <VendorsListDisplay data={vendorsData} loading={vendorsLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Retailers List Tab */}
            <TabsContent value="retailers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Retailers List
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF('retailers')}
                      disabled={downloadingPDF.retailers}
                    >
                      {downloadingPDF.retailers ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel('retailers')}
                      disabled={downloadingExcel.retailers}
                    >
                      {downloadingExcel.retailers ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {retailersError ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-600">Failed to load retailers data.</p>
                      <Button onClick={() => refetchRetailers()} size="sm" className="mt-2">Retry</Button>
                    </div>
                  ) : (
                    <RetailersListDisplay data={retailersData} loading={retailersLoading} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>);}