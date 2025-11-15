/**
 * Pure calculation functions for equipment management
 * These functions have no side effects and can be easily tested
 */

import { EquipmentDevice, EquipmentSupply } from "./types"
import { EQUIPMENT_CONFIG } from "./equipmentConfig"
import { logger } from "./logger"

/**
 * Calculate maintenance health percentage (0-100)
 * @param lastMaintained - ISO date string or Date
 * @param maintenanceDays - Number of days between maintenance
 * @returns Health percentage (0-100)
 */
export function calculateMaintenanceHealth(
  lastMaintained: string | Date | undefined,
  maintenanceDays: number
): number {
  if (!lastMaintained || maintenanceDays <= 0) return 100

  try {
    const lastDate = typeof lastMaintained === 'string' ? new Date(lastMaintained) : lastMaintained
    const today = new Date()

    // Guard against invalid dates
    if (isNaN(lastDate.getTime())) return 100

    const elapsedDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    const p = Math.max(0, 1 - elapsedDays / maintenanceDays)
    return Math.round(p * 100)
  } catch (error) {
    logger.error('Error calculating maintenance health', error)
    return 100 // Default to healthy if calculation fails
  }
}

/**
 * Calculate weeks remaining for a supply
 * @param currentQty - Current quantity
 * @param burnPerWeek - Burn rate per week
 * @returns Weeks remaining (99 if no burn rate)
 */
export function calculateWeeksRemaining(currentQty: number, burnPerWeek: number): number {
  if (burnPerWeek <= 0) return 99
  return currentQty / burnPerWeek
}

/**
 * Convert weeks remaining to health percentage (0-100)
 * @param weeks - Weeks remaining
 * @returns Health percentage (0-100)
 */
export function weeksToHealthPercentage(weeks: number): number {
  const maxWeeks = EQUIPMENT_CONFIG.reorder.maxWeeksDisplay
  const p = Math.min(100, (weeks / maxWeeks) * 100)
  return Math.max(0, p)
}

/**
 * Calculate supplies health for a device (worst supply determines health)
 * @param supplies - Array of supplies
 * @returns Health percentage (0-100), or 100 if no supplies
 */
export function calculateSuppliesHealth(supplies: EquipmentSupply[]): number {
  if (!supplies || supplies.length === 0) return 100

  const percents = supplies.map(s => {
    const weeks = calculateWeeksRemaining(s.qty, s.burnPerWeek)
    return weeksToHealthPercentage(weeks)
  })

  return Math.min(...percents)
}

/**
 * Calculate stock percentage for progress bar display
 * Guards against division by zero
 * @param currentQty - Current quantity
 * @param minQty - Minimum quantity threshold
 * @returns Percentage (0-100), clamped
 */
export function calculateStockPercentage(currentQty: number, minQty: number): number {
  // Guard against zero/negative minQty
  if (minQty <= 0) {
    return currentQty > 0 ? 100 : 0
  }

  // Calculate percentage relative to 2x minimum (full stock)
  const targetQty = minQty * 2
  const percentage = (currentQty / targetQty) * 100

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, percentage))
}

/**
 * Calculate quantity needed to reach minimum threshold
 * @param currentQty - Current quantity
 * @param minQty - Minimum quantity threshold
 * @returns Quantity needed (0 if already above minimum)
 */
export function calculateNeededQuantity(currentQty: number, minQty: number): number {
  return Math.max(0, minQty - currentQty)
}

/**
 * Calculate suggested order quantity with buffer
 * @param currentQty - Current quantity
 * @param minQty - Minimum quantity threshold
 * @param burnPerWeek - Burn rate per week
 * @returns Suggested order quantity
 */
export function calculateSuggestedOrderQty(
  currentQty: number,
  minQty: number,
  burnPerWeek: number
): number {
  const bufferWeeks = EQUIPMENT_CONFIG.reorder.bufferWeeks
  const bufferQty = burnPerWeek * bufferWeeks
  const targetQty = minQty + bufferQty

  return Math.max(0, Math.ceil(targetQty - currentQty))
}

/**
 * Parse date safely, avoiding timezone issues
 * @param dateValue - ISO string, Date, or undefined
 * @returns Date object or undefined
 */
export function parseDateSafe(dateValue: string | Date | undefined): Date | undefined {
  if (!dateValue) return undefined

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    return isNaN(date.getTime()) ? undefined : date
  } catch {
    return undefined
  }
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 * @param date - Date object
 * @returns ISO date string
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Calculate health percentage for a single supply
 * @param supply - Equipment supply object
 * @returns Health percentage (0-100)
 */
export function supplyHealthPercent(supply: EquipmentSupply): number {
  const weeks = calculateWeeksRemaining(supply.qty || 0, supply.burnPerWeek || 0)
  return weeksToHealthPercentage(weeks)
}

/**
 * Calculate average health percentage for all supplies in a device
 * @param device - Equipment device object
 * @returns Average health percentage (0-100), or 100 if no supplies
 */
export function supplyHealthForDevice(device: EquipmentDevice): number {
  const supplies = Array.isArray(device.supplies) ? device.supplies : []
  if (supplies.length === 0) return 100

  const percents = supplies.map(supplyHealthPercent)
  return Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
}

/**
 * Get health status class based on percentage
 * @param percent - Health percentage (0-100)
 * @returns Health class: "critical" (0-30%), "warning" (30-60%), or "ok" (60-100%)
 */
export function getHealthClass(percent: number): "critical" | "warning" | "ok" {
  if (percent <= 30) return "critical"
  if (percent <= 60) return "warning"
  return "ok"
}

/**
 * Get color hex code based on health percentage
 * @param percent - Health percentage (0-100)
 * @returns Color hex code: red (critical), orange (warning), or green (ok)
 */
export function getHealthColor(percent: number): string {
  const cls = getHealthClass(percent)
  if (cls === "critical") return "#ef4444"
  if (cls === "warning") return "#f97316"
  return "#22c55e"
}

/**
 * Format currency value with locale support
 * @param value - Numeric value to format
 * @param code - Currency code (default: "EUR")
 * @param locale - Locale string (default: "en-IE")
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, code: string = "EUR", locale: string = "en-IE"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code
    }).format(value || 0)
  } catch {
    return `${code} ${Number(value || 0).toFixed(2)}`
  }
}
