import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { logEventHandlerError, logMutationError, logNavigationError } from "@/lib/error-logger";
import { Plus } from "lucide-react";
import {
  FileText,
  IndianRupee,
  Users,
  TrendingUp,
  Eye,
  Trash2,
  Search,
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/sales-invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Sales invoice has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
    },
    onError: (error) => {
      logMutationError(error, 'deleteSalesInvoice');
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
      
      if (confirm("Are you sure you want to delete this sales invoice? This action cannot be undone.")) {
        await deleteInvoiceMutation.mutateAsync(id);
      }
    } catch (error) {
      logEventHandlerError(error, 'handleDelete', { invoiceId: id });
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
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
          <span className={amount > 0 ? "text-red-600 font-medium" : ""}>
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
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
        return "bg-chart-1/10 text-chart-1";
      case "Partial":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Sales Invoices
            </h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error
                ? error.message
                : "Failed to load sales invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
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
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Sales Invoices
              </h2>
              <p className="text-sm text-muted-foreground">
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

        {/* Summary Cards */}
        <div className="p-6 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Udhaar Amount
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{totalUdhaar.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Shortfall
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalShortfall.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Deficit from paid invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invoices
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Invoices</CardTitle>
                </div>
                <div className="flex items-center gap-2">
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
                      className="w-48"
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
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Sales Invoice Modal */}
      <SalesInvoiceModal
        open={open}
        onOpenChange={setOpen}
        editingInvoice={editingInvoice}
      />
    </div>
  );
}
