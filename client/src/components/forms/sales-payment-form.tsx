import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";

const salesPaymentFormSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  retailerId: z.string().min(1, "Retailer is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Cheque"]),
  bankAccountId: z.string().optional(),
  chequeNumber: z.string().optional(),
  notes: z.string().optional(),
});

type SalesPaymentFormData = z.infer<typeof salesPaymentFormSchema>;

interface SalesPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedInvoiceId?: string;
}

export default function SalesPaymentForm({ open, onOpenChange, preSelectedInvoiceId }: SalesPaymentFormProps) {
  const [selectedRetailer, setSelectedRetailer] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SalesPaymentFormData>({
    resolver: zodResolver(salesPaymentFormSchema),
    defaultValues: {
      invoiceId: preSelectedInvoiceId || "",
      retailerId: "",
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "Cash",
      bankAccountId: "",
      chequeNumber: "",
      notes: "",
    },
  });

  const watchedPaymentMethod = form.watch("paymentMethod");

  const { data: retailers } = useQuery<any[]>({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/retailers');
      return response.json();
    },
  });

  const { data: invoices } = useQuery<any[]>({
    queryKey: ["/api/sales-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/sales-invoices');
      return response.json();
    },
  });

  const { data: bankAccounts } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/bank-accounts');
      return response.json();
    },
  });

  const createSalesPaymentMutation = useMutation({
    mutationFn: async (data: SalesPaymentFormData) => {
      const response = await authenticatedApiRequest('POST', '/api/sales-payments', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Sales payment has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      onOpenChange(false);
      form.reset();
      setSelectedRetailer("");
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  // Filter invoices for selected retailer
  const availableInvoices = invoices?.filter((invoice) => {
    if (!selectedRetailer) return [];
    return (
      invoice.retailerId === selectedRetailer && 
      invoice.status !== "Paid"
    );
  }) || [];

  const handleRetailerChange = (retailerId: string) => {
    setSelectedRetailer(retailerId);
    form.setValue("retailerId", retailerId);
    form.setValue("invoiceId", "");
    setSelectedInvoice(null);
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices?.find(inv => inv.id === invoiceId);
    setSelectedInvoice(invoice);
    form.setValue("invoiceId", invoiceId);
    
    if (invoice) {
      // Set the outstanding amount as default
      const outstandingAmount = parseFloat(invoice.udhaaarAmount || "0").toFixed(2);
      form.setValue("amount", outstandingAmount);
    }
  };

  const onSubmit = (data: SalesPaymentFormData) => {
    createSalesPaymentMutation.mutate(data);
  };

  // Pre-select invoice if provided
  React.useEffect(() => {
    if (preSelectedInvoiceId && invoices) {
      const invoice = invoices.find(inv => inv.id === preSelectedInvoiceId);
      if (invoice) {
        setSelectedRetailer(invoice.retailerId);
        setSelectedInvoice(invoice);
        form.setValue("retailerId", invoice.retailerId);
        form.setValue("invoiceId", preSelectedInvoiceId);
        
        const outstandingAmount = parseFloat(invoice.udhaaarAmount || "0").toFixed(2);
        form.setValue("amount", outstandingAmount);
      }
    }
  }, [preSelectedInvoiceId, invoices, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Sales Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="retailerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retailer *</FormLabel>
                  <Select onValueChange={handleRetailerChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-retailer">
                        <SelectValue placeholder="Select retailer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {retailers?.map((retailer) => (
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
              name="invoiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice *</FormLabel>
                  <Select onValueChange={handleInvoiceChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-invoice">
                        <SelectValue placeholder="Select invoice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableInvoices?.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - ₹{invoice.totalAmount} 
                          {invoice.udhaaarAmount && parseFloat(invoice.udhaaarAmount) > 0 
                            ? ` (Udhaar: ₹${parseFloat(invoice.udhaaarAmount || "0").toFixed(2)})`
                            : ""
                          }
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      {...field}
                      data-testid="input-payment-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-payment-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedPaymentMethod === "Bank Transfer" && (
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bank-account">
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName} - {account.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedPaymentMethod === "Cheque" && (
              <FormField
                control={form.control}
                name="chequeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter cheque number"
                        {...field}
                        data-testid="input-cheque-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this payment"
                      className="resize-none"
                      {...field}
                      data-testid="textarea-payment-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSalesPaymentMutation.isPending}
                data-testid="button-save-payment"
              >
                {createSalesPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}