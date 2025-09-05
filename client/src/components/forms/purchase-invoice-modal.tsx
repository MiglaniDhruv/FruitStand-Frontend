import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, Trash2 } from "lucide-react";

const invoiceItemSchema = z.object({
  commodityId: z.string().min(1, "Commodity is required"),
  quantity: z.string().min(1, "Quantity is required"),
  rate: z.string().min(1, "Rate is required"),
  amount: z.string(),
});

const invoiceSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  commissionRate: z.string().min(1, "Commission rate is required"),
  freightCharges: z.string().default("0"),
  laborCharges: z.string().default("0"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PurchaseInvoiceModal({ open, onOpenChange }: PurchaseInvoiceModalProps) {
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorId: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      commissionRate: "5",
      freightCharges: "0",
      laborCharges: "0",
      items: [{ commodityId: "", quantity: "", rate: "", amount: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: commodities } = useQuery<any[]>({
    queryKey: ["/api/commodities", "vendor", selectedVendorId],
    enabled: !!selectedVendorId,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authenticatedApiRequest("POST", "/api/purchase-invoices", data);
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const watchedItems = form.watch("items");
  const watchedCommissionRate = form.watch("commissionRate");
  const watchedFreightCharges = form.watch("freightCharges");
  const watchedLaborCharges = form.watch("laborCharges");

  // Calculate totals
  const grossAmount = watchedItems.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    return sum + amount;
  }, 0);

  const commissionAmount = (grossAmount * (parseFloat(watchedCommissionRate) || 0)) / 100;
  const freightCharges = parseFloat(watchedFreightCharges) || 0;
  const laborCharges = parseFloat(watchedLaborCharges) || 0;
  const netPayable = grossAmount - commissionAmount + freightCharges + laborCharges;

  // Update item amounts when quantity or rate changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.includes('quantity') || name?.includes('rate')) {
        const items = value.items || [];
        items.forEach((item: any, index: number) => {
          const quantity = parseFloat(item?.quantity) || 0;
          const rate = parseFloat(item?.rate) || 0;
          const amount = (quantity * rate).toFixed(2);
          
          if (item?.amount !== amount) {
            form.setValue(`items.${index}.amount`, amount);
          }
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (data: InvoiceFormData) => {
    // Ensure all amounts are properly calculated before submission
    const calculatedGrossAmount = watchedItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
    
    const calculatedCommissionAmount = (calculatedGrossAmount * (parseFloat(watchedCommissionRate) || 0)) / 100;
    const calculatedFreightCharges = parseFloat(watchedFreightCharges) || 0;
    const calculatedLaborCharges = parseFloat(watchedLaborCharges) || 0;
    const calculatedNetPayable = calculatedGrossAmount - calculatedCommissionAmount + calculatedFreightCharges + calculatedLaborCharges;

    const invoiceData = {
      vendorId: data.vendorId,
      invoiceDate: new Date(data.invoiceDate + "T00:00:00.000Z"),
      grossAmount: calculatedGrossAmount.toFixed(2),
      commissionRate: data.commissionRate,
      commissionAmount: calculatedCommissionAmount.toFixed(2),
      freightCharges: data.freightCharges,
      laborCharges: data.laborCharges,
      netPayable: calculatedNetPayable.toFixed(2),
    };

    const itemsData = data.items.map(item => ({
      commodityId: item.commodityId,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    }));

    createInvoiceMutation.mutate({
      invoice: invoiceData,
      items: itemsData,
    });
  };

  const addItem = () => {
    append({ commodityId: "", quantity: "", rate: "", amount: "0" });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedVendorId(value);
                      }}
                      value={field.value}
                    >
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

              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-invoice-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-foreground">Invoice Items</h4>
                <Button type="button" variant="outline" onClick={addItem} data-testid="button-add-item">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-5 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.commodityId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Commodity</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {commodities?.map((commodity: any) => (
                                    <SelectItem key={commodity.id} value={commodity.id}>
                                      {commodity.name} - {commodity.quality}
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
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0" {...field} />
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
                              <FormLabel>Rate</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" readOnly {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={fields.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="5.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="freightCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Freight Charges</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="laborCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labor Charges</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card>
                <CardContent className="p-4">
                  <h5 className="font-medium text-foreground mb-3">Invoice Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span className="text-foreground">₹{grossAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission ({watchedCommissionRate}%):</span>
                      <span className="text-foreground">₹{commissionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Freight:</span>
                      <span className="text-foreground">₹{freightCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor:</span>
                      <span className="text-foreground">₹{laborCharges.toFixed(2)}</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between font-medium text-base">
                      <span className="text-foreground">Net Payable:</span>
                      <span className="text-foreground">₹{netPayable.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-invoice"
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
