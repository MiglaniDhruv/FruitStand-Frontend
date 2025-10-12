import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone number is required").regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: any;
}

export default function VendorForm({ open, onOpenChange, vendor }: VendorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!vendor;
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: vendor?.name || "",
      phone: vendor?.phone?.replace(/^\+91/, "") || "",
      address: vendor?.address || "",
      isActive: vendor?.isActive ?? true,
    },
  });

  // Reset form when vendor changes (for switching between create/edit modes)
  React.useEffect(() => {
    try {
      setSubmissionError(null);
      form.reset({
        name: vendor?.name || "",
        phone: vendor?.phone?.replace(/^\+91/, "") || "",
        address: vendor?.address || "",
        isActive: vendor?.isActive ?? true,
      });
    } catch (error) {
      console.error('Form reset error:', error);
    }
  }, [vendor, form]);

  // Clear submission error when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSubmissionError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      const url = isEditing ? `/api/vendors/${vendor.id}` : "/api/vendors";
      const method = isEditing ? "PUT" : "POST";
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      setSubmissionError(null);
      toast({
        title: isEditing ? "Vendor updated" : "Vendor created",
        description: `Vendor has been ${isEditing ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} vendor`;
      setSubmissionError(errorMessage);
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: VendorFormData) => {
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
      <DialogContent className="max-w-2xl">
        <ErrorBoundary 
          resetKeys={[open, vendor?.id]}
          fallback={({ error, resetError }) => (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to load form</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>An error occurred while loading the vendor form.</p>
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
            <DialogTitle>{isEditing ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
          </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} data-testid="input-vendor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-0">
                        <div className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">
                          +91
                        </div>
                        <Input 
                          placeholder="Enter 10-digit number" 
                          value={field.value || ""}
                          onChange={(e) => {
                            const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                            field.onChange(sanitized);
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-phone"
                          className="rounded-l-none"
                          maxLength={10}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this vendor
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter vendor address"
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-vendor"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                data-testid="button-save-vendor"
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update Vendor" : "Create Vendor"}
              </Button>
            </div>
          </form>
        </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
