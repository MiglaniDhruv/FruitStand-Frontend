import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PaginationOptions, PaginatedResult, InvoiceWithItems } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Trash2, Search } from "lucide-react";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";
import { format } from "date-fns";
import { authenticatedApiRequest } from "@/lib/auth";
import { buildPaginationParams } from "@/lib/pagination";
import { useTenantSlug } from "@/contexts/tenant-slug-context";
import { useToast } from "@/hooks/use-toast";
import { logEventHandlerError, logMutationError, logNavigationError } from "@/lib/error-logger";

export default function PurchaseInvoices() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "invoiceDate",
    sortOrder: "desc"
  });
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [, setLocation] = useLocation();
  const { slug } = useTenantSlug();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/purchase-invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Purchase invoice has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
    },
    onError: (error) => {
      logMutationError(error, 'deletePurchaseInvoice');
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
      
      if (confirm("Are you sure you want to delete this purchase invoice? This action cannot be undone.")) {
        await deleteInvoiceMutation.mutateAsync(id);
      }
    } catch (error) {
      logEventHandlerError(error, 'handleDelete', { invoiceId: id });
      toast({
        title: "Error",
        description: "Failed to delete purchase invoice",
        variant: "destructive",
      });
    }
  };

  // Fetch data
  const { data: invoicesResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<InvoiceWithItems>>({
    queryKey: ["/api/purchase-invoices", paginationOptions, statusFilter],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      
      const response = await authenticatedApiRequest("GET", `/api/purchase-invoices?${params.toString()}`);
      return response.json();
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

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "vendor.name",
      header: "Vendor",
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
      accessorKey: "netAmount",
      header: "Net Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "paidAmount",
      header: "Paid Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value: string) => (
        <Badge className={getStatusColor(value)} variant="secondary">
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
            data-testid={`button-view-invoice-${invoice.id}`}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(invoice.id)}
            data-testid={`button-delete-invoice-${invoice.id}`}
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
  const paginationMetadata = invoicesResult?.pagination;

  const getStatusColor = (status: string) => {
    try {
      if (!status) {
        return "bg-muted text-muted-foreground";
      }
      
      switch (status) {
        case "Paid":
          return "bg-status-paid/10 text-status-paid border-status-paid/20";
        case "Pending":
        case "Unpaid":
          return "bg-status-pending/10 text-status-pending border-status-pending/20";
        case "Partial":
        case "Partially Paid":
          return "bg-status-partial/10 text-status-partial border-status-partial/20";
        default:
          return "bg-muted text-muted-foreground";
      }
    } catch (error) {
      logEventHandlerError(error, 'getStatusColor', { status });
      return "bg-muted text-muted-foreground"; // Safe default
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
      setLocation(`/${slug}/purchase-invoices/${invoice.id}`);
    } catch (error) {
      logNavigationError(error, `purchase-invoice-${invoice?.id}`);
      toast({
        title: "Error",
        description: "Failed to navigate to invoice details",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <h1 className="text-xl sm:text-2xl font-bold text-destructive mb-4">Error Loading Purchase Invoices</h1>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error ? error.message : "Failed to load purchase invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground heading-page">Purchase Invoices</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage purchase invoices and track payments
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>
        
        <Separator className="my-0" />

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 sm:p-7" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
          <Card shadow="md">
            <CardHeader size="default" className="pb-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Invoices</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices by number or vendor..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-invoices"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent size="default">
              <DataTable
                data={invoices}
                columns={columns}
                paginationMetadata={paginationMetadata}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isFetching}
                enableRowSelection={true}
                rowKey="id"
              />
            </CardContent>
          </Card>
        </main>
      </div>

      <PurchaseInvoiceModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </AppLayout>);}