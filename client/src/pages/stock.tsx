import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { PaginationOptions, PaginatedResult, StockWithItem, ItemWithVendor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Search, Edit, AlertTriangle, History, Plus, Trash2, PlusCircle, AlertCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { format } from "date-fns";

export default function Stock() {
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "lastUpdated",
    sortOrder: "desc"
  });
  const [editingStock, setEditingStock] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWastageEntry, setShowWastageEntry] = useState(false);
  const [quantities, setQuantities] = useState({ crates: "", kgs: "", boxes: "" });
  const [manualEntry, setManualEntry] = useState({
    vendorId: "",
    notes: "",
    lineItems: [{ itemId: "", crates: "", kgs: "", boxes: "" }] as Array<{itemId: string, crates: string, kgs: string, boxes: string}>,
  });
  const [wastageEntry, setWastageEntry] = useState({
    itemId: "",
    crates: "",
    kgs: "",
    boxes: "",
    reason: "",
    notes: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stockResult, isLoading, isFetching, isError, error } = useQuery<PaginatedResult<StockWithItem>>({
    queryKey: ["/api/stock", paginationOptions],
    placeholderData: (prevData) => prevData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paginationOptions.page) params.append('page', paginationOptions.page.toString());
      if (paginationOptions.limit) params.append('limit', paginationOptions.limit.toString());
      if (paginationOptions.search) params.append('search', paginationOptions.search);
      if (paginationOptions.sortBy) params.append('sortBy', paginationOptions.sortBy);
      if (paginationOptions.sortOrder) params.append('sortOrder', paginationOptions.sortOrder);
      params.append('paginated', 'true');
      
      const response = await authenticatedApiRequest("GET", `/api/stock?${params.toString()}`);
      return response.json();
    },
  });

  const { data: stockMovements, isLoading: movementsLoading } = useQuery<any[]>({
    queryKey: ["/api/stock-movements"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/stock-movements");
      return response.json();
    },
  });

  const { data: itemMovements } = useQuery<any[]>({
    queryKey: ["/api/stock-movements/item", selectedItem?.itemId],
    enabled: !!selectedItem?.itemId,
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/stock-movements/item/${selectedItem?.itemId}`);
      return response.json();
    },
  });

  const { data: items, isError: itemsError } = useQuery<ItemWithVendor[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/items");
      return response.json();
    },
  });

  const { data: vendorsResult } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors?limit=100");
      return response.json();
    },
  });

  const vendors = vendorsResult?.data || [];

  const updateStockMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      const response = await authenticatedApiRequest("PUT", `/api/stock/${itemId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock updated",
        description: "Stock quantities have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      setEditingStock(null);
      setQuantities({ crates: "", kgs: "", boxes: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  const createStockMovementMutation = useMutation({
    mutationFn: async (movementData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/stock-movements", movementData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Check if this is a wastage entry
      if (variables.referenceType === "WASTAGE") {
        toast({
          title: "Wastage recorded",
          description: "Stock wastage has been recorded successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
        setShowWastageEntry(false);
        setWastageEntry({ itemId: "", crates: "", kgs: "", boxes: "", reason: "", notes: "" });
      } else {
        toast({
          title: "Stock entry added",
          description: "Manual stock entry has been added successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
        setShowManualEntry(false);
        setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "", boxes: "" }] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add stock entry",
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
  
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setPaginationOptions(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    handleSearchChange(value);
  };

  const isLowStock = (item: any) => {
    const totalQty = parseFloat(item.quantityInKgs) + parseFloat(item.quantityInCrates) + parseFloat(item.quantityInBoxes || 0);
    return totalQty < 20 && totalQty > 0;
  };

  // Define stock table columns
  const stockColumns = [
    {
      accessorKey: "item.name",
      header: "Item",
      cell: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      accessorKey: "item.quality",
      header: "Quality",
    },
    {
      accessorKey: "item.vendor.name",
      header: "Vendor",
      cell: (value: string) => value || "Unknown Vendor",
    },
    {
      accessorKey: "quantityInCrates",
      header: "Quantity (Crates)",
      cell: (value: string) => parseFloat(value).toFixed(2),
    },
    {
      accessorKey: "quantityInBoxes",
      header: "Quantity (Boxes)",
      cell: (value: string) => parseFloat(value || "0").toFixed(2),
    },
    {
      accessorKey: "quantityInKgs",
      header: "Quantity (Kgs)",
      cell: (value: string) => parseFloat(value).toFixed(2),
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: (value: string) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      accessorKey: "id",
      header: "Status",
      cell: (value: string, row: any) => {
        if (isLowStock(row)) {
          return (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4 text-chart-1" />
              <Badge variant="destructive">Low Stock</Badge>
            </div>
          );
        }
        return <Badge variant="default">Available</Badge>;
      },
    },
    {
      accessorKey: "id",
      header: "Actions",
      cell: (value: string, row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditStock(row)}
            data-testid={`button-edit-stock-${value}`}
            title="Edit Stock"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedItem(row)}
            data-testid={`button-history-${value}`}
            title="View History"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEditStock = (item: any) => {
    setEditingStock(item);
    setQuantities({
      crates: item.quantityInCrates,
      kgs: item.quantityInKgs,
      boxes: item.quantityInBoxes || "0",
    });
  };

  const handleUpdateStock = () => {
    if (!editingStock) return;

    updateStockMutation.mutate({
      itemId: editingStock.itemId,
      data: {
        quantityInCrates: quantities.crates,
        quantityInBoxes: quantities.boxes,
        quantityInKgs: quantities.kgs,
      },
    });
  };

  const handleManualStockEntry = async () => {
    if (!manualEntry.vendorId) {
      toast({
        title: "Missing information",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    const validLineItems = manualEntry.lineItems.filter(item => 
      item.itemId && (item.crates || item.kgs)
    );

    if (validLineItems.length === 0) {
      toast({
        title: "Missing information",
        description: "Please add at least one item with quantities",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create stock movements for each line item
      for (const lineItem of validLineItems) {
        await createStockMovementMutation.mutateAsync({
          itemId: lineItem.itemId,
          movementType: "IN",
          quantityInCrates: lineItem.crates || "0",
          quantityInBoxes: lineItem.boxes || "0",
          quantityInKgs: lineItem.kgs || "0",
          referenceType: "MANUAL_ENTRY",
          referenceId: null,
          referenceNumber: "MANUAL",
          vendorId: manualEntry.vendorId,
          retailerId: null,
          notes: manualEntry.notes || "Manual stock entry",
          movementDate: new Date().toISOString(),
        });
      }
      
      toast({
        title: "Stock entries added",
        description: `Successfully added ${validLineItems.length} stock entries`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setShowManualEntry(false);
      setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "", boxes: "" }] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add stock entries",
        variant: "destructive",
      });
    }
  };

  const addLineItem = () => {
    setManualEntry({
      ...manualEntry,
      lineItems: [...manualEntry.lineItems, { itemId: "", crates: "", kgs: "", boxes: "" }]
    });
  };

  const removeLineItem = (index: number) => {
    if (manualEntry.lineItems.length > 1) {
      setManualEntry({
        ...manualEntry,
        lineItems: manualEntry.lineItems.filter((_, i) => i !== index)
      });
    }
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updatedLineItems = [...manualEntry.lineItems];
    updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
    setManualEntry({ ...manualEntry, lineItems: updatedLineItems });
  };

  const filteredItems = (items && Array.isArray(items) ? items : []).filter((item: ItemWithVendor) => 
    !manualEntry.vendorId || item.vendorId === manualEntry.vendorId
  );

  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 p-4 sm:p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Stock</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : "Failed to load stock. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleWastageEntry = () => {
    if (!wastageEntry.itemId || (!wastageEntry.crates && !wastageEntry.boxes && !wastageEntry.kgs)) {
      toast({
        title: "Missing information",
        description: "Please select an item and enter wastage quantities",
        variant: "destructive",
      });
      return;
    }

    if (!wastageEntry.reason) {
      toast({
        title: "Missing information", 
        description: "Please provide a reason for wastage",
        variant: "destructive",
      });
      return;
    }

    createStockMovementMutation.mutate({
      itemId: wastageEntry.itemId,
      movementType: "OUT",
      quantityInCrates: wastageEntry.crates || "0",
      quantityInBoxes: wastageEntry.boxes || "0",
      quantityInKgs: wastageEntry.kgs || "0",
      referenceType: "WASTAGE",
      referenceId: null,
      referenceNumber: "WASTAGE",
      vendorId: null,
      retailerId: null,
      notes: `Wastage: ${wastageEntry.reason}${wastageEntry.notes ? ` - ${wastageEntry.notes}` : ''}`,
      movementDate: new Date().toISOString(),
    });
  };

  return (
    <AppLayout>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Stock Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Monitor and update inventory levels
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Stock Inventory</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button 
                      onClick={() => setShowManualEntry(true)}
                      data-testid="button-add-stock"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stock
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowWastageEntry(true)}
                      data-testid="button-add-wastage"
                      className="w-full sm:w-auto"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Record Wastage
                    </Button>
                  </div>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stock by item name or quality..."
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    className="pl-8"
                    data-testid="input-search-stock"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={stockResult?.data || []}
                columns={stockColumns}
                paginationMetadata={stockResult?.pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSearchChange={handleSearchChange}
                onSortChange={handleSortChange}
                isLoading={isFetching}
                enableRowSelection={true}
                rowKey="id"
                searchTerm={searchInput}
                hasActiveFilters={false}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Update Stock Modal */}
      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingStock && (
              <div className="text-sm text-muted-foreground">
                {editingStock.item.name} - {editingStock.item.quality}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="crates">Quantity in Crates</Label>
                <Input
                  id="crates"
                  type="number"
                  step="0.01"
                  value={quantities.crates}
                  onChange={(e) => setQuantities({ ...quantities, crates: e.target.value })}
                  data-testid="input-quantity-crates"
                />
              </div>
              <div>
                <Label htmlFor="boxes">Quantity in Boxes</Label>
                <Input
                  id="boxes"
                  type="number"
                  step="0.01"
                  value={quantities.boxes}
                  onChange={(e) => setQuantities({ ...quantities, boxes: e.target.value })}
                  data-testid="input-quantity-boxes"
                />
              </div>
              <div>
                <Label htmlFor="kgs">Quantity in Kgs</Label>
                <Input
                  id="kgs"
                  type="number"
                  step="0.01"
                  value={quantities.kgs}
                  onChange={(e) => setQuantities({ ...quantities, kgs: e.target.value })}
                  data-testid="input-quantity-kgs"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingStock(null)}
                data-testid="button-cancel-stock-update"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStock}
                disabled={updateStockMutation.isPending}
                data-testid="button-update-stock"
              >
                {updateStockMutation.isPending ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Movement History Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => {
        setSelectedItem(null);
        setDateFilter({ startDate: "", endDate: "" });
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Movement History</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold">{selectedItem.item.name} - {selectedItem.item.quality}</h3>
                <p className="text-sm text-muted-foreground">Vendor: {selectedItem.item.vendor?.name || 'Unknown Vendor'}</p>
                <p className="text-sm text-muted-foreground">
                  Current Stock: {parseFloat(selectedItem.quantityInCrates).toFixed(2)} Crates, {parseFloat(selectedItem.quantityInKgs).toFixed(2)} Kgs
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Movement History</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="start-date" className="text-sm font-medium whitespace-nowrap">From:</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                        className="w-40"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="end-date" className="text-sm font-medium whitespace-nowrap">To:</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                        className="w-40"
                        data-testid="input-end-date"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter({ startDate: "", endDate: "" })}
                      data-testid="button-clear-filter"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
{(() => {
                  // Filter movements based on date range
                  let filteredMovements = itemMovements || [];
                  
                  if (dateFilter.startDate) {
                    filteredMovements = filteredMovements.filter((movement: any) => 
                      new Date(movement.movementDate) >= new Date(dateFilter.startDate)
                    );
                  }
                  
                  if (dateFilter.endDate) {
                    filteredMovements = filteredMovements.filter((movement: any) => 
                      new Date(movement.movementDate) <= new Date(dateFilter.endDate + 'T23:59:59')
                    );
                  }
                  
                  if (filteredMovements.length > 0) {
                    return (
                      <Accordion type="multiple" className="w-full">
                        {filteredMovements.map((movement: any, index: number) => (
                          <AccordionItem key={movement.id} value={`movement-${index}`}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center space-x-4">
                                  <Badge variant={movement.movementType === "IN" ? "default" : "secondary"}>
                                    {movement.movementType === "IN" ? "Stock In" : "Stock Out"}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {format(new Date(movement.movementDate), "MMM dd, yyyy")}
                                  </span>
                                  <span className={`text-sm font-semibold ${
                                    movement.movementType === "IN" ? "text-green-600" : "text-red-600"
                                  }`}>
                                    {movement.movementType === "IN" ? "+" : "-"}
                                    {parseFloat(movement.quantityInCrates).toFixed(2)} Crates, 
                                    {parseFloat(movement.quantityInBoxes || "0").toFixed(2)} Boxes, 
                                    {parseFloat(movement.quantityInKgs).toFixed(2)} Kgs
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">
                                    {movement.referenceNumber || movement.referenceType}
                                  </div>
                                  {movement.movementType === "OUT" && movement.retailer && (
                                    <div className="text-xs text-muted-foreground">
                                      Retailer: {movement.retailer.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-2 pb-4 space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-muted-foreground">Date:</span>
                                    <div>{format(new Date(movement.movementDate), "PPP")}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Type:</span>
                                    <div>
                                      <Badge variant={movement.movementType === "IN" ? "default" : "secondary"} className="text-xs">
                                        {movement.movementType === "IN" ? "Stock In" : "Stock Out"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Quantity:</span>
                                    <div className={movement.movementType === "IN" ? "text-green-600" : "text-red-600"}>
                                      {movement.movementType === "IN" ? "+" : "-"}
                                      {parseFloat(movement.quantityInCrates).toFixed(2)} Crates
                                      <br />
                                      {movement.movementType === "IN" ? "+" : "-"}
                                      {parseFloat(movement.quantityInBoxes || "0").toFixed(2)} Boxes
                                      <br />
                                      {movement.movementType === "IN" ? "+" : "-"}
                                      {parseFloat(movement.quantityInKgs).toFixed(2)} Kgs
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Reference:</span>
                                    <div>{movement.referenceNumber || movement.referenceType}</div>
                                  </div>
                                </div>
                                
                                {movement.movementType === "OUT" && movement.retailer && (
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <span className="font-medium text-muted-foreground text-sm">Retailer Information:</span>
                                    <div className="mt-1">
                                      <div className="font-medium">{movement.retailer.name}</div>
                                      {movement.retailer.contactPerson && (
                                        <div className="text-sm text-muted-foreground">Contact: {movement.retailer.contactPerson}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {movement.rate && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                                    <span className="font-medium text-muted-foreground text-sm">Rate Information:</span>
                                    <div className="mt-1 font-medium">₹{parseFloat(movement.rate).toFixed(2)} per Kg</div>
                                  </div>
                                )}
                                
                                {movement.notes && (
                                  <div>
                                    <span className="font-medium text-muted-foreground text-sm">Notes:</span>
                                    <div className="mt-1 text-sm bg-muted/30 rounded p-2">{movement.notes}</div>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    );
                  } else {
                    return (
                      <p className="text-center text-muted-foreground py-8">
                        {dateFilter.startDate || dateFilter.endDate ? 
                          "No movements found for the selected date range" : 
                          "No movement history found"
                        }
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Stock Entry Modal */}
      <Dialog open={showManualEntry} onOpenChange={(open) => {
        if (!open) {
          setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "", boxes: "" }] });
        }
        setShowManualEntry(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stock Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Vendor Selection */}
            <div>
              <Label htmlFor="vendor-select">Select Vendor</Label>
              <Select 
                value={manualEntry.vendorId} 
                onValueChange={(value) => setManualEntry({ 
                  ...manualEntry, 
                  vendorId: value,
                  lineItems: [{ itemId: "", crates: "", kgs: "", boxes: "" }] // Reset line items when vendor changes
                })}
              >
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line Items */}
            {manualEntry.vendorId && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-medium">Stock Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    data-testid="button-add-line-item"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {manualEntry.lineItems.map((lineItem, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Item {index + 1}</Label>
                        {manualEntry.lineItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            data-testid={`button-remove-line-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor={`item-select-${index}`}>Item</Label>
                          <Select 
                            value={lineItem.itemId} 
                            onValueChange={(value) => updateLineItem(index, "itemId", value)}
                          >
                            <SelectTrigger data-testid={`select-item-${index}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredItems?.map((item: ItemWithVendor) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} - {item.quality}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor={`crates-${index}`}>Crates</Label>
                          <Input
                            id={`crates-${index}`}
                            type="number"
                            step="0.01"
                            value={lineItem.crates}
                            onChange={(e) => updateLineItem(index, "crates", e.target.value)}
                            data-testid={`input-crates-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`boxes-${index}`}>Boxes</Label>
                          <Input
                            id={`boxes-${index}`}
                            type="number"
                            step="0.01"
                            value={lineItem.boxes}
                            onChange={(e) => updateLineItem(index, "boxes", e.target.value)}
                            data-testid={`input-boxes-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`kgs-${index}`}>Kgs</Label>
                          <Input
                            id={`kgs-${index}`}
                            type="number"
                            step="0.01"
                            value={lineItem.kgs}
                            onChange={(e) => updateLineItem(index, "kgs", e.target.value)}
                            data-testid={`input-kgs-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="manual-notes">Notes</Label>
              <Textarea
                id="manual-notes"
                placeholder="Enter any notes for this stock entry"
                value={manualEntry.notes}
                onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                data-testid="textarea-manual-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(false)}
                data-testid="button-cancel-manual-entry"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleManualStockEntry}
                disabled={createStockMovementMutation.isPending}
                data-testid="button-add-manual-entry"
              >
                {createStockMovementMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wastage Entry Modal */}
      <Dialog open={showWastageEntry} onOpenChange={(open) => {
        if (!open) {
          setWastageEntry({ itemId: "", crates: "", kgs: "", boxes: "", reason: "", notes: "" });
        }
        setShowWastageEntry(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Wastage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wastage-item-select">Select Item</Label>
              <Select 
                value={wastageEntry.itemId} 
                onValueChange={(value) => setWastageEntry({ ...wastageEntry, itemId: value })}
              >
                <SelectTrigger data-testid="select-wastage-item">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {(items && Array.isArray(items) ? items : []).map((item: ItemWithVendor) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.quality} ({item.vendor?.name || 'Unknown Vendor'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="wastage-crates">Wastage in Crates</Label>
                <Input
                  id="wastage-crates"
                  type="number"
                  step="0.01"
                  value={wastageEntry.crates}
                  onChange={(e) => setWastageEntry({ ...wastageEntry, crates: e.target.value })}
                  data-testid="input-wastage-crates"
                />
              </div>
              <div>
                <Label htmlFor="wastage-boxes">Wastage in Boxes</Label>
                <Input
                  id="wastage-boxes"
                  type="number"
                  step="0.01"
                  value={wastageEntry.boxes}
                  onChange={(e) => setWastageEntry({ ...wastageEntry, boxes: e.target.value })}
                  data-testid="input-wastage-boxes"
                />
              </div>
              <div>
                <Label htmlFor="wastage-kgs">Wastage in Kgs</Label>
                <Input
                  id="wastage-kgs"
                  type="number"
                  step="0.01"
                  value={wastageEntry.kgs}
                  onChange={(e) => setWastageEntry({ ...wastageEntry, kgs: e.target.value })}
                  data-testid="input-wastage-kgs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="wastage-reason">Reason for Wastage *</Label>
              <Select 
                value={wastageEntry.reason} 
                onValueChange={(value) => setWastageEntry({ ...wastageEntry, reason: value })}
              >
                <SelectTrigger data-testid="select-wastage-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spoilage">Spoilage</SelectItem>
                  <SelectItem value="Damaged">Damaged/Broken</SelectItem>
                  <SelectItem value="Overripe">Overripe</SelectItem>
                  <SelectItem value="Pest Damage">Pest Damage</SelectItem>
                  <SelectItem value="Physical Damage">Physical Damage</SelectItem>
                  <SelectItem value="Quality Issues">Quality Issues</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="wastage-notes">Additional Notes</Label>
              <Textarea
                id="wastage-notes"
                placeholder="Enter additional notes about the wastage"
                value={wastageEntry.notes}
                onChange={(e) => setWastageEntry({ ...wastageEntry, notes: e.target.value })}
                data-testid="textarea-wastage-notes"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowWastageEntry(false)}
                data-testid="button-cancel-wastage"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleWastageEntry}
                disabled={createStockMovementMutation.isPending}
                data-testid="button-record-wastage"
              >
                {createStockMovementMutation.isPending ? "Recording..." : "Record Wastage"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>);}