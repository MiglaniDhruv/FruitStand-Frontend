import React, { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { authenticatedApiRequest } from '@/lib/auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { BankAccount, TenantSettings } from '@shared/schema';

type ManualBankTransactionFormData = {
  transactionType: 'deposit' | 'withdrawal';
  bankAccountId: string;
  amount: string;
  date: string;
  description: string;
  source?: 'cash' | 'external';
};

interface ManualBankTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedBankAccountId?: string;
  preSelectedTransactionType?: 'deposit' | 'withdrawal';
}

function ManualBankTransactionFormComponent({
  open,
  onOpenChange,
  preSelectedBankAccountId,
  preSelectedTransactionType,
}: ManualBankTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();



  // Fetch tenant settings for cash balance
  const { data: tenantSettingsData, isLoading: isLoadingTenantSettings } = useQuery<TenantSettings>({
    queryKey: ["/api/tenants/current/settings"],
    queryFn: async (): Promise<TenantSettings> => {
      const res = await authenticatedApiRequest("GET", "/api/tenants/current/settings");
      if (!res.ok) {
        throw new Error(`Failed to fetch tenant settings: ${res.status} ${res.statusText}`);
      }
      return res.json();
    },
  });

  const cashBalance = tenantSettingsData?.cashBalance ?? '0.00';
  const cashBalanceRef = useRef(cashBalance);
  
  // Update ref when cash balance changes
  useEffect(() => {
    cashBalanceRef.current = cashBalance;
  }, [cashBalance]);

  // Create stable schema with superRefine for dynamic validation
  const manualBankTransactionSchema = useMemo(() => {
    return z.object({
      transactionType: z.enum(['deposit', 'withdrawal']),
      bankAccountId: z.string().min(1, 'Bank account is required'),
      amount: z.string().min(1, 'Amount is required').refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, 'Amount must be a positive number'),
      date: z.string().min(1, 'Date is required'),
      description: z.string().min(1, 'Description is required'),
      source: z.enum(['cash', 'external']).optional()
    }).refine((data) => {
      // If transaction type is deposit, source is required
      if (data.transactionType === 'deposit' && !data.source) {
        return false;
      }
      return true;
    }, {
      message: 'Source is required for deposits',
      path: ['source']
    }).superRefine((data, ctx) => {
      // Validate cash balance for cash deposits using current ref value
      if (data.transactionType === 'deposit' && data.source === 'cash') {
        const amount = parseFloat(data.amount);
        const availableCash = parseFloat(cashBalanceRef.current);
        if (amount > availableCash) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Insufficient cash balance. Available: ₹${availableCash.toFixed(2)}`,
            path: ['amount']
          });
        }
      }
    });
  }, []);

  // Initialize form with dynamic schema
  const form = useForm<ManualBankTransactionFormData>({
    resolver: zodResolver(manualBankTransactionSchema),
    defaultValues: {
      transactionType: preSelectedTransactionType || 'deposit',
      bankAccountId: preSelectedBankAccountId || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      source: 'external',
    },
  });

  const watchedTransactionType = form.watch('transactionType');
  const watchedSource = form.watch('source');

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const res = await authenticatedApiRequest("GET", "/api/bank-accounts");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
    select: (accounts: BankAccount[]) => accounts.filter(a => a.isActive),
  });

  // Effect for pre-selection
  useEffect(() => {
    if (open) {
      if (preSelectedBankAccountId) {
        form.setValue('bankAccountId', preSelectedBankAccountId);
      }
      if (preSelectedTransactionType) {
        form.setValue('transactionType', preSelectedTransactionType);
      }
    }
  }, [open, preSelectedBankAccountId, preSelectedTransactionType, form]);

  // Mutation for transaction submission
  const transactionMutation = useMutation({
    mutationFn: async (data: ManualBankTransactionFormData) => {
      const endpoint = data.transactionType === 'deposit' 
        ? `/api/bank-accounts/${data.bankAccountId}/deposit`
        : `/api/bank-accounts/${data.bankAccountId}/withdrawal`;
      
      const payload = data.transactionType === 'deposit'
        ? {
            amount: data.amount,
            date: data.date,
            description: data.description,
            source: data.source,
          }
        : {
            amount: data.amount,
            date: data.date,
            description: data.description,
          };

      const response = await authenticatedApiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      const kind = variables.transactionType;
      toast({
        title: 'Success',
        description: `Bank ${kind} recorded successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledgers"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to record bank ${watchedTransactionType}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ManualBankTransactionFormData) => {
    transactionMutation.mutate(data);
  };

  const isDeposit = watchedTransactionType === 'deposit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? 'Record Bank Deposit' : 'Record Bank Withdrawal'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction Type */}
              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!preSelectedTransactionType}
                      data-testid="select-transaction-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bank Account */}
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!preSelectedBankAccountId || isLoadingBankAccounts}
                      data-testid="select-bank-account"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts?.map((account: BankAccount) => (
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

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-transaction-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-transaction-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source - conditional for deposits only */}
              {watchedTransactionType === 'deposit' && (
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-row space-x-6"
                            data-testid="radio-transaction-source"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash" id="cash" disabled={isLoadingTenantSettings} />
                              <label htmlFor="cash">Cash</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="external" id="external" />
                              <label htmlFor="external">External</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Cash Balance Display */}
              {watchedTransactionType === 'deposit' && watchedSource === 'cash' && (
                <div className="md:col-span-2">
                  {isLoadingTenantSettings ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                      <span className="text-sm text-muted-foreground">Loading cash balance...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                      <span className="text-sm font-medium">Available Cash Balance:</span>
                      <span className="text-sm font-semibold text-primary">
                        ₹{parseFloat(cashBalance).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter transaction description"
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-transaction-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-transaction"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transactionMutation.isPending}
                data-testid="button-submit-transaction"
              >
                {transactionMutation.isPending
                  ? `Recording ${isDeposit ? 'Deposit' : 'Withdrawal'}...`
                  : `Record ${isDeposit ? 'Deposit' : 'Withdrawal'}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManualBankTransactionForm(
  props: ManualBankTransactionFormProps
) {
  return (
    <ErrorBoundary>
      <ManualBankTransactionFormComponent {...props} />
    </ErrorBoundary>
  );
}
