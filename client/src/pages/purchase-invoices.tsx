import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this purchase invoice? This action cannot be undone.")) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  // Fetch data
  const { data: invoicesResult, isLoading, isError, error } = useQuery<PaginatedResult<InvoiceWithItems>>({
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
    switch (status) {
      case "Paid":
        return "bg-chart-2/10 text-chart-2";
      case "Pending":
      case "Unpaid":
        return "bg-chart-1/10 text-chart-1";
      case "Partially Paid":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setLocation(`/${slug}/purchase-invoices/${invoice.id}`);
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
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Purchase Invoices</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : "Failed to load purchase invoices. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
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
              <h2 className="text-2xl font-semibold text-foreground">Purchase Invoices</h2>
              <p className="text-sm text-muted-foreground">
                Manage purchase invoices and track payments
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
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
                      placeholder="Search invoices by number or vendor..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-invoices"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
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
            <CardContent>
              <DataTable
                data={invoices}
                columns={columns}
                paginationMetadata={paginationMetadata}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isLoading}
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
    </div>
  );
}