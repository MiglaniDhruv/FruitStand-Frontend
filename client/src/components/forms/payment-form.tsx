import { useState } from "react";
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

const paymentFormSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMode: z.enum(["Cash", "Bank", "UPI", "Cheque"]),
  bankAccountId: z.string().optional(),
  chequeNumber: z.string().optional(),
  upiReference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedInvoiceId?: string;
}

export default function PaymentForm({ open, onOpenChange, preSelectedInvoiceId }: PaymentFormProps) {
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: preSelectedInvoiceId || "",
      vendorId: "",
      amount: "",
      paymentMode: "Cash",
      paymentDate: new Date().toISOString().split('T')[0],
      bankAccountId: undefined,
      chequeNumber: "",
      upiReference: "",
      notes: "",
    },
  });

  const watchedPaymentMode = form.watch("paymentMode");

  const { data: vendorsResult } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors?limit=100");
      return response.json();
    },
  });

  const { data: invoicesResult } = useQuery({
    queryKey: ["/api/purchase-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/purchase-invoices?limit=100");
      return response.json();
    },
  });

  const { data: bankAccountsResult } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
  });

  const vendors = vendorsResult?.data || [];
  const invoices = invoicesResult?.data || [];
  const bankAccounts = bankAccountsResult || [];

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const paymentData = {
        ...data,
        paymentDate: data.paymentDate,
        bankAccountId: data.bankAccountId || undefined,
      };
      const response = await authenticatedApiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      onOpenChange(false);
      form.reset();
      setSelectedVendor("");
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

  const getUnpaidInvoices = () => {
    if (!selectedVendor) return [];
    return invoices?.filter((invoice: any) => 
      invoice.vendorId === selectedVendor && 
      invoice.status !== "Paid"
    ) || [];
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendor(vendorId);
    form.setValue("vendorId", vendorId);
    form.setValue("invoiceId", "");
    setSelectedInvoice(null);
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices?.find((inv: any) => inv.id === invoiceId);
    setSelectedInvoice(invoice);
    form.setValue("invoiceId", invoiceId);
    if (invoice) {
      form.setValue("amount", invoice.balanceAmount);
    }
  };

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={handleVendorChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-vendor">
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
                name="invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice *</FormLabel>
                    <Select 
                      onValueChange={handleInvoiceChange} 
                      value={field.value}
                      disabled={!selectedVendor}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-invoice">
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getUnpaidInvoices().map((invoice: any) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - Balance: ₹{parseFloat(invoice.balanceAmount).toLocaleString('en-IN')}
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
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-payment-amount"
                      />
                    </FormControl>
                    <FormMessage />
                    {selectedInvoice && (
                      <div className="text-sm text-muted-foreground">
                        Outstanding: ₹{parseFloat(selectedInvoice.balanceAmount).toLocaleString('en-IN')}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input type="date" {...field} data-testid="input-payment-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(watchedPaymentMode === "Bank" || watchedPaymentMode === "UPI") && (
                <FormField
                  control={form.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bank-account">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} - {account.accountNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedPaymentMode === "Cheque" && (
                <FormField
                  control={form.control}
                  name="chequeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter cheque number" {...field} data-testid="input-cheque-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedPaymentMode === "UPI" && (
                <FormField
                  control={form.control}
                  name="upiReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter UPI reference" {...field} data-testid="input-upi-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-payment-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
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
                disabled={createPaymentMutation.isPending}
                data-testid="button-record-payment"
              >
                {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
