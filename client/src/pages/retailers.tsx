import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { z } from "zod";
import { Plus, Edit, Trash2, Users, TrendingUp, IndianRupee, Package } from "lucide-react";

const retailerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
});

type RetailerFormData = z.infer<typeof retailerSchema>;

export default function RetailerManagement() {
  const [open, setOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RetailerFormData>({
    resolver: zodResolver(retailerSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      address: "",
      gstNumber: "",
      panNumber: "",
    },
  });

  const { data: retailers = [], isLoading } = useQuery({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers");
      return response.json();
    },
  });

  const createRetailerMutation = useMutation({
    mutationFn: async (data: RetailerFormData) => {
      const response = await authenticatedApiRequest("POST", "/api/retailers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Retailer created",
        description: "New retailer has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create retailer",
        variant: "destructive",
      });
    },
  });

  const updateRetailerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RetailerFormData> }) => {
      const response = await authenticatedApiRequest("PUT", `/api/retailers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Retailer updated",
        description: "Retailer has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setOpen(false);
      setEditingRetailer(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update retailer",
        variant: "destructive",
      });
    },
  });

  const deleteRetailerMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/retailers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Retailer deleted",
        description: "Retailer has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete retailer",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (retailer: any) => {
    setEditingRetailer(retailer);
    form.reset({
      name: retailer.name,
      contactPerson: retailer.contactPerson || "",
      phone: retailer.phone || "",
      address: retailer.address || "",
      gstNumber: retailer.gstNumber || "",
      panNumber: retailer.panNumber || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this retailer?")) {
      deleteRetailerMutation.mutate(id);
    }
  };

  const onSubmit = (data: RetailerFormData) => {
    if (editingRetailer) {
      updateRetailerMutation.mutate({ id: editingRetailer.id, data });
    } else {
      createRetailerMutation.mutate(data);
    }
  };

  const handleCreateNew = () => {
    setEditingRetailer(null);
    form.reset();
    setOpen(true);
  };

  const filteredRetailers = retailers.filter((retailer: any) =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (retailer.contactPerson && retailer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (retailer.phone && retailer.phone.includes(searchTerm))
  );

  // Calculate summary stats
  const totalRetailers = retailers.length;
  const totalUdhaar = retailers.reduce((sum: number, retailer: any) => 
    sum + parseFloat(retailer.udhaaarBalance || "0"), 0
  );
  const totalShortfall = retailers.reduce((sum: number, retailer: any) => 
    sum + parseFloat(retailer.shortfallBalance || "0"), 0
  );
  const totalCrates = retailers.reduce((sum: number, retailer: any) => 
    sum + (retailer.crateBalance || 0), 0
  );

  // Define table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: (value: string) => value || "-",
    },
    {
      accessorKey: "udhaaarBalance",
      header: "Udhaar Balance",
      cell: (value: string) => (
        <span className={parseFloat(value || "0") > 0 ? "text-orange-600 font-medium" : ""}>
          ₹{parseFloat(value || "0").toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "shortfallBalance",
      header: "Shortfall Balance",
      cell: (value: string) => (
        <span className={parseFloat(value || "0") > 0 ? "text-red-600 font-medium" : ""}>
          ₹{parseFloat(value || "0").toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "crateBalance",
      header: "Crates",
      cell: (value: number) => (
        <Badge variant="secondary">{value || 0}</Badge>
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
            title="Edit Retailer"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(value)}
            data-testid={`button-delete-${value}`}
            title="Delete Retailer"
            disabled={deleteRetailerMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Retailer Management</h2>
              <p className="text-sm text-muted-foreground">
                Manage your retail customers and track their balances
              </p>
            </div>
            <Button onClick={handleCreateNew} data-testid="button-add-retailer">
              <Plus className="h-4 w-4 mr-2" />
              Add Retailer
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Retailers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRetailers}</div>
                <p className="text-xs text-muted-foreground">Active retailers</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Udhaar</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalUdhaar.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Credit balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shortfall</CardTitle>
                <IndianRupee className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalShortfall.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground">Deficit balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Crates</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalCrates}</div>
                <p className="text-xs text-muted-foreground">With retailers</p>
              </CardContent>
            </Card>
          </div>

          {/* Retailers Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Retailers</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search retailers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredRetailers}
                columns={columns}
                searchTerm={searchTerm}
                searchFields={["name", "contactPerson", "phone"]}
                isLoading={isLoading}
                enableRowSelection={true}
                rowKey="id"
              />
            </CardContent>
          </Card>
          </div>
        </main>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRetailer ? "Edit Retailer" : "Add New Retailer"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter retailer name" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person" {...field} data-testid="input-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input placeholder="GST number" {...field} data-testid="input-gst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input placeholder="PAN number" {...field} data-testid="input-pan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRetailerMutation.isPending || updateRetailerMutation.isPending}
                  data-testid="button-submit"
                >
                  {createRetailerMutation.isPending || updateRetailerMutation.isPending
                    ? "Saving..." 
                    : editingRetailer 
                    ? "Update Retailer" 
                    : "Create Retailer"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}