import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Loader2 } from "lucide-react";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'destructive' | 'warning';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  variant = 'destructive',
  isLoading = false
}: ConfirmationDialogProps) {
  const Icon = variant === 'destructive' ? AlertTriangle : AlertCircle;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Keep dialog open on error
      console.error('Confirmation action failed:', error);
    }
  };

  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Prevent closing while loading
        if (!newOpen && isLoading) {
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <AlertDialogContent aria-busy={isLoading}>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-amber-500'}`} />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationDialog;