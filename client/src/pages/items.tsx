import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import ItemForm from "@/components/forms/item-form";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { PaginationOptions, PaginatedResult, ItemWithVendor } from "@shared/schema";
import { logEventHandlerError, logMutationError } from "@/lib/error-logger";

type StatusFilter = "all" | "true" | "false";

export default function Items() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc"
  });
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: itemsResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<ItemWithVendor>>({
    queryKey: ["/api/items", paginationOptions, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);

      // Only add isActive filter if it's not "all"
      if (statusFilter !== "all") {
        params.append("isActive", statusFilter);
      }
      
      const response = await authenticatedApiRequest("GET", `/api/items?${params.toString()}`);
      return response.json();
    },
    placeholderData: keepPreviousData,
  });



  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "Item has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    },
    onError: (error) => {
      logMutationError(error, 'deleteItem');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
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
  
  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPaginationOptions(prev => ({ ...prev, page: 1 }));
  };


  const handleEdit = (item: any) => {
    try {
      if (!item) {
        throw new Error('Invalid item data');
      }
      setEditingItem(item);
      setShowForm(true);
    } catch (error) {
      logEventHandlerError(error, 'handleEdit', { itemId: item?.id });
      toast({
        title: "Error",
        description: "Failed to open item for editing",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!id) {
        throw new Error('Invalid item ID');
      }
      
      if (confirm("Are you sure you want to delete this item?")) {
        await deleteItemMutation.mutateAsync(id);
      }
    } catch (error) {
      logEventHandlerError(error, 'handleDelete', { itemId: id });
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleCloseForm = () => {
    try {
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      logEventHandlerError(error, 'handleCloseForm');
      toast({
        title: "Error",
        description: "Failed to close form",
        variant: "destructive",
      });
    }
  };

  const getVendorName = (item: ItemWithVendor) => {
    try {
      if (!item) {
        return "Unknown Item";
      }
      return item.vendor ? item.vendor.name : "Unknown Vendor";
    } catch (error) {
      logEventHandlerError(error, 'getVendorName', { itemId: item?.id });
      return "Error Loading Vendor";
    }
  };  // Define table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "quality",
      header: "Quality",
      cell: (value: string) => value,
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: (value: string) => (
        <Badge variant="outline">
          {value?.charAt(0).toUpperCase() + value?.slice(1) || "N/A"}
        </Badge>
      ),
    },
    {
      accessorKey: "vendorId",
      header: "Vendor",
      cell: (value: string, row: ItemWithVendor) => getVendorName(row),
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
      cell: (value: string, row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row)}
            data-testid={`button-edit-${value}`}
            title="Edit Item"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(value)}
            data-testid={`button-delete-${value}`}
            title="Delete Item"
            disabled={deleteItemMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col">
          <div className="p-4 sm:p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
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
            <h2 className="text-xl sm:text-2xl font-semibold text-red-600">Error Loading Items</h2>
            <p className="text-gray-600 max-w-md">
              {error instanceof Error ? error.message : "Failed to load items. Please try again."}
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
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Items</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage item types, qualities, and details
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} data-testid="button-add-item">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6" style={{ paddingBottom: 'calc(var(--footer-h, 72px) + 8px)' }}>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Items</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items by name or quality..."
                      value={searchInput}
                      onChange={handleSearchInputChange}
                      className="pl-8"
                      data-testid="input-search-items"
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
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={itemsResult?.data || []}
                columns={columns}
                paginationMetadata={itemsResult?.pagination}
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

      <ItemForm
        open={showForm}
        onOpenChange={handleCloseForm}
        item={editingItem}
      />
    </AppLayout>);}