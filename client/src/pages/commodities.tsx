import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import CommodityForm from "@/components/forms/commodity-form";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";

export default function Commodities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingCommodity, setEditingCommodity] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commodities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/commodities"],
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const deleteCommodityMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/commodities/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Commodity deleted",
        description: "Commodity has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/commodities"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete commodity",
        variant: "destructive",
      });
    },
  });

  const filteredCommodities = commodities?.filter((commodity: any) => {
    const matchesSearch = commodity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commodity.quality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = selectedVendor === "all" || commodity.vendorId === selectedVendor;
    return matchesSearch && matchesVendor;
  }) || [];

  const handleEdit = (commodity: any) => {
    setEditingCommodity(commodity);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this commodity?")) {
      deleteCommodityMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCommodity(null);
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id === vendorId);
    return vendor?.name || "Unknown";
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Commodities</h2>
              <p className="text-sm text-muted-foreground">
                Manage commodity types, qualities, and pricing
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} data-testid="button-add-commodity">
              <Plus className="mr-2 h-4 w-4" />
              Add Commodity
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Commodities</CardTitle>
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
                      placeholder="Search commodities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-commodities"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading commodities...
                      </TableCell>
                    </TableRow>
                  ) : filteredCommodities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No commodities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommodities.map((commodity: any) => (
                      <TableRow key={commodity.id} data-testid={`commodity-row-${commodity.id}`}>
                        <TableCell className="font-medium">{commodity.name}</TableCell>
                        <TableCell>{commodity.quality}</TableCell>
                        <TableCell>{getVendorName(commodity.vendorId)}</TableCell>
                        <TableCell>
                          <Badge variant={commodity.isActive ? "default" : "secondary"}>
                            {commodity.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(commodity)}
                              data-testid={`button-edit-commodity-${commodity.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(commodity.id)}
                              data-testid={`button-delete-commodity-${commodity.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <CommodityForm
        open={showForm}
        onOpenChange={handleCloseForm}
        commodity={editingCommodity}
      />
    </div>
  );
}
