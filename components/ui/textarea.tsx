"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:ring-yellow-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  helperText?: string
  errorText?: string
  showCharCount?: boolean
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant,
    helperText,
    errorText,
    showCharCount,
    maxLength,
    autoResize,
    ...props
  }, ref) => {
    const displayVariant = errorText ? "error" : variant
    const [charCount, setCharCount] = React.useState(0)
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    const handleRef = (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCharCount) {
        setCharCount(e.target.value.length)
      }
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
      props.onChange?.(e)
    }

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [autoResize])

    return (
      <div className="w-full">
        <textarea
          className={cn(
            textareaVariants({ variant: displayVariant }),
            autoResize && "resize-none overflow-hidden",
            className
          )}
          ref={handleRef}
          maxLength={maxLength}
          aria-invalid={!!errorText}
          aria-describedby={
            errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
          }
          onChange={handleChange}
          {...props}
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1">
            {errorText && (
              <p id={`${props.id}-error`} className="text-sm text-destructive">
                {errorText}
              </p>
            )}
            {!errorText && helperText && (
              <p id={`${props.id}-helper`} className="text-sm text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className="text-sm text-muted-foreground">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
