import React from "react";
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
    form.reset({
      name: item?.name || "",
      quality: item?.quality || "",
      unit: item?.unit || "crate",
      vendorId: item?.vendorId || "",
      isActive: item?.isActive ?? true,
    });
  }, [item, form]);

  const { data: vendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
  });

  const mutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const url = isEditing ? `/api/items/${item.id}` : "/api/items";
      const method = isEditing ? "PUT" : "POST";
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Item updated" : "Item created",
        description: `Item has been ${isEditing ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} item`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ItemFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
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
      </DialogContent>
    </Dialog>
  );
}