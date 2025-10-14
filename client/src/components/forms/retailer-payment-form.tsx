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
import { useIsMobile } from "@/hooks/use-mobile";
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
import { InsertRetailerPayment, RetailerPaymentDistributionResult, SalesInvoice } from "@shared/schema";

const retailerPaymentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  paymentMode: z.enum(['Cash', 'Bank', 'UPI', 'Cheque', 'PaymentLink']),
  paymentDate: z.string().min(1, "Payment date is required"),
  bankAccountId: z.string().optional(),
  chequeNumber: z.string().optional(),
  upiReference: z.string().optional(),
  paymentLinkId: z.string().optional(),
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
  if (data.paymentMode === 'PaymentLink' && !data.paymentLinkId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment link is required",
      path: ['paymentLinkId'],
    });
  }
});

type RetailerPaymentFormData = z.infer<typeof retailerPaymentFormSchema>;

interface RetailerPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailerId: string | undefined;
  retailerName?: string;
}

export default function RetailerPaymentForm({ open, onOpenChange, retailerId, retailerName }: RetailerPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoice[]>([]);
  const [distributionPreview, setDistributionPreview] = useState<Array<{ invoice: SalesInvoice; allocatedAmount: number }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [distributionError, setDistributionError] = useState<string | null>(null);
  
  // State management for selected retailer
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [selectedRetailerName, setSelectedRetailerName] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  
  const form = useForm<RetailerPaymentFormData>({
    resolver: zodResolver(retailerPaymentFormSchema),
    defaultValues: {
      amount: "",
      paymentMode: 'Cash',
      paymentDate: today,
      bankAccountId: "",
      chequeNumber: "",
      upiReference: "",
      paymentLinkId: "",
      notes: "",
    },
  });

  const paymentMode = form.watch('paymentMode');
  const amount = form.watch('amount');

  // Compute the effective retailer ID
  const effectiveRetailerId = retailerId || selectedRetailerId;

  // Fetch retailers list
  const { data: retailersData, isError: retailersError, error: retailersErrorMessage, refetch: refetchRetailers } = useQuery({
    queryKey: ["/api/retailers"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/retailers?limit=100");
      return response.json();
    },
    enabled: open && !retailerId,
  });

  // Normalize retailers list to handle both raw arrays and { data: [...] } shapes
  const normalizedRetailers = Array.isArray(retailersData) ? retailersData : retailersData?.data || [];

  // Fetch outstanding invoices
  const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError, error: invoicesErrorMessage } = useQuery({
    queryKey: ["/api/retailers", effectiveRetailerId, "outstanding-invoices"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/retailers/${effectiveRetailerId}/outstanding-invoices`);
      return response.json();
    },
    enabled: open && !!effectiveRetailerId,
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
        const preview: Array<{ invoice: SalesInvoice; allocatedAmount: number }> = [];
        
        for (const invoice of outstandingInvoices) {
          if (remainingAmount <= 0) break;
          
          const invoiceBalance = parseFloat(invoice.udhaaarAmount || '0');
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
          paymentLinkId: "",
          notes: "",
        });
        setOutstandingInvoices([]);
        setDistributionPreview([]);
        setShowPreview(false);
        // Reset selected retailer state when no retailerId is provided
        if (!retailerId) {
          setSelectedRetailerId('');
          setSelectedRetailerName('');
        }
      } catch (error) {
        console.error('Error resetting form:', error);
      }
    }
  }, [open, form]);

  // Create payment mutation
  const mutation = useMutation({
    mutationFn: async (data: RetailerPaymentFormData): Promise<RetailerPaymentDistributionResult> => {
      const payload: InsertRetailerPayment = {
        retailerId: effectiveRetailerId,
        amount: data.amount,
        paymentMode: data.paymentMode,
        paymentDate: new Date(data.paymentDate),
        bankAccountId: data.bankAccountId || undefined,
        chequeNumber: data.chequeNumber || undefined,
        upiReference: data.upiReference || undefined,
        paymentLinkId: data.paymentLinkId || undefined,
        notes: data.notes || undefined,
      };
      
      const response = await authenticatedApiRequest("POST", `/api/retailers/${effectiveRetailerId}/payments`, payload);
      return response.json();
    },
    onSuccess: (result: any) => {
      try {
        setSubmissionError(null);
        toast({
          title: "Payment Recorded",
          description: `Payment recorded and distributed across ${result.invoicesUpdated?.length || 0} invoice(s)`,
        });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/sales-payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
        // Invalidate outstanding invoices for the selected retailer
        queryClient.invalidateQueries({ queryKey: ["/api/retailers", effectiveRetailerId, "outstanding-invoices"] });
        
        onOpenChange(false);
        form.reset();
      } catch (error) {
        console.error('Error in onSuccess handler:', error);
        setSubmissionError('Payment recorded but there was an error updating the interface');
      }
    },
    onError: (error: any) => {
      console.error('Payment submission error:', error);
      const errorMessage = error?.message || 'Failed to record payment. Please try again.';
      setSubmissionError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RetailerPaymentFormData) => {
    try {
      setSubmissionError(null);
      
      // Validate retailer selection
      if (!effectiveRetailerId) {
        throw new Error('Please select a retailer');
      }
      
      // Validate payment amount
      const paymentAmount = parseFloat(data.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount');
      }
      
      // Validate outstanding invoices
      if (outstandingInvoices.length === 0) {
        throw new Error('No outstanding invoices found for this retailer');
      }
      
      // Validate payment mode specific fields
      if (data.paymentMode === 'Cheque' && !data.chequeNumber?.trim()) {
        throw new Error('Cheque number is required for cheque payments');
      }
      
      if (data.paymentMode === 'Bank' && !data.bankAccountId) {
        throw new Error('Bank account is required for bank transfers');
      }
      
      if (data.paymentMode === 'UPI' && !data.upiReference?.trim()) {
        throw new Error('UPI reference is required for UPI payments');
      }
      
      if (data.paymentMode === 'PaymentLink' && !data.paymentLinkId?.trim()) {
        throw new Error('Payment link ID is required for payment link transactions');
      }
      
      mutation.mutate(data);
    } catch (error) {
      console.error('Form validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please check the form data and try again';
      setSubmissionError(errorMessage);
    }
  };

  const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.udhaaarAmount || '0'), 0);
  const paymentAmount = parseFloat(amount || '0');
  const totalDistributed = distributionPreview.reduce((sum, item) => sum + item.allocatedAmount, 0);
  const remainingAmount = Math.max(0, paymentAmount - totalDistributed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <ErrorBoundary 
          resetKeys={[open ? 1 : 0, effectiveRetailerId || '']}
          fallback={({ error, resetError }) => (
            <div className="p-4">
              <AlertComponent variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to load form</AlertTitle>
                <AlertDescriptionComponent className="mt-2 space-y-2">
                  <p>An error occurred while loading the retailer payment form.</p>
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
            <DialogTitle>Record Payment - {retailerName || selectedRetailerName || 'Retailer'}</DialogTitle>
          </DialogHeader>

          {/* Retailer selector when retailerId is not provided */}
          {!retailerId && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Retailer *
                  </label>
                  {retailersError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to load retailers: {retailersErrorMessage?.message || 'Unknown error'}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                          onClick={() => refetchRetailers()}
                        >
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : !retailersData ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Loading retailers...</span>
                    </div>
                  ) : (
                    <Select 
                      value={selectedRetailerId} 
                      onValueChange={(value) => {
                        setSelectedRetailerId(value);
                        const retailer = normalizedRetailers?.find((r: any) => r.id === value);
                        setSelectedRetailerName(retailer?.name || '');
                        // Clear invoices and preview state on entity change
                        setOutstandingInvoices([]);
                        setDistributionPreview([]);
                        setShowPreview(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a retailer" />
                      </SelectTrigger>
                      <SelectContent>
                        {normalizedRetailers?.map((retailer: any) => (
                          <SelectItem key={retailer.id} value={retailer.id}>
                            <div>
                              <div className="font-medium">{retailer.name}</div>
                              {retailer.phone && <div className="text-sm text-gray-500">{retailer.phone}</div>}
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
          {effectiveRetailerId ? (
            <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                        data-testid="input-retailer-payment-amount"
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
                        <SelectTrigger data-testid="select-retailer-payment-mode">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="PaymentLink">Payment Link</SelectItem>
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
                        data-testid="input-retailer-payment-date"
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
                          <SelectTrigger data-testid="select-retailer-payment-bank">
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
                          data-testid="input-retailer-payment-cheque"
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
                          data-testid="input-retailer-payment-upi"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {paymentMode === 'PaymentLink' && (
                <FormField
                  control={form.control}
                  name="paymentLinkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Link ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter payment link ID"
                          {...field}
                          data-testid="input-retailer-payment-link"
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
                      data-testid="textarea-retailer-payment-notes"
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
                  No outstanding invoices for this retailer
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
                  {isMobile ? (
                    <div className="space-y-2">
                      {distributionPreview.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-3">
                            <div className="font-medium">{item.invoice.invoiceNumber}</div>
                            <div className="text-sm text-muted-foreground">{new Date(item.invoice.invoiceDate).toLocaleDateString()}</div>
                            <div className="flex justify-between mt-2">
                              <span className="text-sm">Udhaar:</span>
                              <span className="font-medium">₹{parseFloat(item.invoice.udhaaarAmount || '0').toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Allocated:</span>
                              <span className="font-medium text-green-600">₹{item.allocatedAmount.toFixed(2)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Invoice Number</TableHead>
                            <TableHead className="text-xs sm:text-sm">Invoice Date</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Udhaar</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Allocated Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {distributionPreview.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                {item.invoice.invoiceNumber}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {new Date(item.invoice.invoiceDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">
                                ₹{parseFloat(item.invoice.udhaaarAmount || '0').toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">
                                ₹{item.allocatedAmount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-2 text-xs sm:text-sm">
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
                <AlertDescription>
                  {submissionError}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                    onClick={() => setSubmissionError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {distributionError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {distributionError}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                    onClick={() => setDistributionError(null)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
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

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-retailer-payment"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || outstandingInvoices.length === 0 || invoicesLoading}
                data-testid="button-record-retailer-payment"
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
            !retailerId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Please select a retailer to continue
                </AlertDescription>
              </Alert>
            )
          )}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}