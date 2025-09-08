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
import { Label } from "@/components/ui/label";
import { Search, Edit, AlertTriangle, History, Plus } from "lucide-react";
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
  const [quantities, setQuantities] = useState({ crates: "", kgs: "" });
  const [manualEntry, setManualEntry] = useState({
    itemId: "",
    crates: "",
    kgs: "",
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
    onSuccess: () => {
      toast({
        title: "Stock entry added",
        description: "Manual stock entry has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      setShowManualEntry(false);
      setManualEntry({ itemId: "", crates: "", kgs: "", notes: "" });
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
      item.item.vendor.name.toLowerCase().includes(searchString)
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

  const handleManualStockEntry = () => {
    if (!manualEntry.itemId || !manualEntry.crates && !manualEntry.kgs) {
      toast({
        title: "Missing information",
        description: "Please select an item and enter quantities",
        variant: "destructive",
      });
      return;
    }

    createStockMovementMutation.mutate({
      itemId: manualEntry.itemId,
      movementType: "IN",
      quantityInCrates: manualEntry.crates || "0",
      quantityInKgs: manualEntry.kgs || "0",
      referenceType: "MANUAL_ENTRY",
      referenceId: null,
      referenceNumber: "MANUAL",
      vendorId: null,
      retailerId: null,
      notes: manualEntry.notes || "Manual stock entry",
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
                        <TableCell>{item.item.vendor.name}</TableCell>
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
                <p className="text-sm text-muted-foreground">Vendor: {selectedItem.item.vendor.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current Stock: {parseFloat(selectedItem.quantityInCrates).toFixed(2)} Crates, {parseFloat(selectedItem.quantityInKgs).toFixed(2)} Kgs
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Movement History</h4>
                {itemMovements && itemMovements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Crates</TableHead>
                        <TableHead>Kgs</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemMovements.map((movement: any) => (
                        <TableRow key={movement.id}>
                          <TableCell>{format(new Date(movement.movementDate), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={movement.movementType === "IN" ? "default" : "secondary"}>
                              {movement.movementType === "IN" ? "Stock In" : "Stock Out"}
                            </Badge>
                          </TableCell>
                          <TableCell className={movement.movementType === "IN" ? "text-green-600" : "text-red-600"}>
                            {movement.movementType === "IN" ? "+" : "-"}{parseFloat(movement.quantityInCrates).toFixed(2)}
                          </TableCell>
                          <TableCell className={movement.movementType === "IN" ? "text-green-600" : "text-red-600"}>
                            {movement.movementType === "IN" ? "+" : "-"}{parseFloat(movement.quantityInKgs).toFixed(2)}
                          </TableCell>
                          <TableCell>{movement.referenceNumber || movement.referenceType}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{movement.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No movement history found</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Stock Entry Modal */}
      <Dialog open={showManualEntry} onOpenChange={() => setShowManualEntry(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-select">Select Item</Label>
              <Select 
                value={manualEntry.itemId} 
                onValueChange={(value) => setManualEntry({ ...manualEntry, itemId: value })}
              >
                <SelectTrigger data-testid="select-item">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.quality} ({item.vendor.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manual-crates">Quantity in Crates</Label>
                <Input
                  id="manual-crates"
                  type="number"
                  step="0.01"
                  value={manualEntry.crates}
                  onChange={(e) => setManualEntry({ ...manualEntry, crates: e.target.value })}
                  data-testid="input-manual-crates"
                />
              </div>
              <div>
                <Label htmlFor="manual-kgs">Quantity in Kgs</Label>
                <Input
                  id="manual-kgs"
                  type="number"
                  step="0.01"
                  value={manualEntry.kgs}
                  onChange={(e) => setManualEntry({ ...manualEntry, kgs: e.target.value })}
                  data-testid="input-manual-kgs"
                />
              </div>
            </div>

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
    </div>
  );
}
