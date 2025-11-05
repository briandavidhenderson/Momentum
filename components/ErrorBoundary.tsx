"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you could send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = "/"
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h1>
                <p className="text-lg text-gray-600">
                  We&apos;re sorry for the inconvenience. An unexpected error occurred.
                </p>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="w-full mt-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto">
                  <h2 className="font-semibold text-gray-900 mb-2">
                    Error Details:
                  </h2>
                  <pre className="text-sm text-red-600 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="cursor-pointer font-semibold text-gray-700">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome}>
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                If this problem persists, please contact support or check the
                console for more details.
              </p>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Feature-specific Error Boundary
 * Use this for wrapping specific features with custom error handling
 */
export function FeatureErrorBoundary({
  children,
  featureName,
}: {
  children: ReactNode
  featureName: string
}) {
  const fallback = (
    <div className="p-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {featureName} Error
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        This feature encountered an error and couldn&apos;t be loaded.
      </p>
      <Button onClick={() => window.location.reload()} variant="outline" size="sm">
        <RefreshCw className="mr-2 h-4 w-4" />
        Reload Page
      </Button>
    </div>
  )

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error) => {
        console.error(`Error in ${featureName}:`, error)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
