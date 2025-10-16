import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, optimisticDelete } from "@/hooks/use-optimistic-mutation";
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
import { Plus, Eye, Trash2, Search, FileText, Pencil } from "lucide-react";
import PurchaseInvoiceModal from "@/components/forms/purchase-invoice-modal";
import { format } from "date-fns";
import { authenticatedApiRequest } from "@/lib/auth";
import { buildPaginationParams } from "@/lib/pagination";
import { useTenantSlug } from "@/contexts/tenant-slug-context";
import { toast } from "@/hooks/use-toast";
import { logEventHandlerError, logMutationError, logNavigationError } from "@/lib/error-logger";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

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
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithItems | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    invoiceId: string;
    invoiceNumber: string;
  }>({
    open: false,
    invoiceId: "",
    invoiceNumber: ""
  });
  
  const [, setLocation] = useLocation();
  const { slug } = useTenantSlug();
  const queryClient = useQueryClient();

  const deleteInvoiceMutation = useOptimisticMutation<void, string>({
    mutationFn: async (id) => { await authenticatedApiRequest("DELETE", `/api/purchase-invoices/${id}`); },
    queryKey: ["/api/purchase-invoices", paginationOptions, statusFilter],
    updateFn: (old, id) => optimisticDelete(old, id),
    onSuccess: () => {
      toast.success("Invoice deleted", "Purchase invoice has been deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
    },
    onError: (error) => {
      logMutationError(error, 'deletePurchaseInvoice');
      toast.error(
        "Error",
        error.message || "Failed to delete invoice",
        {
          onRetry: () => {
            if (deleteConfirm.invoiceId) {
              deleteInvoiceMutation.mutateAsync(deleteConfirm.invoiceId);
            }
          }
        }
      );
    },
  });

  const handleCreateNew = () => {
    try {
      setEditingInvoice(null);
      setShowCreateModal(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateNew');
      toast.error("Error", "Failed to open create invoice form");
    }
  };

  const handleDelete = (invoice: any) => {
    setDeleteConfirm({
      open: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    });
  };

  const handleEdit = (invoice: InvoiceWithItems) => {
    try {
      setEditingInvoice(invoice);
      setShowCreateModal(true);
    } catch (error) {
      logEventHandlerError(error, 'handleEdit');
      toast.error("Error", "Failed to open edit invoice form");
    }
  };

  const confirmDelete = async () => {
    try {
      if (!deleteConfirm.invoiceId) {
        throw new Error('Invalid invoice ID');
      }
      
      await deleteInvoiceMutation.mutateAsync(deleteConfirm.invoiceId);
      setDeleteConfirm({ open: false, invoiceId: "", invoiceNumber: "" });
    } catch (error) {
      logEventHandlerError(error, 'confirmDelete', { invoiceId: deleteConfirm.invoiceId });
      toast.error("Error", "Failed to delete purchase invoice");
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

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ["/api/purchase-invoices"] });
  };

  const handleSwipeDelete = async (invoice: any) => {
    if (invoice && invoice.id) {
      handleDelete(invoice);
    }
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
          {invoice.status === "Unpaid" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(invoice)}
              data-testid={`button-edit-${invoice.id}`}
              title="Edit Invoice"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(invoice)}
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
      toast.error("Error", "Failed to navigate to invoice details");
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Header skeleton */}
            <Skeleton className="h-8 w-64" />
            
            {/* Summary cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} variant="stat" />
              ))}
            </div>
            
            {/* Table skeleton */}
            <SkeletonTable rows={10} columns={6} showHeader={true} />
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
            <Button onClick={handleCreateNew} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>
        
        <Separator className="my-0" />

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 sm:p-7">
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
                      data-search-input
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
                emptyStateIcon={FileText}
                emptyStateTitle="No purchase invoices yet"
                searchTerm={searchInput}
                hasActiveFilters={statusFilter !== 'all'}
                onRefresh={handleRefresh}
                enableSwipeToDelete={true}
                onSwipeDelete={handleSwipeDelete}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      <PurchaseInvoiceModal 
        key={editingInvoice ? editingInvoice.id : 'create'}
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        invoice={editingInvoice}
      />
      
      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, invoiceId: "", invoiceNumber: "" })}
        title="Delete Purchase Invoice"
        description={`Are you sure you want to delete invoice "${deleteConfirm.invoiceNumber}"? This action cannot be undone.`}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteInvoiceMutation.isPending}
      />
    </AppLayout>);}