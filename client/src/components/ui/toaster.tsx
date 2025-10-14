import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

/**
 * Toaster Component - Toast Notification Container
 * 
 * ARIA Live Region Configuration:
 * - ToastProvider automatically configures ARIA live regions for screen reader announcements
 * - ToastViewport creates the live region container with proper role and aria-live attributes
 * - Default toasts: aria-live="polite" (announced when screen reader is idle)
 * - Destructive toasts: aria-live="assertive" (announced immediately, interrupting current speech)
 * 
 * Screen Reader Behavior:
 * - When a toast appears, its title and description are announced via the live region
 * - Users can navigate to toasts using screen reader shortcuts (e.g., NVDA: D key for region navigation)
 * - Toast close button includes sr-only text "Close notification" for screen readers
 * - Toasts don't trap focus, allowing users to continue interacting with the page
 * 
 * Radix UI handles all ARIA live region management automatically:
 * - Dynamically adds/removes content from live region
 * - Manages announcement timing and priority
 * - Ensures proper role attributes (status/alert based on variant)
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
