import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { BankAccount } from "@shared/schema";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";

// Client-side validation schema matching the backend
const bankAccountFormSchema = z.object({
  name: z.string().min(1, "Bank account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  ifscCode: z.string().optional(),
  balance: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Balance must be a valid non-negative number"),
  isActive: z.boolean().default(true),
});

type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount?: BankAccount | null;
}

function BankAccountFormContent({ open, onOpenChange, bankAccount }: BankAccountFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!bankAccount;

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: {
      name: "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      balance: "0.00",
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or bankAccount changes
  useEffect(() => {
    if (open) {
      if (isEditing && bankAccount) {
        form.reset({
          name: bankAccount.name,
          accountNumber: bankAccount.accountNumber,
          bankName: bankAccount.bankName,
          ifscCode: bankAccount.ifscCode || "",
          balance: bankAccount.balance || "0.00",
          isActive: bankAccount.isActive ?? true,
        });
      } else {
        form.reset({
          name: "",
          accountNumber: "",
          bankName: "",
          ifscCode: "",
          balance: "0.00",
          isActive: true,
        });
      }
    }
  }, [open, bankAccount, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      const url = isEditing 
        ? `/api/bank-accounts/${bankAccount!.id}`
        : `/api/bank-accounts`;
      
      const method = isEditing ? "PUT" : "POST";
      
      // Don't send balance in edit mode
      const payload = isEditing 
        ? { ...data, balance: undefined }
        : data;
      
      const response = await authenticatedApiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Bank account ${isEditing ? 'updated' : 'created'}`,
        description: `Bank account has been ${isEditing ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} bank account`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Bank Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter account name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter bank name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ifscCode"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>IFSC Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter IFSC code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        Initial Balance
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Balance can only be set during creation</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the current balance of this bank account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this bank account
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : (isEditing ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BankAccountForm(props: BankAccountFormProps) {
  return (
    <ErrorBoundary>
      <BankAccountFormContent {...props} />
    </ErrorBoundary>
  );
}