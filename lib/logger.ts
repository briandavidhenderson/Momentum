/**
 * Logger Utility
 *
 * Centralized logging system that:
 * - Only logs in development mode (prevents production console spam)
 * - Provides type-safe logging methods
 * - Allows future enhancements (log levels, remote logging, etc.)
 * - Fixes ESLint no-console warnings
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User logged in', { userId: '123' })
 *   logger.warn('Low stock detected', { item: 'ABC' })
 *   logger.error('Failed to save', error)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production'
  }

  /**
   * Debug-level logging (verbose, detailed information)
   * Only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Info-level logging (general information)
   * Only shown in development
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, context || '')
    }
  }

  /**
   * Warning-level logging (potential issues)
   * Shown in both development and production
   */
  warn(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context || '')
  }

  /**
   * Error-level logging (actual errors)
   * Always shown, includes stack traces
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error || '', context || '')
  }

  /**
   * Group logging (for related log entries)
   * Only shown in development
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.group(label)
      callback()
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }

  /**
   * Table logging (for structured data)
   * Only shown in development
   */
  table(data: any): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.table(data)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogLevel, LogContext }
