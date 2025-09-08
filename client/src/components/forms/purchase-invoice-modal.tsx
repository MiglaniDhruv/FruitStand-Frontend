import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, Trash2 } from "lucide-react";

const invoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  weight: z.string().min(1, "Weight is required"),
  crates: z.string().min(1, "Crates is required"),
  rate: z.string().min(1, "Rate is required"),
  amount: z.string(),
});

const invoiceSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  commission: z.string().default("0"),
  labour: z.string().default("0"),
  truckFreight: z.string().default("0"),
  crateFreight: z.string().default("0"),
  postExpenses: z.string().default("0"),
  draftExpenses: z.string().default("0"),
  vatav: z.string().default("0"),
  otherExpenses: z.string().default("0"),
  advance: z.string().default("0"),
  totalExpense: z.string(),
  totalSelling: z.string(),
  totalLessExpenses: z.string(),
  netAmount: z.string(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PurchaseInvoiceModal({ open, onOpenChange }: PurchaseInvoiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedStockOutEntries, setSelectedStockOutEntries] = useState<string[]>([]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorId: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      items: [{ itemId: "", weight: "", crates: "", rate: "", amount: "0" }],
      commission: "0",
      labour: "0",
      truckFreight: "0",
      crateFreight: "0",
      postExpenses: "0",
      draftExpenses: "0",
      vatav: "0",
      otherExpenses: "0",
      advance: "0",
      totalExpense: "0",
      totalSelling: "0",
      totalLessExpenses: "0",
      netAmount: "0",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: items } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  // Fetch available stock out entries for selected vendor
  const { data: availableStockOutEntries } = useQuery<any[]>({
    queryKey: ["/api/stock-movements/vendor", selectedVendorId, "available"],
    enabled: !!selectedVendorId,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      // Add stockOutEntryIds if any were selected
      const requestData = {
        ...data,
        stockOutEntryIds: selectedStockOutEntries.length > 0 ? selectedStockOutEntries : undefined
      };
      const response = await authenticatedApiRequest("POST", "/api/purchase-invoices", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "Purchase invoice created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      onOpenChange(false);
      form.reset();
      setSelectedVendorId("");
      setSelectedStockOutEntries([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  // Handle vendor selection
  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedStockOutEntries([]); // Reset stock out entries when vendor changes
    form.setValue("vendorId", vendorId);
  };

  // Handle stock out entry selection toggle
  const handleStockOutEntryToggle = (entryId: string) => {
    const newSelectedEntries = selectedStockOutEntries.includes(entryId)
      ? selectedStockOutEntries.filter(id => id !== entryId)
      : [...selectedStockOutEntries, entryId];
    
    setSelectedStockOutEntries(newSelectedEntries);
    
    // Aggregate data from all selected entries
    if (newSelectedEntries.length > 0) {
      const aggregatedItems: any[] = [];
      
      newSelectedEntries.forEach(selectedId => {
        const entry = availableStockOutEntries?.find((e: any) => e.id === selectedId);
        if (entry) {
          // Check if we already have this item
          const existingItemIndex = aggregatedItems.findIndex(item => item.itemId === entry.itemId);
          
          if (existingItemIndex >= 0) {
            // Add to existing item quantities
            const existingItem = aggregatedItems[existingItemIndex];
            aggregatedItems[existingItemIndex] = {
              ...existingItem,
              weight: (parseFloat(existingItem.weight) + parseFloat(entry.quantityInKgs)).toString(),
              crates: (parseFloat(existingItem.crates) + parseFloat(entry.quantityInCrates)).toString(),
              amount: "0" // Will be calculated
            };
          } else {
            // Add new item
            aggregatedItems.push({
              itemId: entry.itemId,
              weight: entry.quantityInKgs,
              crates: entry.quantityInCrates,
              rate: entry.rate || "0",
              amount: "0" // Will be calculated
            });
          }
        }
      });
      
      form.setValue("items", aggregatedItems);
    } else {
      // Reset to single empty item when no entries selected
      form.setValue("items", [{ itemId: "", weight: "", crates: "", rate: "", amount: "0" }]);
    }
  };

  // Watch form fields for calculations
  const watchedItems = form.watch("items");
  const watchedCommission = form.watch("commission");
  const watchedLabour = form.watch("labour");
  const watchedTruckFreight = form.watch("truckFreight");
  const watchedCrateFreight = form.watch("crateFreight");
  const watchedPostExpenses = form.watch("postExpenses");
  const watchedDraftExpenses = form.watch("draftExpenses");
  const watchedVatav = form.watch("vatav");
  const watchedOtherExpenses = form.watch("otherExpenses");
  const watchedAdvance = form.watch("advance");

  // Calculate derived values
  const totalSelling = watchedItems.reduce((sum, item) => {
    const weight = parseFloat(item.weight) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + (weight * rate);
  }, 0);
  
  const commissionPercentage = parseFloat(watchedCommission) || 0;
  const commissionAmount = (totalSelling * commissionPercentage) / 100;
  const labour = parseFloat(watchedLabour) || 0;
  const truckFreight = parseFloat(watchedTruckFreight) || 0;
  const crateFreight = parseFloat(watchedCrateFreight) || 0;
  const postExpenses = parseFloat(watchedPostExpenses) || 0;
  const draftExpenses = parseFloat(watchedDraftExpenses) || 0;
  const vatav = parseFloat(watchedVatav) || 0;
  const otherExpenses = parseFloat(watchedOtherExpenses) || 0;
  const advance = parseFloat(watchedAdvance) || 0;
  
  const totalExpense = commissionAmount + labour + truckFreight + crateFreight + postExpenses + draftExpenses + vatav + otherExpenses + advance;
  const totalLessExpenses = totalSelling - totalExpense;
  const netAmount = totalLessExpenses;

  // Update calculated fields when dependent values change
  useEffect(() => {
    // Update individual item amounts
    watchedItems.forEach((item, index) => {
      const weight = parseFloat(item.weight) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = weight * rate;
      if (parseFloat(item.amount) !== amount) {
        form.setValue(`items.${index}.amount`, amount.toFixed(2));
      }
    });

    // Update totals
    form.setValue("totalExpense", totalExpense.toFixed(2));
    form.setValue("totalSelling", totalSelling.toFixed(2));
    form.setValue("totalLessExpenses", totalLessExpenses.toFixed(2));
    form.setValue("netAmount", netAmount.toFixed(2));
  }, [form, watchedItems, totalExpense, totalSelling, totalLessExpenses, netAmount]);

  const onSubmit = (data: InvoiceFormData) => {
    const invoice = {
      vendorId: data.vendorId,
      invoiceDate: data.invoiceDate,
      commission: commissionAmount.toFixed(2),
      labour: parseFloat(data.labour).toFixed(2),
      truckFreight: parseFloat(data.truckFreight).toFixed(2),
      crateFreight: parseFloat(data.crateFreight).toFixed(2),
      postExpenses: parseFloat(data.postExpenses).toFixed(2),
      draftExpenses: parseFloat(data.draftExpenses).toFixed(2),
      vatav: parseFloat(data.vatav).toFixed(2),
      otherExpenses: parseFloat(data.otherExpenses).toFixed(2),
      advance: parseFloat(data.advance).toFixed(2),
      totalExpense: parseFloat(data.totalExpense).toFixed(2),
      totalSelling: parseFloat(data.totalSelling).toFixed(2),
      totalLessExpenses: parseFloat(data.totalLessExpenses).toFixed(2),
      netAmount: parseFloat(data.netAmount).toFixed(2),
      balanceAmount: parseFloat(data.netAmount).toFixed(2), // Initially balance equals net amount
      status: "Unpaid",
    };

    const items = data.items.map(item => ({
      itemId: item.itemId,
      weight: parseFloat(item.weight).toFixed(2),
      crates: parseFloat(item.crates).toFixed(2),
      rate: parseFloat(item.rate).toFixed(2),
      amount: parseFloat(item.amount).toFixed(2),
    }));

    createInvoiceMutation.mutate({ invoice, items });
  };

  const addItem = () => {
    append({ itemId: "", weight: "", crates: "", rate: "", amount: "0" });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select onValueChange={handleVendorChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors?.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedVendorId && availableStockOutEntries && availableStockOutEntries.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Select Stock Out Entries (Optional)</label>
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                      {availableStockOutEntries?.map((entry: any) => (
                        <div key={entry.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={entry.id}
                            checked={selectedStockOutEntries.includes(entry.id)}
                            onCheckedChange={() => handleStockOutEntryToggle(entry.id)}
                            data-testid={`checkbox-stock-out-entry-${entry.id}`}
                          />
                          <label 
                            htmlFor={entry.id} 
                            className="text-sm cursor-pointer flex-1 leading-relaxed"
                          >
                            <span className="font-medium">{entry.item.name} - {entry.item.quality}</span>
                            <br />
                            <span className="text-muted-foreground text-xs">
                              {entry.quantityInKgs} Kgs, {entry.quantityInCrates} Crates | Rate: ₹{entry.rate || 'N/A'} | Date: {new Date(entry.movementDate).toLocaleDateString()}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select multiple stock out entries to combine their data. Items of the same type will be aggregated.
                    </p>
                    {selectedStockOutEntries.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {selectedStockOutEntries.length} entries selected
                      </p>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-invoice-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Invoice Items</CardTitle>
                  <Button 
                    type="button" 
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-item-${index}`}>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items?.map((item: any) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} - {item.quality}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (Kgs) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid={`input-weight-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.crates`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crates *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid={`input-crates-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.rate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid={`input-rate-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              readOnly 
                              className="bg-muted"
                              data-testid={`input-amount-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={fields.length === 1}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expenses</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          max="100"
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-commission" 
                        />
                      </FormControl>
                      {commissionPercentage > 0 && (
                        <p className="text-sm text-muted-foreground">
                          = ₹{commissionAmount.toFixed(2)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="labour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labour (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-labour" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="truckFreight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Freight (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-truck-freight" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crateFreight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crate Freight (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-crate-freight" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Expenses (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-post-expenses" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="draftExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Draft Expenses (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-draft-expenses" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatav"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vatav (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-vatav" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="otherExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Expenses (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-other-expenses" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-advance" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calculated Totals</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="totalExpense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Expense (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          className="bg-muted font-semibold"
                          data-testid="input-total-expense" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalSelling"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Selling (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          className="bg-muted font-semibold"
                          data-testid="input-total-selling" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalLessExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Less Expenses (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          className="bg-muted font-semibold"
                          data-testid="input-total-less-expenses" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="netAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Amount (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          className="bg-primary/10 font-bold text-primary border-primary"
                          data-testid="input-net-amount" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoiceMutation.isPending}
                data-testid="button-create-invoice"
              >
                {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}