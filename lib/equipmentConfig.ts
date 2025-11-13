/**
 * Centralized configuration for equipment management
 */

export const EQUIPMENT_CONFIG = {
  // Currency settings (should eventually come from lab/user settings)
  currency: {
    code: "EUR",
    symbol: "€",
    locale: "en-IE", // Irish locale for formatting
  },

  // Stock level thresholds (percentage)
  thresholds: {
    critical: 25,  // Below this = critical/danger
    warning: 60,   // Below this = warning
    healthy: 100,  // Above warning = healthy
  },

  // Maintenance settings
  maintenance: {
    defaultIntervalDays: 90,
    defaultThreshold: 20, // Percentage
  },

  // Reorder settings
  reorder: {
    bufferWeeks: 2, // Extra weeks of buffer to order
    maxWeeksDisplay: 4, // Max weeks for health percentage calculation
  },
} as const

/**
 * Format currency consistently across the app
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const config = EQUIPMENT_CONFIG.currency
  const code = currencyCode || config.code

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback if currency code is invalid
    return `${config.symbol}${amount.toFixed(2)}`
  }
}

/**
 * Get health classification based on percentage
 */
export function getHealthClass(percent: number): 'critical' | 'warning' | 'healthy' {
  if (percent <= EQUIPMENT_CONFIG.thresholds.critical) return 'critical'
  if (percent <= EQUIPMENT_CONFIG.thresholds.warning) return 'warning'
  return 'healthy'
}

/**
 * Get health color for UI
 */
export function getHealthColor(percent: number): string {
  const healthClass = getHealthClass(percent)
  switch (healthClass) {
    case 'critical':
      return 'bg-red-500'
    case 'warning':
      return 'bg-orange-500'
    case 'healthy':
      return 'bg-green-500'
  }
}

/**
 * Get health text color for UI
 */
export function getHealthTextColor(percent: number): string {
  const healthClass = getHealthClass(percent)
  switch (healthClass) {
    case 'critical':
      return 'text-red-600'
    case 'warning':
      return 'text-orange-600'
    case 'healthy':
      return 'text-green-600'
  }
}

/**
 * Generate a unique ID using crypto.randomUUID() with fallback
 */
export function generateId(prefix: string = ''): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID()
    return prefix ? `${prefix}-${uuid}` : uuid
  }
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}
