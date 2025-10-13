import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { BANK_REQUIRED_MODES } from "@/lib/constants";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Info, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert as AlertComponent, AlertDescription as AlertDescriptionComponent, AlertTitle } from "@/components/ui/alert";
import { InsertVendorPayment, VendorPaymentDistributionResult, PurchaseInvoice } from "@shared/schema";

const vendorPaymentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  paymentMode: z.enum(['Cash', 'Bank', 'UPI', 'Cheque']),
  paymentDate: z.string().min(1, "Payment date is required"),
  bankAccountId: z.string().optional(),
  chequeNumber: z.string().optional(),
  upiReference: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (BANK_REQUIRED_MODES.includes(data.paymentMode as any) && !data.bankAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bank account is required for Bank Transfer",
      path: ['bankAccountId'],
    });
  }
  if (data.paymentMode === 'Cheque' && !data.chequeNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required",
      path: ['chequeNumber'],
    });
  }
  if (data.paymentMode === 'UPI' && !data.upiReference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "UPI reference is required",
      path: ['upiReference'],
    });
  }
});

type VendorPaymentFormData = z.infer<typeof vendorPaymentFormSchema>;

interface VendorPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string | undefined;
  vendorName?: string;
}

export default function VendorPaymentForm({ open, onOpenChange, vendorId, vendorName }: VendorPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [outstandingInvoices, setOutstandingInvoices] = useState<PurchaseInvoice[]>([]);
  const [distributionPreview, setDistributionPreview] = useState<Array<{ invoice: PurchaseInvoice; allocatedAmount: number }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [distributionError, setDistributionError] = useState<string | null>(null);
  
  // State management for selected vendor
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedVendorName, setSelectedVendorName] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  
  const form = useForm<VendorPaymentFormData>({
    resolver: zodResolver(vendorPaymentFormSchema),
    defaultValues: {
      amount: "",
      paymentMode: 'Cash',
      paymentDate: today,
      bankAccountId: "",
      chequeNumber: "",
      upiReference: "",
      notes: "",
    },
  });

  const paymentMode = form.watch('paymentMode');
  const amount = form.watch('amount');

  // Compute the effective vendor ID
  const effectiveVendorId = vendorId || selectedVendorId;

  // Fetch vendors list
  const { data: vendorsData, isError: vendorsError, error: vendorsErrorMessage, refetch: refetchVendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/vendors?limit=100");
      return response.json();
    },
    enabled: open && !vendorId,
  });

  // Normalize vendors list to handle both raw arrays and { data: [...] } shapes
  const normalizedVendors = Array.isArray(vendorsData) ? vendorsData : vendorsData?.data || [];

  // Fetch outstanding invoices
  const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError, error: invoicesErrorMessage } = useQuery({
    queryKey: ["/api/vendors", effectiveVendorId, "outstanding-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/vendors/${effectiveVendorId}/outstanding-invoices`);
      return response.json();
    },
    enabled: open && !!effectiveVendorId,
  });

  // Fetch bank accounts
  const { data: bankAccountsData, isError: bankAccountsError, error: bankAccountsErrorMessage } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/bank-accounts");
      return response.json();
    },
    enabled: open,
  });

  // Update outstanding invoices when data changes
  useEffect(() => {
    if (invoicesData) {
      setOutstandingInvoices(invoicesData);
    }
  }, [invoicesData]);

  // Calculate distribution preview
  useEffect(() => {
    try {
      setDistributionError(null);
      const paymentAmount = parseFloat(amount || '0');
      
      if (isNaN(paymentAmount)) {
        throw new Error('Invalid payment amount');
      }
      
      if (paymentAmount > 0 && outstandingInvoices.length > 0) {
        let remainingAmount = paymentAmount;
        const preview: Array<{ invoice: PurchaseInvoice; allocatedAmount: number }> = [];
        
        for (const invoice of outstandingInvoices) {
          if (remainingAmount <= 0) break;
          
          const invoiceBalance = parseFloat(invoice.balanceAmount);
          if (isNaN(invoiceBalance)) {
            throw new Error(`Invalid balance amount for invoice ${invoice.id}`);
          }
          const allocation = Math.min(remainingAmount, invoiceBalance);
          
          preview.push({
            invoice,
            allocatedAmount: allocation
          });
          
          remainingAmount -= allocation;
        }
        
        setDistributionPreview(preview);
        setShowPreview(true);
      } else {
        setShowPreview(false);
        setDistributionPreview([]);
      }
    } catch (error) {
      console.error('Distribution calculation error:', error);
      setDistributionError('Error calculating payment distribution');
      setShowPreview(false);
    }
  }, [amount, outstandingInvoices]);

  // Reset form and preview state when modal is closed
  useEffect(() => {
    if (!open) {
      try {
        setSubmissionError(null);
        setDistributionError(null);
        form.reset({
          amount: "",
          paymentMode: 'Cash',
          paymentDate: new Date().toISOString().split('T')[0],
          bankAccountId: "",
          chequeNumber: "",
          upiReference: "",
          notes: "",
        });
        setOutstandingInvoices([]);
        setDistributionPreview([]);
        setShowPreview(false);
        // Reset selected vendor state when no vendorId is provided
        if (!vendorId) {
          setSelectedVendorId('');
          setSelectedVendorName('');
        }
      } catch (error) {
        console.error('Error resetting form:', error);
      }
    }
  }, [open, form]);

  // Create payment mutation
  const mutation = useMutation({
    mutationFn: async (data: VendorPaymentFormData): Promise<VendorPaymentDistributionResult> => {
      const payload: InsertVendorPayment = {
        vendorId: effectiveVendorId,
        amount: data.amount,
        paymentMode: data.paymentMode,
        paymentDate: new Date(data.paymentDate),
        bankAccountId: data.bankAccountId || undefined,
        chequeNumber: data.chequeNumber || undefined,
        upiReference: data.upiReference || undefined,
        notes: data.notes || undefined,
      };
      
      const response = await authenticatedApiRequest("POST", `/api/vendors/${effectiveVendorId}/payments`, payload);
      return response.json();
    },
    onSuccess: (result) => {
      setSubmissionError(null);
      setDistributionError(null);
      toast({
        title: "Payment Recorded",
        description: `Payment recorded and distributed across ${result.invoicesUpdated.length} invoice(s)`,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      // Invalidate outstanding invoices for the selected vendor
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", effectiveVendorId, "outstanding-invoices"] });
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to record payment";
      setSubmissionError(errorMessage);
      console.error('Payment submission error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: VendorPaymentFormData) => {
    try {
      setSubmissionError(null);
      
      // Validate vendor selection
      if (!effectiveVendorId) {
        throw new Error('Please select a vendor');
      }
      
      // Validate payment amount
      const paymentAmount = parseFloat(data.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Validate outstanding invoices
      if (outstandingInvoices.length === 0) {
        throw new Error('No outstanding invoices found for this vendor');
      }
      
      // Validate payment mode specific fields
      if (data.paymentMode === 'Bank' && !data.bankAccountId) {
        throw new Error('Bank account is required for bank transfers');
      }
      if (data.paymentMode === 'Cheque' && !data.chequeNumber) {
        throw new Error('Cheque number is required');
      }
      if (data.paymentMode === 'UPI' && !data.upiReference) {
        throw new Error('UPI reference is required');
      }
      
      mutation.mutate(data);
    } catch (error) {
      console.error('Payment submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.balanceAmount), 0);
  const paymentAmount = parseFloat(amount || '0');
  const totalDistributed = distributionPreview.reduce((sum, item) => sum + item.allocatedAmount, 0);
  const remainingAmount = Math.max(0, paymentAmount - totalDistributed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ErrorBoundary 
          resetKeys={[open ? 1 : 0, effectiveVendorId || '']}
          fallback={({ error, resetError }) => (
            <div className="p-4">
              <AlertComponent variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to load form</AlertTitle>
                <AlertDescriptionComponent className="mt-2 space-y-2">
                  <p>An error occurred while loading the vendor payment form.</p>
                  <div className="flex gap-2">
                    <Button onClick={resetError} size="sm">
                      Try Again
                    </Button>
                    <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
                      Close
                    </Button>
                  </div>
                </AlertDescriptionComponent>
              </AlertComponent>
            </div>
          )}
        >
          <DialogHeader>
            <DialogTitle>Record Payment - {vendorName || selectedVendorName || 'Vendor'}</DialogTitle>
          </DialogHeader>

          {/* Vendor selector when vendorId is not provided */}
          {!vendorId && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Vendor *
                  </label>
                  {vendorsError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to load vendors: {vendorsErrorMessage?.message || 'Unknown error'}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                          onClick={() => refetchVendors()}
                        >
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : !vendorsData ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Loading vendors...</span>
                    </div>
                  ) : (
                    <Select 
                      value={selectedVendorId} 
                      onValueChange={(value) => {
                        setSelectedVendorId(value);
                        const vendor = normalizedVendors?.find((v: any) => v.id === value);
                        setSelectedVendorName(vendor?.name || '');
                        // Clear invoices and preview state on entity change
                        setOutstandingInvoices([]);
                        setDistributionPreview([]);
                        setShowPreview(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizedVendors?.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            <div>
                              <div className="font-medium">{vendor.name}</div>
                              {vendor.phone && <div className="text-sm text-gray-500">{vendor.phone}</div>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Conditionally render the main form fields */}
          {effectiveVendorId ? (
            <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        {...field}
                        data-testid="input-vendor-payment-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor-payment-mode">
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
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-vendor-payment-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {BANK_REQUIRED_MODES.includes(paymentMode as any) && (
                <FormField
                  control={form.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-payment-bank">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccountsData?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bankName} - {account.name} - {account.accountNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {paymentMode === 'Cheque' && (
                <FormField
                  control={form.control}
                  name="chequeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter cheque number"
                          {...field}
                          data-testid="input-vendor-payment-cheque"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {paymentMode === 'UPI' && (
                <FormField
                  control={form.control}
                  name="upiReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI Reference *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter UPI transaction ID"
                          {...field}
                          data-testid="input-vendor-payment-upi"
                        />
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
                      data-testid="textarea-vendor-payment-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Distribution Preview */}
            {invoicesLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading outstanding invoices...</span>
                </CardContent>
              </Card>
            ) : outstandingInvoices.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No outstanding invoices for this vendor
                </AlertDescription>
              </Alert>
            ) : showPreview && distributionPreview.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Distribution Preview</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    This payment will be distributed across the following invoices (FIFO)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Invoice Date</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-right">Allocated Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributionPreview.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.invoice.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              {new Date(item.invoice.invoiceDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{parseFloat(item.invoice.balanceAmount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{item.allocatedAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Payment:</span>
                      <span>₹{paymentAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Distributed:</span>
                      <span>₹{totalDistributed.toFixed(2)}</span>
                    </div>
                    {remainingAmount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Remaining:</span>
                        <span>₹{remainingAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {paymentAmount > totalOutstanding && (
                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Payment amount exceeds total outstanding. Excess: ₹{(paymentAmount - totalOutstanding).toFixed(2)}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {submissionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescriptionComponent>
                  {submissionError}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                    onClick={() => setSubmissionError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescriptionComponent>
              </Alert>
            )}

            {distributionError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescriptionComponent>
                  {distributionError}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                    onClick={() => setDistributionError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescriptionComponent>
              </Alert>
            )}

            {invoicesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load outstanding invoices: {invoicesErrorMessage?.message || 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}

            {bankAccountsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load bank accounts: {bankAccountsErrorMessage?.message || 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-vendor-payment"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || outstandingInvoices.length === 0 || invoicesLoading}
                data-testid="button-record-vendor-payment"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </div>
          </form>
        </Form>
          ) : (
            !vendorId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Please select a vendor to continue
                </AlertDescription>
              </Alert>
            )
          )}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}