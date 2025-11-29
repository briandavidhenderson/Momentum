"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "destructive" | "success" | "warning" | "info"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  // Legacy support
  message?: string
  type?: string
}

export interface ToastContextValue {
  toasts: Toast[]
  toast: (props: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
  // Helpers for backward compatibility
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = "default", duration = 5000, message, type }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(7)
      // Map legacy fields
      const desc = description || message
      const v = variant || (type === "error" ? "destructive" : type as ToastVariant) || "default"

      const newToast: Toast = { id, title, description: desc, variant: v, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  // Helpers
  const success = (message: string, duration?: number) => toast({ description: message, variant: "success", duration })
  const error = (message: string, duration?: number) => toast({ description: message, variant: "destructive", duration })
  const warning = (message: string, duration?: number) => toast({ description: message, variant: "warning", duration })
  const info = (message: string, duration?: number) => toast({ description: message, variant: "info", duration })

  // Aliases for backward compatibility
  const addToast = toast
  const removeToast = dismiss

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 sm:max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = React.useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const getVariantStyles = () => {
    switch (toast.variant) {
      case "destructive":
        return "bg-red-50 border-red-200 text-red-900"
      case "success":
        return "bg-green-50 border-green-200 text-green-900"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-900"
      default:
        return "bg-white border-slate-200 text-slate-900"
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200",
        getVariantStyles(),
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      )}
    >
      <div className="flex-1 grid gap-1">
        {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
        {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
      </div>
      <button
        onClick={handleRemove}
        className="rounded-md p-1 hover:bg-black/5 transition-colors -mr-2 -mt-2"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
