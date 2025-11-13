"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"
export type ToastPosition = "top-right" | "top-center" | "bottom-right" | "bottom-center"

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number, action?: Toast["action"]) => void
  error: (message: string, duration?: number, action?: Toast["action"]) => void
  warning: (message: string, duration?: number, action?: Toast["action"]) => void
  info: (message: string, duration?: number, action?: Toast["action"]) => void
  position: ToastPosition
  setPosition: (position: ToastPosition) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({
  children,
  defaultPosition = "bottom-right",
}: {
  children: React.ReactNode
  defaultPosition?: ToastPosition
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [position, setPosition] = React.useState<ToastPosition>(defaultPosition)

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
    (message: string, duration?: number, action?: Toast["action"]) => {
      addToast({ type: "success", message, duration, action })
    },
    [addToast]
  )

  const error = React.useCallback(
    (message: string, duration?: number, action?: Toast["action"]) => {
      addToast({ type: "error", message, duration, action })
    },
    [addToast]
  )

  const warning = React.useCallback(
    (message: string, duration?: number, action?: Toast["action"]) => {
      addToast({ type: "warning", message, duration, action })
    },
    [addToast]
  )

  const info = React.useCallback(
    (message: string, duration?: number, action?: Toast["action"]) => {
      addToast({ type: "info", message, duration, action })
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
    position,
    setPosition,
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
  const { toasts, removeToast, position } = useToast()

  const positionClasses = {
    "top-right": "top-0 right-0",
    "top-center": "top-0 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-0 right-0",
    "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-2 p-4 sm:max-w-md pointer-events-none",
        positionClasses[position]
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [progress, setProgress] = React.useState(100)
  const duration = toast.duration || 5000

  React.useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
    }, 50)

    return () => clearInterval(interval)
  }, [duration])

  const handleRemove = () => {
    onRemove(toast.id)
  }

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:text-green-100 dark:border-green-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:text-red-100 dark:border-red-800"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800"
    }
  }

  const getIcon = () => {
    const iconClass = "h-5 w-5"
    switch (toast.type) {
      case "success":
        return <CheckCircle2 className={cn(iconClass, "text-green-600 dark:text-green-400")} />
      case "error":
        return <XCircle className={cn(iconClass, "text-red-600 dark:text-red-400")} />
      case "warning":
        return <AlertTriangle className={cn(iconClass, "text-yellow-600 dark:text-yellow-400")} />
      case "info":
        return <Info className={cn(iconClass, "text-blue-600 dark:text-blue-400")} />
      default:
        return null
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="pointer-events-auto relative"
    >
      <div
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm overflow-hidden",
          getToastStyles()
        )}
      >
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <div className="flex items-center gap-2">
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                handleRemove()
              }}
              className="text-sm font-semibold underline underline-offset-2 hover:no-underline transition-all"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={handleRemove}
            className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-current opacity-50"
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  )
}
