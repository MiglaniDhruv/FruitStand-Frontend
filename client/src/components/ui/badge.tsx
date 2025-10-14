import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge Component - WCAG AA Compliant Status Indicators
 * 
 * Variants:
 * - default: Primary badge (4.5:1 contrast)
 * - secondary: Neutral badge (4.5:1 contrast)
 * - destructive: Error/danger badge (4.5:1 contrast)
 * - outline: Bordered badge (3:1 border contrast)
 * - success: Success state (4.5:1 contrast with 10% opacity background)
 * - warning: Warning state (4.5:1 contrast with 10% opacity background)
 * - info: Informational state (4.5:1 contrast with 10% opacity background)
 * - paid/pending/partial/unpaid: Invoice status badges (4.5:1 contrast)
 * 
 * Usage:
 * <Badge variant="paid">Paid</Badge>
 * <Badge variant="success">Success</Badge>
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus-visible:ring-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground border-border",
        success:
          "border-success/20 bg-success/10 text-success hover:bg-success/20",
        warning:
          "border-warning/20 bg-warning/10 text-warning hover:bg-warning/20",
        info:
          "border-info/20 bg-info/10 text-info hover:bg-info/20",
        paid:
          "border-status-paid/20 bg-status-paid/10 text-status-paid hover:bg-status-paid/20",
        pending:
          "border-status-pending/20 bg-status-pending/10 text-status-pending hover:bg-status-pending/20",
        partial:
          "border-status-partial/20 bg-status-partial/10 text-status-partial hover:bg-status-partial/20",
        unpaid:
          "border-status-unpaid/20 bg-status-unpaid/10 text-status-unpaid hover:bg-status-unpaid/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
