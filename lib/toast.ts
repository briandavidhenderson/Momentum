/**
 * Toast notification helper
 * Provides a convenient way to show toast notifications throughout the app
 * Must be used within ToastProvider context
 */

import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "./constants"

// Re-export for convenience
export { useToast, ToastProvider } from "@/components/ui/toast"

// Helper function to get success messages
export function getSuccessMessage(key: keyof typeof SUCCESS_MESSAGES): string {
  return SUCCESS_MESSAGES[key]
}

// Helper function to get error messages
export function getErrorMessage(key: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[key]
}

// Helper to format Firebase errors into user-friendly messages
export function formatFirebaseError(error: any): string {
  if (!error) return ERROR_MESSAGES.GENERIC_ERROR

  const code = error.code || ""
  const message = error.message || ""

  // Common Firebase error codes
  if (code.includes("permission-denied")) {
    return ERROR_MESSAGES.PERMISSION_DENIED
  }
  if (code.includes("not-found")) {
    return ERROR_MESSAGES.NOT_FOUND
  }
  if (code.includes("already-exists")) {
    return ERROR_MESSAGES.ALREADY_EXISTS
  }
  if (code.includes("network") || code.includes("unavailable")) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  if (code.includes("invalid-email")) {
    return ERROR_MESSAGES.INVALID_EMAIL
  }

  // Return the error message if available, otherwise generic
  return message || ERROR_MESSAGES.GENERIC_ERROR
}

// Helper to handle async operations with toast notifications
export async function withToast<T>(
  operation: () => Promise<T>,
  options: {
    toast: {
      success: (message: string) => void
      error: (message: string) => void
    }
    successMessage?: string
    errorMessage?: string
    onSuccess?: (result: T) => void
    onError?: (error: any) => void
  }
): Promise<T | null> {
  try {
    const result = await operation()
    if (options.successMessage) {
      options.toast.success(options.successMessage)
    }
    if (options.onSuccess) {
      options.onSuccess(result)
    }
    return result
  } catch (error) {
    console.error("Operation failed:", error)
    const errorMsg = options.errorMessage || formatFirebaseError(error)
    options.toast.error(errorMsg)
    if (options.onError) {
      options.onError(error)
    }
    return null
  }
}
