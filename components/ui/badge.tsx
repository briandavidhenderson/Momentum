import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        outline: "text-foreground border-border hover:bg-accent",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        xs: "px-1.5 py-0.5 text-[10px] gap-0.5",
        sm: "px-2 py-0.5 text-xs gap-1",
        default: "px-2.5 py-0.5 text-xs gap-1",
        lg: "px-3 py-1 text-sm gap-1.5",
      },
      interactive: {
        true: "cursor-pointer active:scale-95",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  dot?: boolean
  dotColor?: string
}

function Badge({
  className,
  variant,
  size,
  interactive,
  icon,
  iconPosition = "left",
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size, interactive }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColor || "bg-current")}
          aria-hidden="true"
        />
      )}
      {icon && iconPosition === "left" && (
        <span className="inline-flex">{icon}</span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="inline-flex">{icon}</span>
      )}
    </div>
  )
}

export { Badge, badgeVariants }
