import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Card Variants - Flexible sizing and shadow options
 * 
 * Size variants:
 * - sm: Compact cards for mobile views or dense layouts (p-4)
 * - default: Standard cards for most use cases (p-6)
 * - lg: Prominent cards for KPIs or hero sections (p-8)
 * 
 * Shadow variants:
 * - none: No shadow for nested cards
 * - sm: Subtle shadow for standard elevation (default)
 * - md: Enhanced shadow for elevated cards
 * 
 * Hover variant:
 * - Adds subtle lift effect for interactive cards
 * 
 * Usage examples:
 * <Card size="lg" shadow="md" hover> // Dashboard KPI card
 * <Card size="sm" shadow="none"> // Nested card
 * <Card> // Standard card (default size and shadow)
 */
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground",
  {
    variants: {
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      shadow: {
        none: "",
        sm: "shadow-sm",
        md: "shadow-md",
      },
      hover: {
        true: "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      shadow: "sm",
      hover: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, size, shadow, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ size, shadow, hover }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
    }
    
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1", sizeClasses[size], className)}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-4 pt-0",
      default: "p-6 pt-0",
      lg: "p-8 pt-0",
    }
    
    return (
      <div 
        ref={ref} 
        className={cn(sizeClasses[size], className)} 
        {...props} 
      />
    )
  }
)
CardContent.displayName = "CardContent"

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-4 pt-0",
      default: "p-6 pt-0",
      lg: "p-8 pt-0",
    }
    
    return (
      <div
        ref={ref}
        className={cn("flex items-center", sizeClasses[size], className)}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
