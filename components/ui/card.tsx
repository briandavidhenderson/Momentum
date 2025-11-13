"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg text-card-foreground transition-all",
  {
    variants: {
      variant: {
        default: "border bg-card shadow-sm",
        elevated: "bg-card shadow-md hover:shadow-lg",
        interactive: "border bg-card shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer active:scale-[0.99]",
        outlined: "border-2 bg-card",
        ghost: "bg-transparent",
      },
      selected: {
        true: "border-primary shadow-md ring-2 ring-primary/20",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      selected: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  statusRibbon?: {
    color: string
    label?: string
  }
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, selected, statusRibbon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, selected }), "relative overflow-hidden", className)}
      {...props}
    >
      {statusRibbon && (
        <div
          className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={cn(
              "absolute top-6 -right-8 w-40 py-1 text-center text-xs font-semibold text-white transform rotate-45 shadow-md",
              statusRibbon.color
            )}
          >
            {statusRibbon.label || "Status"}
          </div>
        </div>
      )}
      {props.children}
    </div>
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
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
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export interface CollapsibleCardProps extends CardProps {
  defaultOpen?: boolean
  onToggle?: (isOpen: boolean) => void
  trigger?: React.ReactNode
}

const CollapsibleCard = React.forwardRef<HTMLDivElement, CollapsibleCardProps>(
  ({ defaultOpen = true, onToggle, trigger, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    const handleToggle = () => {
      const newState = !isOpen
      setIsOpen(newState)
      onToggle?.(newState)
    }

    return (
      <Card ref={ref} {...props}>
        <button
          onClick={handleToggle}
          className="w-full text-left"
          aria-expanded={isOpen}
        >
          <CardHeader className="flex-row items-center justify-between space-y-0">
            {trigger}
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isOpen ? "rotate-180" : ""
              )}
            />
          </CardHeader>
        </button>
        {isOpen && <div>{children}</div>}
      </Card>
    )
  }
)
CollapsibleCard.displayName = "CollapsibleCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CollapsibleCard,
}
