import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, optimisticDelete } from "@/hooks/use-optimistic-mutation";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SalesInvoiceWithDetails,
} from "@shared/schema";
import { buildPaginationParams } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SalesInvoiceModal from "@/components/forms/sales-invoice-modal";
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { logEventHandlerError, logMutationError, logNavigationError } from "@/lib/error-logger";
import { Plus } from "lucide-react";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  IndianRupee,
  Users,
  TrendingUp,
  Eye,
  Trash2,
  Search,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTenantSlug } from "@/contexts/tenant-slug-context";

export default function SalesInvoiceManagement() {
  const [open, setOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>(
    {
      page: 1,
      limit: 10,
      search: "",
      sortBy: "invoiceDate",
      sortOrder: "desc",
    }
  );
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteInvoiceMutation = useOptimisticMutation<void, string>({
    mutationFn: async (id) => { await authenticatedApiRequest("DELETE", `/api/sales-invoices/${id}`); },
    queryKey: ["/api/sales-invoices", paginationOptions, statusFilter],
    updateFn: (old, id) => optimisticDelete(old, id),
    onSuccess: () => {
      toast.success("Success", "Sales invoice deleted successfully");
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error) => {
      logMutationError(error, 'deleteSalesInvoice');
      toast.error(
        "Error",
        error.message || "Failed to delete invoice",
        {
          onRetry: () => {
            if (invoiceToDelete) {
              deleteInvoiceMutation.mutateAsync(invoiceToDelete);
            }
          }
        }
      );
    },
  });

  const handleDelete = (id: string) => {
    if (!id) {
      toast.error("Error", "Invalid invoice ID");
      return;
    }
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      await deleteInvoiceMutation.mutateAsync(invoiceToDelete);
    }
  };

  const [, setLocation] = useLocation();
  const { slug } = useTenantSlug();

  // Queries
  const {
    data: invoicesResult,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery<PaginatedResult<SalesInvoiceWithDetails>>({
    queryKey: ["/api/sales-invoices", paginationOptions, statusFilter],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (paginationOptions.page || 1).toString(),
        limit: (paginationOptions.limit || 10).toString(),
        search: paginationOptions.search || "",
        sortBy: paginationOptions.sortBy || "invoiceDate",
        sortOrder: paginationOptions.sortOrder || "desc",
      });

      // Only add status filter if it's not "all"
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await authenticatedApiRequest(
        "GET",
        `/api/sales-invoices?${params.toString()}`
      );
      return response.json();
    },
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPaginationOptions((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setPaginationOptions((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions((prev) => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder as "asc" | "desc",
    }));
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPaginationOptions((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const handleCreateNew = () => {
    try {
      setEditingInvoice(null);
      setOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateNew');
      toast({
        title: "Error",
        description: "Failed to open new invoice form",
        variant: "destructive",
      });
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
      setLocation(`/${slug}/sales-invoices/${invoice.id}`);
    } catch (error) {
      logNavigationError(error, `sales-invoice-${invoice?.id}`);
      toast({
        title: "Error",
        description: "Failed to navigate to invoice details",
        variant: "destructive",
      });
    }
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
      cell: (value: string) => (
        <div className="font-medium">{value || "AUTO"}</div>
      ),
    },
    {
      accessorKey: "retailer.name",
      header: "Retailer",
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
      accessorKey: "totalAmount",
      header: "Total Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "paidAmount",
      header: "Paid Amount",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "udhaaarAmount",
      header: "Udhaar",
      cell: (value: string) => `₹${parseFloat(value).toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "shortfallAmount",
      header: "Shortfall",
      cell: (value: string) => {
        const amount = parseFloat(value || "0");
        return (
          <span className={amount > 0 ? "text-destructive font-medium" : ""}>
            ₹{amount.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Payment Status",
      cell: (value: string) => (
        <Badge className={getPaymentStatusColor(value)} variant="secondary">
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
            data-testid={`button-view-${invoice.id}`}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(invoice.id)}
            data-testid={`button-delete-${invoice.id}`}
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-status-paid/10 text-status-paid border-status-paid/20";
      case "Pending":
        return "bg-status-pending/10 text-status-pending border-status-pending/20";
      case "Partial":
      case "Partially Paid":
        return "bg-status-partial/10 text-status-partial border-status-partial/20";
      default:
        return "bg-muted text-muted-foreground";
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
            <SkeletonTable rows={10} columns={7} showHeader={true} />
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
            <h2 className="text-xl sm:text-2xl font-bold text-destructive mb-4">
              Error Loading Sales Invoices
            </h2>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error
                ? error.message
                : "Failed to load sales invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.totalAmount || "0"),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.paidAmount || "0"),
    0
  );
  const totalUdhaar = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.udhaaarAmount || "0"),
    0
  );
  const totalShortfall = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.shortfallAmount || "0"),
    0
  );
  const totalInvoices = invoices.length;

  return (
    <AppLayout>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground heading-page">
                Sales Invoices
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage sales invoices and track payments
              </p>
            </div>
            <Button
              onClick={handleCreateNew}
              data-testid="button-create-invoice"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>
        
        <Separator className="my-0" />

        {/* Summary Cards */}
        <section aria-label="Sales summary statistics">
          <h2 className="sr-only">Sales Summary</h2>
          <div className="p-4 sm:p-6 bg-muted/50 border-b border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-7">
              <Card>
              <CardHeader size="default" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent size="default">
                <div className="text-xl sm:text-2xl font-bold">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader size="default" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
                            <CardContent size="default">
                <div className="text-xl sm:text-2xl font-bold text-success">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader size="default" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Udhaar Amount
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent size="default">
                <div className="text-xl sm:text-2xl font-bold text-warning">
                  ₹{totalUdhaar.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader size="default" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Shortfall Amount
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent size="default">
                <div className="text-xl sm:text-2xl font-bold text-destructive">
                  ₹{totalShortfall.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader size="default" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invoices
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent size="default">
                <div className="text-xl sm:text-2xl font-bold">{totalInvoices}</div>
              </CardContent>
            </Card>
          </div>
        </div>
        </section>
        
        <Separator className="my-0" />

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 sm:p-7">
          <section aria-label="Sales invoices table">
            <h2 className="sr-only">Invoices List</h2>
            <Card shadow="md">
            <CardHeader className="pb-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Invoices</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices by number or retailer..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-invoices"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilterChange}
                  >
                    <SelectTrigger
                      className="w-full sm:w-48"
                      data-testid="select-status-filter"
                    >
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                emptyStateTitle="No invoices yet"
                onEmptyAction={() => setOpen(true)}
                emptyActionLabel="Create Invoice"
                searchTerm={searchInput}
                hasActiveFilters={statusFilter !== 'all'}
              />
            </CardContent>
          </Card>
          </section>
        </main>
      </div>

      {/* Sales Invoice Modal */}
      <SalesInvoiceModal
        open={open}
        onOpenChange={setOpen}
        editingInvoice={editingInvoice}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Sales Invoice?"
        description="This action cannot be undone. The invoice and all associated data will be permanently deleted."
        confirmLabel="Delete Invoice"
        variant="destructive"
        isLoading={deleteInvoiceMutation.isPending}
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}
