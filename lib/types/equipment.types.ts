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
 * EquipmentBookingSettings - Per-equipment booking configuration
 * Stored as a field in EquipmentDevice
 */
export interface EquipmentBookingSettings {
  bookingEnabled: boolean          // Allow bookings for this equipment
  requireApproval: boolean         // Does booking need admin/PI approval?
  approverIds: string[]            // PersonProfile IDs who can approve
  maxBookingDuration: number       // Max hours per booking (0 = unlimited)
  minBookingDuration: number       // Min hours per booking (0 = no minimum)
  advanceBookingDays: number       // How many days ahead can users book?
  bufferTimeBefore: number         // Required minutes before booking starts
  bufferTimeAfter: number          // Required minutes after booking ends
  allowRecurring: boolean          // Can users create recurring bookings?
  autoBlockMaintenance: boolean    // Auto-block slots when maintenance due?
  requiresTraining: boolean        // Does user need valid training record?
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
  labId?: string // Associated lab ID (Department)
  workingLabId?: string // Physical location (WorkingLab)
  workingLabName?: string // Cached display name
  createdAt: string
  updatedAt?: string

  // Booking System Integration
  bookingSettings?: EquipmentBookingSettings
  currentBookingId?: string        // If equipment is currently booked
  currentBookingUserId?: string    // Who is using it now
  currentBookingEndTime?: string   // When current booking ends (ISO string)
  totalBookedHours?: number        // Lifetime total booked hours
  lastBookedDate?: string          // Last time equipment was booked (ISO string)
  averageBookingDuration?: number  // Average booking length in hours
  utilizationRate?: number         // Percentage of time booked (last 30 days)
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
