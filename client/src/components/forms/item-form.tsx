import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quality: z.string().min(1, "Quality is required"),
  unit: z.enum(["box", "crate", "kgs"], {
    required_error: "Unit is required",
    invalid_type_error: "Unit must be box, crate, or kgs"
  }),
  vendorId: z.string().min(1, "Vendor is required"),
  isActive: z.boolean().default(true),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

export default function ItemForm({ open, onOpenChange, item }: ItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!item;
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name || "",
      quality: item?.quality || "",
      unit: item?.unit || "crate",
      vendorId: item?.vendorId || "",
      isActive: item?.isActive ?? true,
    },
  });

  // Reset form when item changes (for switching between create/edit modes)
  React.useEffect(() => {
    try {
      setSubmissionError(null);
      form.reset({
        name: item?.name || "",
        quality: item?.quality || "",
        unit: item?.unit || "crate",
        vendorId: item?.vendorId || "",
        isActive: item?.isActive ?? true,
      });
    } catch (error) {
      console.error('Form reset error:', error);
    }
  }, [item, form]);

  // Clear submission error when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSubmissionError(null);
    }
  }, [open]);

  const { data: vendors, isError: vendorsError, error: vendorsErrorMessage } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/vendors');
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const url = isEditing ? `/api/items/${item.id}` : "/api/items";
      const method = isEditing ? "PUT" : "POST";
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      setSubmissionError(null);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 500);
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: `Item has been ${isEditing ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} item`;
      setSubmissionError(errorMessage);
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    try {
      setSubmissionError(null);
      mutation.mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast({
        title: "Submission Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
        <ErrorBoundary 
          resetKeys={[open, item?.id]}
          fallback={({ error, resetError }) => (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to load form</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>An error occurred while loading the item form.</p>
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
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-4 sm:space-y-6 ${showSuccessAnimation ? 'animate-success' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} data-testid="input-item-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter quality grade" {...field} data-testid="input-quality" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="crate">Crate</SelectItem>
                        <SelectItem value="kgs">Kgs</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors && Array.isArray(vendors) ? vendors.map((vendor: any) => (
                          <SelectItem key={vendor?.id || ''} value={vendor?.id || ''}>
                            {vendor?.name || 'Unknown Vendor'}
                          </SelectItem>
                        )) : (
                          <SelectItem value="no-vendors" disabled>No vendors available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this item
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-item-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {vendorsError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Failed to load vendors. You may need to enter vendor information manually.
                </AlertDescription>
              </Alert>
            )}

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

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-item"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                data-testid="button-save-item"
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}