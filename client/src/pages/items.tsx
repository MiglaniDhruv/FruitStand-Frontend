import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function Items() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
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

  const filteredItems = items?.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.quality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = selectedVendor === "all" || item.vendorId === selectedVendor;
    return matchesSearch && matchesVendor;
  }) || [];

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

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id === vendorId);
    return vendor?.name || "Unknown";
  };

  // Define table columns
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
      cell: (value: string) => getVendorName(value),
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
              <div className="flex items-center justify-between">
                <CardTitle>All Items</CardTitle>
                <div className="flex items-center space-x-4">
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="w-48" data-testid="select-vendor-filter">
                      <SelectValue placeholder="Filter by vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors?.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-items"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredItems}
                columns={columns}
                searchTerm={searchTerm}
                searchFields={["name", "quality"]}
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