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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStock, setEditingStock] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWastageEntry, setShowWastageEntry] = useState(false);
  const [quantities, setQuantities] = useState({ crates: "", kgs: "" });
  const [manualEntry, setManualEntry] = useState({
    vendorId: "",
    notes: "",
    lineItems: [{ itemId: "", crates: "", kgs: "" }] as Array<{itemId: string, crates: string, kgs: string}>,
  });
  const [wastageEntry, setWastageEntry] = useState({
    itemId: "",
    crates: "",
    kgs: "",
    reason: "",
    notes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stock, isLoading } = useQuery<any[]>({
    queryKey: ["/api/stock"],
  });

  const { data: stockMovements, isLoading: movementsLoading } = useQuery<any[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: itemMovements } = useQuery<any[]>({
    queryKey: ["/api/stock-movements/item", selectedItem?.itemId],
    enabled: !!selectedItem?.itemId,
  });

  const { data: items } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

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
      setQuantities({ crates: "", kgs: "" });
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
        setWastageEntry({ itemId: "", crates: "", kgs: "", reason: "", notes: "" });
      } else {
        toast({
          title: "Stock entry added",
          description: "Manual stock entry has been added successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
        setShowManualEntry(false);
        setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "" }] });
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

  const filteredStock = stock?.filter((item: any) => {
    const searchString = searchTerm.toLowerCase();
    return (
      item.item.name.toLowerCase().includes(searchString) ||
      item.item.quality.toLowerCase().includes(searchString) ||
      (item.item.vendor?.name || '').toLowerCase().includes(searchString)
    );
  }) || [];

  const isLowStock = (item: any) => {
    const totalQty = parseFloat(item.quantityInKgs) + parseFloat(item.quantityInCrates);
    return totalQty < 20 && totalQty > 0;
  };

  const handleEditStock = (item: any) => {
    setEditingStock(item);
    setQuantities({
      crates: item.quantityInCrates,
      kgs: item.quantityInKgs,
    });
  };

  const handleUpdateStock = () => {
    if (!editingStock) return;

    updateStockMutation.mutate({
      itemId: editingStock.itemId,
      data: {
        quantityInCrates: quantities.crates,
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
      setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "" }] });
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
      lineItems: [...manualEntry.lineItems, { itemId: "", crates: "", kgs: "" }]
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

  const filteredItems = items?.filter((item: any) => 
    !manualEntry.vendorId || item.vendorId === manualEntry.vendorId
  ) || [];

  const handleWastageEntry = () => {
    if (!wastageEntry.itemId || (!wastageEntry.crates && !wastageEntry.kgs)) {
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
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Stock Management</h2>
              <p className="text-sm text-muted-foreground">
                Monitor and update inventory levels
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Stock</CardTitle>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => setShowManualEntry(true)}
                    data-testid="button-add-stock"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowWastageEntry(true)}
                    data-testid="button-add-wastage"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Record Wastage
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search stock..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-stock"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Quantity (Crates)</TableHead>
                    <TableHead>Quantity (Kgs)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading stock...
                      </TableCell>
                    </TableRow>
                  ) : filteredStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No stock items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStock.map((item: any) => (
                      <TableRow key={item.id} data-testid={`stock-row-${item.id}`}>
                        <TableCell className="font-medium">{item.item.name}</TableCell>
                        <TableCell>{item.item.quality}</TableCell>
                        <TableCell>{item.item.vendor?.name || 'Unknown Vendor'}</TableCell>
                        <TableCell>{parseFloat(item.quantityInCrates).toFixed(2)}</TableCell>
                        <TableCell>{parseFloat(item.quantityInKgs).toFixed(2)}</TableCell>
                        <TableCell>{format(new Date(item.lastUpdated), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          {isLowStock(item) ? (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-4 w-4 text-chart-1" />
                              <Badge variant="destructive">Low Stock</Badge>
                            </div>
                          ) : (
                            <Badge variant="default">Available</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStock(item)}
                              data-testid={`button-edit-stock-${item.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedItem(item)}
                              data-testid={`button-view-history-${item.id}`}
                            >
                              <History className="h-4 w-4" />
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
            <div className="grid grid-cols-2 gap-4">
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
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                <h4 className="font-medium mb-4">Movement History</h4>
                {itemMovements && itemMovements.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {itemMovements.map((movement: any, index: number) => (
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
                ) : (
                  <p className="text-center text-muted-foreground py-8">No movement history found</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Stock Entry Modal */}
      <Dialog open={showManualEntry} onOpenChange={(open) => {
        if (!open) {
          setManualEntry({ vendorId: "", notes: "", lineItems: [{ itemId: "", crates: "", kgs: "" }] });
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
                  lineItems: [{ itemId: "", crates: "", kgs: "" }] // Reset line items when vendor changes
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              {filteredItems?.map((item: any) => (
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
          setWastageEntry({ itemId: "", crates: "", kgs: "", reason: "", notes: "" });
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
                  {items?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.quality} ({item.vendor?.name || 'Unknown Vendor'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
