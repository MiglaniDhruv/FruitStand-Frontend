import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Edit, DollarSign, Star, Users } from "lucide-react";
import VendorForm from "@/components/forms/vendor-form";
import VendorPaymentForm from "@/components/forms/vendor-payment-form";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logEventHandlerError, logMutationError } from "@/lib/error-logger";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PaginationOptions, PaginatedResult, Vendor } from "../../../shared/schema";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptimisticMutation, optimisticUpdate } from "@/hooks/use-optimistic-mutation";

export default function Vendors() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc",
    status: "active" // Default to showing only active vendors
  });
  const [searchInput, setSearchInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [showVendorPaymentModal, setShowVendorPaymentModal] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendorsResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<Vendor>>({
    queryKey: ["/api/vendors", paginationOptions],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      if (paginationOptions.status) params.append('status', paginationOptions.status);
      
      const response = await authenticatedApiRequest("GET", `/api/vendors?${params.toString()}`);
      return response.json();
    },
    placeholderData: (prev) => prev,
  });

  const toggleFavouriteMutation = useOptimisticMutation<any, string>({
    mutationFn: async (id) => {
      const response = await authenticatedApiRequest("PATCH", `/api/vendors/${id}/favourite`);
      return response.json();
    },
    queryKey: ["/api/vendors", paginationOptions],
    updateFn: (old, id) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((vendor: any) => 
          vendor.id === id 
            ? { ...vendor, isFavourite: !vendor.isFavourite }
            : vendor
        )
      };
    },
    onSuccess: () => {
      toast({
        title: "Favourite updated",
        description: "Vendor favourite status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] }); // Refresh dashboard
    },
    onError: (error) => {
      logMutationError(error, 'toggleFavourite');
      toast.error("Error", error.message || "Failed to update favourite status", {
        onRetry: () => toggleFavouriteMutation.mutateAsync(toggleFavouriteMutation.variables!),
      });
    },
  });

  const handlePageChange = (page: number) => {
    setPaginationOptions(prev => ({ ...prev, page }));
  };
  
  const handlePageSizeChange = (limit: number) => {
    setPaginationOptions(prev => ({ ...prev, limit, page: 1 }));
  };
  
  const handleSearchChange = (search: string) => {
    setPaginationOptions(prev => ({ ...prev, search, page: 1 }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };
  
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleStatusChange = (status: string) => {
    setPaginationOptions(prev => ({ ...prev, status, page: 1 }));
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "isFavourite",
      header: "Favourite",
      cell: (value: boolean, row: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavourite(row.id, value);
          }}
          title={value ? "Remove from favourites" : "Add to favourites"}
          disabled={toggleFavouriteMutation.isPending}
          className="h-8 w-8"
        >
          <Star 
            className={`h-4 w-4 ${value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
          />
        </Button>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: (value: string) => (
        <div className="max-w-xs truncate" title={value || ""}>
          {value || "-"}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: (value: string) => `₹${parseFloat(value || '0').toLocaleString('en-IN')}`,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: (_: string, vendor: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRecordPayment(vendor)}
            title="Record Payment"
            data-testid={`button-record-payment-vendor-${vendor.id}`}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(vendor)}
            data-testid={`button-edit-vendor-${vendor.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (vendor: any) => {
    try {
      if (!vendor) {
        throw new Error('Invalid vendor data');
      }
      setEditingVendor(vendor);
      setShowForm(true);
    } catch (error) {
      logEventHandlerError(error, 'handleEdit', { vendorId: vendor?.id });
      toast({
        title: "Error",
        description: "Failed to open vendor for editing",
        variant: "destructive",
      });
    }
  };



  const handleCloseForm = () => {
    try {
      setShowForm(false);
      setEditingVendor(null);
    } catch (error) {
      logEventHandlerError(error, 'handleCloseForm');
      toast({
        title: "Error",
        description: "Failed to close form",
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = (vendor: any) => {
    try {
      if (!vendor || !vendor.id) {
        throw new Error('Invalid vendor data for payment');
      }
      setSelectedVendorForPayment(vendor);
      setShowVendorPaymentModal(true);
    } catch (error) {
      logEventHandlerError(error, 'handleRecordPayment', { vendorId: vendor?.id });
      toast({
        title: "Error",
        description: "Failed to open payment form",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavourite = async (id: string, currentStatus: boolean) => {
    try {
      if (!id) {
        throw new Error('Invalid vendor ID');
      }
      await toggleFavouriteMutation.mutateAsync(id);
    } catch (error) {
      logEventHandlerError(error, 'handleToggleFavourite', { vendorId: id });
      toast({
        title: "Error",
        description: "Failed to toggle favourite status",
        variant: "destructive",
      });
    }
  };

  const handleCloseVendorPaymentModal = () => {
    setShowVendorPaymentModal(false);
    setSelectedVendorForPayment(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Header skeleton */}
            <Skeleton className="h-8 w-64" />
            
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
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="text-center space-y-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-red-600 heading-page">Error Loading Vendors</h1>
            <p className="text-gray-600 max-w-md">
              {error instanceof Error ? error.message : "Failed to load vendors. Please try again."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
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
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground heading-page">Vendors</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your vendor information and contacts
              </p>
            </div>
            <PermissionGuard permission={PERMISSIONS.MANAGE_VENDORS}>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-vendor">
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </PermissionGuard>
          </div>
        </header>

        <Separator className="my-0" />

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 sm:p-7">
          <Card shadow="md">
            <CardHeader className="pb-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle>All Vendors</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors by name or contact person..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-vendors"
                    />
                  </div>
                  <Select
                    value={paginationOptions.status || "active"}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                      <SelectItem value="all">All Vendors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={vendorsResult?.data || []}
                columns={columns}
                paginationMetadata={vendorsResult?.pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isFetching}
                enableRowSelection={true}
                rowKey="id"
                emptyStateIcon={Users}
                emptyStateTitle="No vendors yet"
                onEmptyAction={() => setShowForm(true)}
                emptyActionLabel="Add Vendor"
                searchTerm={searchInput}
                hasActiveFilters={paginationOptions.status !== 'active' && paginationOptions.status !== undefined}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      <VendorForm
        open={showForm}
        onOpenChange={handleCloseForm}
        vendor={editingVendor}
      />

      <VendorPaymentForm
        open={showVendorPaymentModal}
        onOpenChange={handleCloseVendorPaymentModal}
        vendorId={selectedVendorForPayment?.id || ""}
        vendorName={selectedVendorForPayment?.name}
      />
    </AppLayout>
  );
}
