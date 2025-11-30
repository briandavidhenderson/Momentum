// ============================================================================
// INVENTORY TYPES
// ============================================================================

import { VisibilitySettings } from './visibility.types'
import type { InventoryLevel } from './common.types'

/**
 * InventoryItem - SINGLE SOURCE OF TRUTH for all supply quantities and pricing
 * All equipment devices link to inventory items for current stock levels.
 * Updated as part of Equipment & Inventory System Integration (Phase 1)
 */
export interface InventoryItem extends VisibilitySettings {
  id: string
  productName: string
  catNum: string
  supplier?: string // Supplier name

  // SINGLE SOURCE OF TRUTH - Master quantity and pricing
  currentQuantity: number // Master quantity shared across ALL devices using this item
  priceExVAT: number // Master price for this item
  unit?: string // Unit of measure (e.g., "ml", "g", "box", "units")

  // Reorder parameters
  minQuantity?: number // Global minimum threshold
  burnRatePerWeek?: number // Calculated total consumption across all devices

  // Stock level indicator
  inventoryLevel: InventoryLevel

  // Dates
  receivedDate: Date
  lastOrderedDate?: Date

  // Categorization
  category?: string // Category ID
  subcategory?: string // Subcategory name

  // Relationships
  equipmentDeviceIds?: string[] // Devices using this supply
  chargeToAccount?: string // Default funding account ID

  // Metadata
  notes?: string
  labId?: string // Lab this inventory item belongs to
  createdAt?: Date
  updatedAt?: Date
}
