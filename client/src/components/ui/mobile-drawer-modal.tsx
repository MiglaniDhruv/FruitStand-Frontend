import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

export interface MobileDrawerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  fullScreenOnMobile?: boolean;
  className?: string;
}

/**
 * Responsive modal component that uses Drawer on mobile and Dialog on desktop
 * 
 * Automatically switches between Drawer (full-screen on mobile) and Dialog (centered on desktop)
 * based on viewport size. Provides a consistent API for both modes.
 * 
 * @example
 * <MobileDrawerModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Edit Item"
 *   description="Make changes to your item"
 * >
 *   <form>...</form>
 * </MobileDrawerModal>
 */
export function MobileDrawerModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  fullScreenOnMobile = true,
  className,
}: MobileDrawerModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className={`${fullScreenOnMobile ? 'h-[95vh]' : 'h-auto'} pb-[env(safe-area-inset-bottom)] ${className || ''}`}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto ${className || ''}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Content wrapper for MobileDrawerModal
 * Provides consistent spacing and layout
 */
export function MobileDrawerModalContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-4 ${className || ''}`}>{children}</div>;
}

/**
 * Footer wrapper for MobileDrawerModal
 * Provides consistent button layout
 */
export function MobileDrawerModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4 border-t ${className || ''}`}>
      {children}
    </div>
  );
}
