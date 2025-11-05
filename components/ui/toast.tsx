"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
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

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = React.useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(7)
      const newToast: Toast = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      const duration = toast.duration || 5000
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  const success = React.useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "success", message, duration })
    },
    [addToast]
  )

  const error = React.useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "error", message, duration })
    },
    [addToast]
  )

  const warning = React.useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "warning", message, duration })
    },
    [addToast]
  )

  const info = React.useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "info", message, duration })
    },
    [addToast]
  )

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
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
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 sm:max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-900"
      case "error":
        return "bg-red-50 border-red-200 text-red-900"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-900"
      default:
        return "bg-gray-50 border-gray-200 text-gray-900"
    }
  }

  const getIconStyles = () => {
    switch (toast.type) {
      case "success":
        return "✓"
      case "error":
        return "✕"
      case "warning":
        return "⚠"
      case "info":
        return "ℹ"
      default:
        return ""
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200",
        getToastStyles(),
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      )}
    >
      <div className="text-lg font-semibold">{getIconStyles()}</div>
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button
        onClick={handleRemove}
        className="rounded-md p-1 hover:bg-black/5 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
