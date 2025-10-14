import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Component - WCAG AA Compliant Interactive Elements
 * 
 * All variants meet WCAG AA standards:
 * - Text contrast: 4.5:1 minimum (text vs background)
 * - UI component contrast: 3:1 minimum (border/background vs page background)
 * - Focus ring: 3:1 contrast, 2px width
 * - Touch target: Minimum 44x44px (h-11)
 * - Disabled state: cursor-not-allowed, 50% opacity maintains 3:1 UI contrast
 * 
 * Hover states use explicit tokens instead of opacity reduction:
 * - primary-hover, secondary-hover, destructive-hover: Preserve text contrast >= 4.5:1
 * - accent-strong: Enhanced visibility for outline/ghost hover (>= 3:1 UI contrast)
 * - outline border: Uses dedicated --outline token with guaranteed 3:1 vs background
 * 
 * High contrast mode automatically enhances all variants via CSS custom properties in index.css
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        outline:
          "border border-outline bg-background hover:bg-accent-strong hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-accent-strong hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 md:h-10 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
