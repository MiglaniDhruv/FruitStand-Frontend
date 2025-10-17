import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MobileDrawerModal } from "@/components/ui/mobile-drawer-modal";
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
import { useTenant } from "@/hooks/use-tenant";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, Trash2, Package, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { InvoiceWithItems } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const invoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  weight: z.string().min(1, "Weight is required"),
  crates: z.string().min(1, "Crates is required"),
  boxes: z.string().min(1, "Boxes is required"),
  rate: z.string().min(1, "Rate is required"),
  amount: z.string(),
});

const crateTransactionSchema = z.object({
  enabled: z.boolean().default(false),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
}).refine((data) => {
  // If enabled, quantity is required
  if (data.enabled && !data.quantity) {
    return false;
  }
  return true;
}, {
  message: "Quantity is required when crate transaction is enabled",
  path: ["quantity"],
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
  crateTransaction: crateTransactionSchema.optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceWithItems | null;
}

export default function PurchaseInvoiceModal({ open, onOpenChange, invoice }: PurchaseInvoiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedStockOutEntries, setSelectedStockOutEntries] = useState<string[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const { tenant, getTenantSettings } = useTenant();
  const tenantSettings = getTenantSettings();
  const rawCommissionRate = tenantSettings.commissionRate || "0";
  const clampedRate = Math.max(0, Math.min(100, parseFloat(rawCommissionRate) || 0));
  const defaultCommissionRate = clampedRate.toString();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorId: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      items: [{ itemId: "", weight: "", crates: "", boxes: "", rate: "", amount: "0" }],
      commission: defaultCommissionRate,
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
      crateTransaction: {
        enabled: false,
        quantity: undefined,
      },
    },
  });

  // Clear errors when modal opens/closes and reset form when closed
  useEffect(() => {
    if (open) {
      setSubmissionError(null);
      setCalculationError(null);
    } else {
      // Reset form and local state when modal is closed
      form.reset();
      setSelectedVendorId("");
      setSelectedStockOutEntries([]);
    }
  }, [open, form]);

  useEffect(() => {
    const rate = getTenantSettings().commissionRate;
    if (open && rate && form.getValues('commission') === '0') {
      const clampedRate = Math.max(0, Math.min(100, parseFloat(rate) || 0));
      form.setValue('commission', clampedRate.toString());
    }
  }, [open, tenant, form]);

  // Populate form when editing
  useEffect(() => {
    if (invoice && open) {
      try {
        setSelectedVendorId(invoice.vendorId);
        
        form.setValue('vendorId', invoice.vendorId);
        form.setValue('invoiceDate', new Date(invoice.invoiceDate).toISOString().split('T')[0]);
        form.setValue('items', invoice.items.map(item => ({
          itemId: item.itemId,
          weight: item.weight.toString(),
          crates: item.crates?.toString() || '',
          boxes: item.boxes?.toString() || '',
          rate: item.rate.toString(),
          amount: item.amount.toString(),
        })));
        form.setValue('commission', (invoice.commission ?? 0).toString());
        form.setValue('labour', (invoice.labour ?? 0).toString());
        form.setValue('truckFreight', (invoice.truckFreight ?? 0).toString());
        form.setValue('crateFreight', (invoice.crateFreight ?? 0).toString());
        form.setValue('postExpenses', (invoice.postExpenses ?? 0).toString());
        form.setValue('draftExpenses', (invoice.draftExpenses ?? 0).toString());
        form.setValue('vatav', (invoice.vatav ?? 0).toString());
        form.setValue('otherExpenses', (invoice.otherExpenses ?? 0).toString());
        form.setValue('advance', (invoice.advance ?? 0).toString());
        form.setValue('totalExpense', invoice.totalExpense.toString());
        form.setValue('totalSelling', invoice.totalSelling.toString());
        form.setValue('totalLessExpenses', invoice.totalLessExpenses.toString());
        form.setValue('netAmount', invoice.netAmount.toString());
        
        if ((invoice as any).crateTransaction) {
          form.setValue('crateTransaction.enabled', true);
          form.setValue('crateTransaction.quantity', (invoice as any).crateTransaction.quantity);
        }
      } catch (error) {
        console.error('Error populating form:', error);
        toast({
          title: "Error",
          description: "Failed to load invoice data",
          variant: "destructive",
        });
      }
    }
  }, [invoice, open, form, toast]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: vendorsResult, isError: vendorsError, error: vendorsErrorMessage } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors?limit=100");
      return response.json();
    },
  });

  const vendors = vendorsResult?.data || [];

  const { data: itemsResult, isError: itemsError, error: itemsErrorMessage } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/items?limit=100");
      return response.json();
    },
  });

  const items = itemsResult?.data || [];

  // Fetch available stock out entries for selected vendor
  const { data: availableStockOutEntries, isError: stockOutError, error: stockOutErrorMessage } = useQuery({
    queryKey: ["/api/stock-movements/vendor", selectedVendorId, "available"],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const response = await authenticatedApiRequest("GET", `/api/stock-movements/vendor/${selectedVendorId}/available`);
      return response.json();
    },
    enabled: !!selectedVendorId && !invoice,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const isEditMode = !!invoice;
      
      // In create mode, add stockOutEntryIds if any were selected
      // In edit mode, do NOT include stockOutEntryIds (stock entries are already linked)
      const requestData = isEditMode 
        ? data
        : {
            ...data,
            stockOutEntryIds: selectedStockOutEntries.length > 0 ? selectedStockOutEntries : undefined
          };
      
      const endpoint = isEditMode 
        ? `/api/purchase-invoices/${invoice.id}`
        : "/api/purchase-invoices";
      
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await authenticatedApiRequest(method, endpoint, requestData);
      return response.json();
    },
    onSuccess: () => {
      const isEditMode = !!invoice;
      const hadCrateTransaction = isEditMode && !!(invoice as any).crateTransaction;
      const hasCrateTransaction = form.watch("crateTransaction.enabled");
      const crateRemoved = isEditMode && hadCrateTransaction && !hasCrateTransaction;
      
      setSubmissionError(null);
      setCalculationError(null);
      
      // Trigger success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 500);
      
      // Build success message based on crate transaction state
      let description = "";
      if (isEditMode) {
        if (crateRemoved) {
          description = "Purchase invoice updated and crate transaction removed successfully";
        } else if (hasCrateTransaction) {
          description = hadCrateTransaction 
            ? "Purchase invoice and crate transaction updated successfully"
            : "Purchase invoice updated and crate transaction added successfully";
        } else {
          description = "Purchase invoice updated successfully";
        }
      } else {
        description = hasCrateTransaction
          ? "Purchase invoice and crate transaction created successfully"
          : "Purchase invoice created successfully";
      }
      
      toast({
        title: isEditMode ? "Invoice updated" : "Invoice created",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      
      // Close modal after animation
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setSelectedVendorId("");
        setSelectedStockOutEntries([]);
      }, 300);
    },
    onError: (error) => {
      const isEditMode = !!invoice;
      let errorMessage = isEditMode ? "Failed to update invoice" : "Failed to create invoice";
      if (error instanceof Error) {
        errorMessage = error.message;
        // Parse specific error types
        if (error.message.includes('validation')) {
          errorMessage = "Validation error: Please check all required fields";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error: Please check your connection and try again";
        }
      }
      setSubmissionError(errorMessage);
      console.error('Invoice creation error:', error);
      toast({
        title: "Error",
        description: errorMessage,
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
    try {
      const newSelectedEntries = selectedStockOutEntries.includes(entryId)
        ? selectedStockOutEntries.filter(id => id !== entryId)
        : [...selectedStockOutEntries, entryId];
      
      setSelectedStockOutEntries(newSelectedEntries);
      
      // Aggregate data from all selected entries
      if (newSelectedEntries.length > 0) {
      const itemMap = new Map<string, {
        itemId: string;
        totalWeight: number;
        totalCrates: number;
        totalBoxes: number;
        totalValue: number; // For weighted average rate calculation
        rates: { rate: number; weight: number }[]; // For tracking individual rates and weights
      }>();
      
      // First pass: collect all data by item
      newSelectedEntries.forEach(selectedId => {
        const entry = availableStockOutEntries?.find((e: any) => e.id === selectedId);
        if (entry) {
          const itemId = entry.itemId;
          const weight = parseFloat(entry.quantityInKgs) || 0;
          const crates = parseFloat(entry.quantityInCrates) || 0;
          const boxes = parseFloat(entry.quantityInBoxes) || 0;
          const rate = parseFloat(entry.rate) || 0;
          const value = weight * rate; // Total value for this entry
          
          if (itemMap.has(itemId)) {
            const existing = itemMap.get(itemId)!;
            existing.totalWeight += weight;
            existing.totalCrates += crates;
            existing.totalBoxes += boxes;
            existing.totalValue += value;
            existing.rates.push({ rate, weight });
          } else {
            itemMap.set(itemId, {
              itemId,
              totalWeight: weight,
              totalCrates: crates,
              totalBoxes: boxes,
              totalValue: value,
              rates: [{ rate, weight }]
            });
          }
        }
      });
      
      // Second pass: calculate aggregated items with weighted average rates
      const aggregatedItems = Array.from(itemMap.values()).map(item => {
        // Calculate weighted average rate
        const averageRate = item.totalWeight > 0 ? item.totalValue / item.totalWeight : 0;
        
        return {
          itemId: item.itemId,
          weight: item.totalWeight.toString(),
          crates: item.totalCrates.toString(),
          boxes: item.totalBoxes.toString(),
          rate: averageRate.toFixed(2),
          amount: "0" // Will be calculated
        };
      });
      
      form.setValue("items", aggregatedItems);
    } else {
      // Reset to single empty item when no entries selected
      form.setValue("items", [{ itemId: "", weight: "", crates: "", boxes: "", rate: "", amount: "0" }]);
    }
    } catch (error) {
      console.error('Stock out entry aggregation error:', error);
      setSubmissionError('Error processing stock out entries. Please try again.');
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

  // Helper function to get quantity based on item unit
  const getQuantityForCalculation = (item: any, itemDetails: any) => {
    if (!itemDetails) return parseFloat(item.weight) || 0;
    
    switch (itemDetails.unit) {
      case "kgs":
        return parseFloat(item.weight) || 0;
      case "crate":
        return parseFloat(item.crates) || 0;
      case "box":
        return parseFloat(item.boxes) || 0; // Box uses boxes field
      default:
        return parseFloat(item.weight) || 0;
    }
  };

  // Calculate derived values
  const totalSelling = watchedItems.reduce((sum, item) => {
    const itemDetails = items?.find((i: any) => i.id === item.itemId);
    const quantity = getQuantityForCalculation(item, itemDetails);
    const rate = parseFloat(item.rate) || 0;
    return sum + (quantity * rate);
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
    try {
      setCalculationError(null);
      // Update individual item amounts
      watchedItems.forEach((item, index) => {
        const itemDetails = items?.find((i: any) => i.id === item.itemId);
        const quantity = getQuantityForCalculation(item, itemDetails);
        const rate = parseFloat(item.rate) || 0;
        if (isNaN(rate)) {
          throw new Error(`Invalid rate for item at position ${index + 1}`);
        }
        const amount = quantity * rate;
        if (isNaN(amount)) {
          throw new Error(`Error calculating amount for item at position ${index + 1}`);
        }
        if (parseFloat(item.amount) !== amount) {
          form.setValue(`items.${index}.amount`, amount.toFixed(2));
        }
      });

      // Validate totals
      if (isNaN(totalExpense) || isNaN(totalSelling) || isNaN(totalLessExpenses) || isNaN(netAmount)) {
        throw new Error('Error calculating invoice totals');
      }

      // Update totals
      form.setValue("totalExpense", totalExpense.toFixed(2));
      form.setValue("totalSelling", totalSelling.toFixed(2));
      form.setValue("totalLessExpenses", totalLessExpenses.toFixed(2));
      form.setValue("netAmount", netAmount.toFixed(2));
    } catch (error) {
      console.error('Calculation error:', error);
      setCalculationError('Error calculating totals. Please check your inputs.');
    }
  }, [form, watchedItems, items, totalExpense, totalSelling, totalLessExpenses, netAmount]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmissionError(null);
      
      // Validate invoice data
      if (data.items.length === 0) {
        throw new Error('At least one item is required');
      }
      
      // Validate all items have required fields
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item.itemId || !item.rate) {
          throw new Error(`Item at position ${i + 1} is missing required fields`);
        }
      }
      
      // Validate crate transaction if enabled
      if (data.crateTransaction?.enabled && !data.crateTransaction.quantity) {
        throw new Error('Crate quantity is required when crate transaction is enabled');
      }
      
      // Build invoice payload data with validation
      const invoicePayload = {
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
        balanceAmount: parseFloat(data.netAmount).toFixed(2),
        status: "Unpaid",
      };

      const itemsPayload = data.items.map((item, index) => {
        const weight = parseFloat(item.weight || "0");
        const crates = parseFloat(item.crates || "0");
        const boxes = parseFloat(item.boxes || "0");
        const rate = parseFloat(item.rate);
        const amount = parseFloat(item.amount);
        
        if (isNaN(rate) || isNaN(amount)) {
          throw new Error(`Invalid numeric values in item at position ${index + 1}`);
        }
        
        return {
          itemId: item.itemId,
          weight: weight.toFixed(2),
          crates: crates.toFixed(2),
          boxes: boxes.toFixed(2),
          rate: rate.toFixed(2),
          amount: amount.toFixed(2),
        };
      });

      // Build request data
      const requestData: any = { invoice: invoicePayload, items: itemsPayload };

      // Detect if we're in edit mode using the component prop (not the local payload)
      const isEditMode = !!invoice;
      const hadCrateTransaction = isEditMode && !!(invoice as any).crateTransaction;

      // Handle crate transaction
      if (data.crateTransaction?.enabled && data.crateTransaction.quantity) {
        // User enabled crate transaction with valid quantity - include it
        requestData.crateTransaction = {
          partyType: 'vendor',
          vendorId: data.vendorId,
          transactionType: 'Received',
          quantity: data.crateTransaction.quantity,
          transactionDate: data.invoiceDate,
          notes: `Crates received with invoice`,
        };
      } else if (isEditMode && hadCrateTransaction && !data.crateTransaction?.enabled) {
        // Edit mode: invoice had a crate transaction but user disabled it - explicitly signal removal
        requestData.crateTransaction = null;
      }
      // If create mode and not enabled, don't include crateTransaction (undefined is fine)
      // If edit mode but invoice never had a crate transaction, also don't include it

      createInvoiceMutation.mutate(requestData);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to submit invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id === vendorId);
    return vendor?.name || "the selected vendor";
  };

  const addItem = () => {
    append({ itemId: "", weight: "", crates: "", boxes: "", rate: "", amount: "0" });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <MobileDrawerModal
      open={open}
      onOpenChange={onOpenChange}
      title={invoice ? "Edit Purchase Invoice" : "Create Purchase Invoice"}
      fullScreenOnMobile={true}
    >
      <ErrorBoundary 
        resetKeys={[open ? 1 : 0]}
        fallback={({ error, resetError }) => (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load form</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>An error occurred while loading the purchase invoice form.</p>
                <div className="flex gap-2">
                  <Button onClick={resetError} size="sm">
                    Try Again
                  </Button>
                  <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
                    Close
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      >

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className={`space-y-6 ${showSuccessAnimation ? 'animate-success' : ''}`}
          >
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select onValueChange={handleVendorChange} value={field.value} disabled={!!invoice}>
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

                {!invoice && selectedVendorId && availableStockOutEntries && availableStockOutEntries.length > 0 && (
                  <div className="col-span-full">
                    <label className="text-sm font-medium">Select Stock Out Entries (Optional)</label>
                    <div className="mt-2 max-h-32 sm:max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                      {availableStockOutEntries?.map((entry: any) => (
                        <div key={entry.id} className="flex items-start space-x-3">
                          <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                            <Checkbox
                              id={entry.id}
                              checked={selectedStockOutEntries.includes(entry.id)}
                              onCheckedChange={() => handleStockOutEntryToggle(entry.id)}
                              data-testid={`checkbox-stock-out-entry-${entry.id}`}
                            />
                          </div>
                          <label 
                            htmlFor={entry.id} 
                            className="text-xs sm:text-sm cursor-pointer flex-1 leading-relaxed"
                          >
                            <span className="font-medium">{entry.item.name} - {entry.item.quality}</span>
                            <br />
                            <span className="text-muted-foreground text-xs">
                              {entry.quantityInKgs} Kgs, {entry.quantityInCrates} Crates, {entry.quantityInBoxes || 0} Boxes | Rate: ₹{entry.rate || 'N/A'} | Date: {new Date(entry.movementDate).toLocaleDateString()}
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
                        <Input type="date" autoComplete="off" enterKeyHint="next" {...field} data-testid="input-invoice-date" />
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
                  <CardTitle className="text-base sm:text-lg">Invoice Items</CardTitle>
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
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
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
                                  {item.name} - {item.quality} - {item.vendor?.name || 'Unknown Vendor'}
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
                              inputMode="decimal"
                              enterKeyHint="next"
                              autoComplete="off"
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
                              inputMode="numeric"
                              enterKeyHint="next"
                              autoComplete="off"
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
                      name={`items.${index}.boxes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Boxes *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              inputMode="numeric"
                              enterKeyHint="next"
                              autoComplete="off"
                              placeholder="0.00" 
                              {...field} 
                              data-testid={`input-boxes-${index}`}
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
                              inputMode="decimal"
                              enterKeyHint="done"
                              autoComplete="off"
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
                <CardTitle className="text-base sm:text-lg">Expenses</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
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
                          inputMode="decimal"
                          enterKeyHint="done"
                          autoComplete="off"
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

            {/* Crate Transaction Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base sm:text-lg">Crate Transaction (Optional)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="crateTransaction.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-crate-transaction"
                          />
                        </div>
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Record crate transaction with this invoice
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Automatically track crates received from the vendor
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch("crateTransaction.enabled") && (
                  <FormField
                    control={form.control}
                    name="crateTransaction.quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Crates *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            enterKeyHint="done"
                            autoComplete="off"
                            placeholder="Enter number of crates"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || undefined)
                            }
                            data-testid="input-crate-quantity"
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Crates will be marked as "Received" from {form.watch("vendorId") ? getVendorName(form.watch("vendorId")) : "the selected vendor"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Calculated Totals</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

            {/* Query Error Displays */}
            {(vendorsError || itemsError || stockOutError) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Some data failed to load. {vendorsError && "Vendors, "}{itemsError && "Items, "}{stockOutError && "Stock entries, "}
                  This may affect form functionality.
                </AlertDescription>
              </Alert>
            )}

            {/* Calculation Error Display */}
            {calculationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{calculationError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalculationError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Submission Error Display */}
            {submissionError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{submissionError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubmissionError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-border">
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
                {createInvoiceMutation.isPending 
                  ? (invoice ? "Updating..." : "Creating...") 
                  : (invoice ? "Update Invoice" : "Create Invoice")}
              </Button>
            </div>
          </form>
        </Form>
        </ErrorBoundary>
      </MobileDrawerModal>
  );
}