import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, optimisticCreate, optimisticUpdate } from "@/hooks/use-optimistic-mutation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { logFormError, logCalculationError } from "@/lib/error-logger";
import { buildPaginationParams } from "@/lib/pagination";
import { Plus, Minus, Package } from "lucide-react";
import { format } from "date-fns";
import { PaginatedResult } from "@shared/schema";

// Define Zod schemas
const salesInvoiceSchema = z.object({
  retailerId: z.string().min(1, "Retailer is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  paidAmount: z.number().min(0, "Paid amount must be non-negative"),
  balanceAmount: z.number().min(0, "Balance amount must be non-negative"),
  status: z.enum(["Pending", "Partial", "Paid"]),
  notes: z.string().optional(),
});

const salesInvoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  weight: z.number().min(0, "Weight must be non-negative"),
  crates: z.number().min(0, "Crates must be non-negative"),
  boxes: z.number().min(0, "Boxes must be non-negative"),
  rate: z.number().min(0, "Rate must be non-negative"),
  // amount field removed - it's derived from rate * quantity
});

const crateTransactionSchema = z.object({
  enabled: z.boolean().default(false),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
}).refine((data) => !data.enabled || data.quantity, {
  message: "Quantity is required when crate transaction is enabled",
  path: ["quantity"],
});

const invoiceFormSchema = z.object({
  invoice: salesInvoiceSchema,
  items: z.array(salesInvoiceItemSchema).min(1, "At least one item is required"),
  crateTransaction: crateTransactionSchema.optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// Component props interface
interface SalesInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice?: any;
}

export default function SalesInvoiceModal({ open, onOpenChange, editingInvoice }: SalesInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState(false);

  // Initialize form
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        retailerId: "",
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        status: "Pending",
        notes: "",
      },
      items: [
        {
          itemId: "",
          weight: 0,
          crates: 0,
          boxes: 0,
          rate: 0,
        },
      ],
      crateTransaction: {
        enabled: false,
        quantity: undefined,
      },
    },
  });

  // Setup useFieldArray for items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // useEffect for form population in edit mode
  useEffect(() => {
    if (open && editingInvoice) {
      // Populate form with editingInvoice data
      form.reset({
        invoice: {
          retailerId: editingInvoice.retailerId || "",
          invoiceDate: editingInvoice.invoiceDate ? format(new Date(editingInvoice.invoiceDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          totalAmount: Number(editingInvoice.totalAmount) || 0,
          paidAmount: Number(editingInvoice.paidAmount) || 0,
          balanceAmount: Number(editingInvoice.balanceAmount) || 0,
          status: editingInvoice.status || "Pending",
          notes: editingInvoice.notes || "",
        },
        items: editingInvoice.items?.map((item: any) => ({
          itemId: item.itemId || "",
          weight: Number(item.weight) || 0,
          crates: Number(item.crates) || 0,
          boxes: Number(item.boxes) || 0,
          rate: Number(item.rate) || 0,
        })) || [{
          itemId: "",
          weight: 0,
          crates: 0,
          boxes: 0,
          rate: 0,
        }],
        crateTransaction: {
          enabled: false,
          quantity: undefined,
        },
      });
    } else if (!open || !editingInvoice) {
      // Reset to default values
      form.reset({
        invoice: {
          retailerId: "",
          invoiceDate: format(new Date(), "yyyy-MM-dd"),
          totalAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
          status: "Pending",
          notes: "",
        },
        items: [
          {
            itemId: "",
            weight: 0,
            crates: 0,
            boxes: 0,
            rate: 0,
          },
        ],
        crateTransaction: {
          enabled: false,
          quantity: undefined,
        },
      });
    }
  }, [open, editingInvoice, form]);

  // Data fetching queries
  const retailersQuery = useQuery({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const params = buildPaginationParams({
        limit: 100,
        page: 1,
        sortBy: "name",
        sortOrder: "asc",
      });
      const response = await authenticatedApiRequest("GET", `/api/retailers?${params}`);
      return response.json() as Promise<PaginatedResult<any>>;
    },
    enabled: open,
  });

  const itemsQuery = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const params = buildPaginationParams({
        limit: 100,
        page: 1,
        sortBy: "name",
        sortOrder: "asc",
      });
      const response = await authenticatedApiRequest("GET", `/api/items?${params}`);
      return response.json() as Promise<PaginatedResult<any>>;
    },
    enabled: open,
  });

  const stockQuery = useQuery({
    queryKey: ["/api/stock"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/stock?limit=1000");
      return response.json();
    },
    enabled: open,
  });

  // Extract data arrays from query results
  const retailers = retailersQuery.data?.data || [];
  const items = itemsQuery.data?.data || [];
  const stockResult = stockQuery.data || [];

  // Calculation helper functions
  const getQuantityForCalculation = (item: any) => {
    try {
      const weight = Number(item.weight) || 0;
      const crates = Number(item.crates) || 0;
      const boxes = Number(item.boxes) || 0;
      
      if (weight > 0) return weight;
      if (crates > 0 || boxes > 0) return crates + boxes;
      return 0; // Changed from 1 to 0 to prevent accidental charges
    } catch (error) {
      logCalculationError(error, "getQuantityForCalculation", { item });
      return 0; // Changed from 1 to 0 to prevent accidental charges
    }
  };

  const calculateItemAmount = (rate: number, item: any) => {
    try {
      const numericRate = Number(rate) || 0;
      if (numericRate <= 0) return 0;
      
      const quantity = getQuantityForCalculation(item);
      return numericRate * quantity;
    } catch (error) {
      logCalculationError(error, "calculateItemAmount", { rate, item });
      return 0;
    }
  };

  const calculateTotalAmount = () => {
    try {
      const items = form.watch("items") || [];
      return items.reduce((total, item) => {
        const rate = Number(item.rate) || 0;
        const amount = calculateItemAmount(rate, item);
        return total + amount;
      }, 0);
    } catch (error) {
      logCalculationError(error, "calculateTotalAmount", {});
      return 0;
    }
  };

  const getAvailableStock = (itemId: string) => {
    try {
      const stock = stockResult.find((s: any) => s.itemId === itemId);
      return Number(stock?.availableQuantity) || 0;
    } catch (error) {
      return 0;
    }
  };

  const getItemName = (itemId: string) => {
    try {
      const item = items.find((i: any) => i.id === itemId);
      return item?.name || "Unknown Item";
    } catch (error) {
      return "Unknown Item";
    }
  };

  const getRetailerName = (retailerId: string) => {
    try {
      const retailer = retailers.find((r: any) => r.id === retailerId);
      return retailer?.name || "Unknown Retailer";
    } catch (error) {
      return "Unknown Retailer";
    }
  };

  // Mutation for creating/updating invoice with optimistic UI
  // Note: Due to multiple possible queryKey combinations (different pagination/filters),
  // we optimistically update the base query and invalidate all variants on settle
  const mutation = useOptimisticMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Validate form data
      if (!data.invoice.retailerId) {
        throw new Error("Retailer is required");
      }
      if (!data.items || data.items.length === 0) {
        throw new Error("At least one item is required");
      }

      // Calculate total amount
      const totalAmount = calculateTotalAmount();
      const paidAmount = Number(data.invoice.paidAmount) || 0;
      
      // Clamp balance amount to minimum 0 (guard against overpayment)
      const balanceAmount = Math.max(0, totalAmount - paidAmount);
      
      // Derive status from payment amounts
      let status: "Pending" | "Partial" | "Paid";
      if (paidAmount <= 0) {
        status = "Pending";
      } else if (paidAmount >= totalAmount) {
        status = "Paid";
      } else {
        status = "Partial";
      }

      // Construct invoice data
      const invoiceData = {
        invoice: {
          ...data.invoice,
          totalAmount: totalAmount.toString(),
          paidAmount: paidAmount.toString(),
          balanceAmount: balanceAmount.toString(),
          status: status,
        },
        items: data.items.map((item) => ({
          ...item,
          weight: item.weight.toString(),
          crates: item.crates.toString(),
          boxes: item.boxes.toString(),
          rate: item.rate.toString(),
          amount: calculateItemAmount(item.rate, item).toString(),
        })),
      };

      // Add crate transaction if enabled
      if (data.crateTransaction?.enabled && data.crateTransaction.quantity) {
        (invoiceData as any).crateTransaction = {
          partyType: "retailer",
          retailerId: data.invoice.retailerId,
          transactionType: "Given",
          quantity: data.crateTransaction.quantity.toString(), // Stringify to match API convention
          transactionDate: data.invoice.invoiceDate,
          notes: `Crates given with invoice`,
        };
      }

      // Determine endpoint and method
      const isEditing = !!editingInvoice;
      const endpoint = isEditing ? `/api/sales-invoices/${editingInvoice.id}` : "/api/sales-invoices";
      const method = isEditing ? "PUT" : "POST";

      const response = await authenticatedApiRequest(method, endpoint, invoiceData);
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} invoice`);
      }
      return response.json();
    },
    // Optimistically update a default query key
    // Other filter combinations will be updated via invalidation
    queryKey: ["/api/sales-invoices"],
    updateFn: (old: any, variables: InvoiceFormData) => {
      if (!old) return old;
      
      const isEditing = !!editingInvoice;
      const totalAmount = calculateTotalAmount();
      const paidAmount = Number(variables.invoice.paidAmount) || 0;
      const balanceAmount = Math.max(0, totalAmount - paidAmount);
      
      let status: "Pending" | "Partial" | "Paid";
      if (paidAmount <= 0) {
        status = "Pending";
      } else if (paidAmount >= totalAmount) {
        status = "Paid";
      } else {
        status = "Partial";
      }
      
      const optimisticInvoice: any = {
        id: isEditing ? editingInvoice.id : `temp-${Date.now()}`,
        ...variables.invoice,
        totalAmount: totalAmount.toString(),
        paidAmount: paidAmount.toString(),
        balanceAmount: balanceAmount.toString(),
        status,
        createdAt: isEditing ? editingInvoice.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: variables.items.map((item: any) => ({
          ...item,
          weight: item.weight.toString(),
          crates: item.crates.toString(),
          boxes: item.boxes.toString(),
          rate: item.rate.toString(),
          amount: calculateItemAmount(item.rate, item).toString(),
        })),
      };
      
      if (isEditing) {
        return optimisticUpdate(old, optimisticInvoice);
      } else {
        return optimisticCreate(old, optimisticInvoice);
      }
    },
    onError: (error, variables) => {
      logFormError(error, "SalesInvoiceModal", { editingInvoice });
      toast.error(
        "Error",
        error instanceof Error ? error.message : "Failed to process invoice",
        {
          onRetry: () => {
            mutation.mutateAsync(variables);
          }
        }
      );
    },
    onSuccess: (data) => {
      const isEditing = !!editingInvoice;
      const crateTransactionEnabled = form.watch("crateTransaction.enabled");
      
      // Trigger success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 500);
      
      toast.success(
        "Success",
        `Invoice ${isEditing ? 'updated' : 'created'} successfully${crateTransactionEnabled ? ' with crate transaction' : ''}`
      );

      // Invalidate all related queries to get fresh server data
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });

      // Close modal and reset form after animation
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
      }, 300);
    },
  });

  // onSubmit handler
  const onSubmit = async (data: InvoiceFormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      logFormError(error, "SalesInvoiceModal.onSubmit", { data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingInvoice ? "Edit Sales Invoice" : "Create Sales Invoice"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className={`space-y-6 ${showSuccessAnimation ? 'animate-success' : ''}`}
          >
            {/* Invoice details section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice.retailerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retailer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-retailer">
                          <SelectValue placeholder="Select retailer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {retailers.map((retailer: any) => (
                          <SelectItem key={retailer.id} value={retailer.id}>
                            {retailer.name}
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
                name="invoice.invoiceDate"
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

              <FormField
                control={form.control}
                name="invoice.paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-paid-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice items section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Invoice Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    itemId: "",
                    weight: 0,
                    crates: 0,
                    boxes: 0,
                    rate: 0,
                  })}
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3 sm:p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-item-${index}`}>
                                <SelectValue placeholder={itemsQuery.isLoading ? "Loading..." : itemsQuery.error ? "Error" : "Select item"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items.map((item: any) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
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
                          <FormLabel>Weight (KG)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormLabel>Crates</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                          <FormLabel>Boxes</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                          <FormLabel>Rate (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid={`input-rate-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col justify-end">
                      <FormLabel>Amount</FormLabel>
                      <div className="h-11 flex items-center text-sm font-medium">
                        ₹{calculateItemAmount(form.watch(`items.${index}.rate`), form.watch(`items.${index}`)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Available stock display */}
                  {form.watch(`items.${index}.itemId`) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span>
                        Available stock for {getItemName(form.watch(`items.${index}.itemId`))}: {getAvailableStock(form.watch(`items.${index}.itemId`))} units
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total amount display */}
            <div className="bg-muted p-3 sm:p-4 rounded-lg">
              <div className="text-base sm:text-lg font-semibold">
                Total Amount: ₹{calculateTotalAmount().toFixed(2)}
              </div>
            </div>

            {/* Crate transaction section */}
            <div className="space-y-4">
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
                        />
                      </div>
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Add Crate Transaction</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("crateTransaction.enabled") && (
                <div className="space-y-4 pl-4 sm:pl-6">
                  <FormField
                    control={form.control}
                    name="crateTransaction.quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-crate-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Crates will be marked as "Given" to {getRetailerName(form.watch("invoice.retailerId"))}
                  </p>
                </div>
              )}
            </div>

            {/* Notes section */}
            <FormField
              control={form.control}
              name="invoice.notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter notes (optional)"
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
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
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}