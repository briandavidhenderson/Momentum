// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

/**
 * EquipmentSupply - Device-specific supply settings (NOT a data duplicate)
 * Links to InventoryItem for actual quantity/price data.
 * Stores only device-specific consumption settings.
 * Updated as part of Equipment & Inventory System Integration (Phase 1)
 *
 * MIGRATION NOTE: Old fields (name, price, qty) removed.
 * Use enrichSupply() utility to join with InventoryItem data for display.
 */
export interface EquipmentSupply {
  id: string
  inventoryItemId: string // REQUIRED link to InventoryItem (single source of truth)

  // Device-specific consumption settings
  minQty: number // When THIS device needs reorder (device-specific threshold)
  burnPerWeek: number // How fast THIS device consumes this supply

  // Optional overrides for funding
  chargeToAccountId?: string // Override default funding account
  chargeToProjectId?: string // Link to specific master project
}

/**
 * EquipmentSOPVersion - Previous version of an SOP
 */
export interface EquipmentSOPVersion {
  version: string
  content: string
  authorId: string
  updatedAt: string // ISO date string
  changeNotes?: string
}

/**
 * EquipmentSOP - Standard Operating Procedure for equipment
 */
export interface EquipmentSOP {
  id: string
  title: string
  content: string
  version: string // e.g., "1.0", "1.1", "2.0"
  authorId: string // User ID who created/updated this version
  createdAt: string // ISO date string
  updatedAt?: string // ISO date string
  history?: EquipmentSOPVersion[] // Previous versions
}

/**
 * EquipmentDevice - Lab equipment/instrument
 */
export interface EquipmentDevice {
  id: string
  name: string
  make: string
  model: string
  serialNumber?: string // Optional serial number
  imageUrl?: string // Optional image URL (uploaded file)
  type: string
  maintenanceDays: number // Days between maintenance
  lastMaintained: string // ISO date string
  threshold: number // Maintenance threshold percentage (0-100)
  supplies: EquipmentSupply[]
  sops?: EquipmentSOP[] // Standard Operating Procedures
  labId?: string // Associated lab ID
  createdAt: string
  updatedAt?: string
}

/**
 * ReorderSuggestion - Intelligent reorder recommendation
 */
export interface ReorderSuggestion {
  inventoryItemId: string
  itemName: string
  catNum: string
  currentQty: number
  minQty: number
  totalBurnRate: number
  weeksTillEmpty: number
  suggestedOrderQty: number // 4 weeks supply
  priority: 'urgent' | 'high' | 'medium' | 'low'
  affectedEquipment: Array<{ id: string; name: string }>
  affectedProjects: Array<{ id: string; name: string }>
  estimatedCost: number
  chargeToAccounts: Array<{
    accountId: string
    accountName: string
    projectId: string
    projectName: string
    percentage: number
    amount: number
  }>
}
