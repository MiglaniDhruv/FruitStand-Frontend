import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
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

export default function Items() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc"
  });
  const [searchInput, setSearchInput] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: itemsResult, isLoading } = useQuery<PaginatedResult<ItemWithVendor>>({
    queryKey: ["/api/items", paginationOptions],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);

      
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
  


  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const getVendorName = (item: ItemWithVendor) => {
    return item.vendor ? item.vendor.name : "Unknown Vendor";
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

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Items</h2>
              <p className="text-sm text-muted-foreground">
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
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Items</CardTitle>
                </div>
                <div className="flex items-center gap-2">
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
                isLoading={isLoading}
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
    </div>
  );
}