import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { PaginationOptions, PaginatedResult, Retailer } from "../../../shared/schema";
import { buildPaginationParams } from "@/lib/pagination";
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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { logEventHandlerError, logMutationError, logFormError } from "@/lib/error-logger";
import { z } from "zod";
import { Plus, Edit, Users, TrendingUp, IndianRupee, Package, DollarSign, Search, Star } from "lucide-react";
import RetailerPaymentForm from "@/components/forms/retailer-payment-form";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptimisticMutation, optimisticCreate, optimisticUpdate } from "@/hooks/use-optimistic-mutation";

const retailerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone number is required").regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type RetailerFormData = z.infer<typeof retailerSchema>;

interface RetailerStats {
  totalRetailers: number;
  totalUdhaar: string;
  totalShortfall: string;
  totalCrates: number;
}

export default function RetailerManagement() {
  const [open, setOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<any>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc"
  });
  const [searchInput, setSearchInput] = useState("");
  const [showRetailerPaymentModal, setShowRetailerPaymentModal] = useState(false);
  const [selectedRetailerForPayment, setSelectedRetailerForPayment] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RetailerFormData>({
    resolver: zodResolver(retailerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });

  const { data: retailersResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<Retailer>>({
    queryKey: ["/api/retailers", paginationOptions],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = buildPaginationParams(paginationOptions);
      
      const response = await authenticatedApiRequest("GET", `/api/retailers?${params.toString()}`);
      return response.json();
    },

  });

  const { data: statsData, isLoading: statsLoading } = useQuery<RetailerStats>({
    queryKey: ["/api/retailers/stats"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers/stats");
      return response.json();
    },
  });

  const createRetailerMutation = useOptimisticMutation<any, RetailerFormData>({
    mutationFn: async (data) => {
      const response = await authenticatedApiRequest("POST", "/api/retailers", data);
      return response.json();
    },
    queryKey: ["/api/retailers", paginationOptions],
    updateFn: (old, newData) => {
      // Create optimistic retailer with temporary ID
      const optimisticRetailer = {
        id: `temp-${Date.now()}`,
        name: newData.name,
        phone: newData.phone,
        address: newData.address || '',
        isActive: newData.isActive,
        isFavourite: false,
        salesTotal: 0,
        paymentsTotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return optimisticCreate(old, optimisticRetailer);
    },
    onSuccess: () => {
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 500);
      toast({
        title: "Retailer created",
        description: "New retailer has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers/stats"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      logMutationError(error, 'createRetailer');
      toast.error("Error", error.message || "Failed to create retailer", {
        onRetry: () => createRetailerMutation.mutateAsync(createRetailerMutation.variables!),
      });
    },
  });

  const updateRetailerMutation = useOptimisticMutation<any, { id: string; data: Partial<RetailerFormData> }>({
    mutationFn: async ({ id, data }) => {
      const response = await authenticatedApiRequest("PUT", `/api/retailers/${id}`, data);
      return response.json();
    },
    queryKey: ["/api/retailers", paginationOptions],
    updateFn: (old, { id, data }) => optimisticUpdate(old, { id, ...data }),
    onSuccess: () => {
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 500);
      toast({
        title: "Retailer updated",
        description: "Retailer has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers/stats"] });
      setOpen(false);
      setEditingRetailer(null);
      form.reset();
    },
    onError: (error) => {
      logMutationError(error, 'updateRetailer');
      toast.error("Error", error.message || "Failed to update retailer", {
        onRetry: () => updateRetailerMutation.mutateAsync(updateRetailerMutation.variables!),
      });
    },
  });

  const toggleFavouriteMutation = useOptimisticMutation<any, string>({
    mutationFn: async (id) => {
      const response = await authenticatedApiRequest("PATCH", `/api/retailers/${id}/favourite`);
      return response.json();
    },
    queryKey: ["/api/retailers", paginationOptions],
    updateFn: (old, id) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((retailer: any) => 
          retailer.id === id 
            ? { ...retailer, isFavourite: !retailer.isFavourite }
            : retailer
        )
      };
    },
    onSuccess: () => {
      toast({
        title: "Favourite updated",
        description: "Retailer favourite status has been updated",
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

  const handleEdit = (retailer: any) => {
    try {
      if (!retailer) {
        throw new Error('Invalid retailer data');
      }
      setEditingRetailer(retailer);
      form.reset({
        name: retailer.name,
        phone: retailer.phone?.replace(/^\+91/, "") || "",
        address: retailer.address || "",
        isActive: retailer.isActive ?? true,
      });
      setOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleEdit', { retailerId: retailer?.id });
      toast({
        title: "Error",
        description: "Failed to open retailer for editing",
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = (retailer: any) => {
    try {
      if (!retailer || !retailer.id) {
        throw new Error('Invalid retailer data for payment');
      }
      setSelectedRetailerForPayment(retailer);
      setShowRetailerPaymentModal(true);
    } catch (error) {
      logEventHandlerError(error, 'handleRecordPayment', { retailerId: retailer?.id });
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
        throw new Error('Invalid retailer ID');
      }
      await toggleFavouriteMutation.mutateAsync(id);
    } catch (error) {
      logEventHandlerError(error, 'handleToggleFavourite', { retailerId: id });
      toast({
        title: "Error",
        description: "Failed to toggle favourite status",
        variant: "destructive",
      });
    }
  };

  const handleCloseRetailerPaymentModal = () => {
    try {
      setShowRetailerPaymentModal(false);
      setSelectedRetailerForPayment(null);
    } catch (error) {
      logEventHandlerError(error, 'handleCloseRetailerPaymentModal');
      toast({
        title: "Error",
        description: "Failed to close payment modal",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: RetailerFormData) => {
    try {
      if (!data || !data.name?.trim()) {
        throw new Error('Invalid form data');
      }
      
      if (editingRetailer) {
        if (!editingRetailer.id) {
          throw new Error('Invalid retailer ID for update');
        }
        await updateRetailerMutation.mutateAsync({ id: editingRetailer.id, data });
      } else {
        await createRetailerMutation.mutateAsync(data);
      }
    } catch (error) {
      logFormError(error, 'retailerForm', data);
      toast({
        title: "Error",
        description: "Failed to submit retailer form",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    try {
      setEditingRetailer(null);
      form.reset();
      setOpen(true);
    } catch (error) {
      logEventHandlerError(error, 'handleCreateNew');
      toast({
        title: "Error",
        description: "Failed to open new retailer form",
        variant: "destructive",
      });
    }
  };

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

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ["/api/retailers"] });
  };

  // Extract retailers and metadata from paginated result
  const retailers = retailersResult?.data || [];
  const paginationMetadata = retailersResult?.pagination;



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
            onClick={() => handleRecordPayment(row)}
            title="Record Payment"
            data-testid={`button-record-payment-retailer-${value}`}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row)}
            data-testid={`button-edit-${value}`}
            title="Edit Retailer"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

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
            <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4 heading-page">Error Loading Retailers</h1>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : "Failed to load retailers. Please try again."}
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
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground heading-page">Retailer Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your retail customers and track their balances
              </p>
            </div>
            <Button onClick={handleCreateNew} data-testid="button-add-retailer">
              <Plus className="h-4 w-4 mr-2" />
              Add Retailer
            </Button>
          </div>
        </header>

        <Separator className="my-0" />

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 sm:p-7 space-y-6 sm:space-y-8">

          {/* Summary Cards */}
          <section aria-label="Retailer summary statistics">
            <h2 className="sr-only">Retailer Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card>
              <CardContent size="default">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Retailers</p>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground">{statsData?.totalRetailers || 0}</p>
                    <p className="text-xs sm:text-sm mt-1 text-purple-600">Active retailers</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Users className="text-lg text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent size="default">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Udhaar</p>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground">₹{parseFloat(statsData?.totalUdhaar || "0").toLocaleString("en-IN")}</p>
                    <p className="text-xs sm:text-sm mt-1 text-green-600">Outstanding credit</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-lg text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent size="default">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Shortfall</p>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground">₹{parseFloat(statsData?.totalShortfall || "0").toLocaleString("en-IN")}</p>
                    <p className="text-xs sm:text-sm mt-1 text-red-600">Pending shortfall</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <IndianRupee className="text-lg text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent size="default">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Crates</p>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground">{statsData?.totalCrates || 0}</p>
                    <p className="text-xs sm:text-sm mt-1 text-blue-600">Crates with retailers</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Package className="text-lg text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </section>

          {/* Retailers Table */}
          <section aria-label="Retailers table">
            <h2 className="sr-only">Retailers List</h2>
            <Card shadow="md">
            <CardHeader size="default" className="pb-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Retailers</CardTitle>
                <div className="relative flex-1 max-w-full sm:max-w-sm sm:ml-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search retailers by name or contact person..."
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    className="pl-8"
                    data-testid="input-search-retailers"
                    data-search-input
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent size="default">
              <DataTable
                data={retailers}
                columns={columns}
                paginationMetadata={paginationMetadata}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isFetching}
                enableRowSelection={true}
                rowKey="id"
                emptyStateIcon={Users}
                emptyStateTitle="No retailers yet"
                searchTerm={searchInput}
                hasActiveFilters={false}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
          </section>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-4 ${showSuccessAnimation ? 'animate-success' : ''}`}>
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-0">
                        <div className="flex h-11 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">
                          +91
                        </div>
                        <Input 
                          placeholder="Enter 10-digit number" 
                          value={field.value || ""}
                          onChange={(e) => {
                            const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                            field.onChange(sanitized);
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-phone"
                          className="rounded-l-none"
                          maxLength={10}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this retailer
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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

      <RetailerPaymentForm
        open={showRetailerPaymentModal}
        onOpenChange={handleCloseRetailerPaymentModal}
        retailerId={selectedRetailerForPayment?.id || ""}
        retailerName={selectedRetailerForPayment?.name}
      />
    </AppLayout>);}