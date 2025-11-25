// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Common shared types and enums used across the application
 */

/**
 * Work status for tasks, deliverables, and projects
 */
export type WorkStatus = "not-started" | "in-progress" | "at-risk" | "blocked" | "done"

/**
 * Importance level for tasks and workpackages
 */
export type ImportanceLevel = "low" | "medium" | "high" | "critical"

/**
 * Order status for purchase orders
 */
export type OrderStatus = "to-order" | "ordered" | "received"

/**
 * Inventory level indicator
 */
export type InventoryLevel = "empty" | "low" | "medium" | "full"

/**
 * Project visibility levels
 */
export type ProjectVisibility =
  | "private" // Only you
  | "postdocs" // You and your postdocs
  | "pi-researchers" // PIs and researchers
  | "lab" // All in your lab
  | "custom" // Specific people (stored in visibleTo array)
  | "organisation"
  | "institute"

/**
 * Event visibility levels
 */
export type EventVisibility = "private" | "lab" | "organisation"

/**
 * Project role - role within a specific master project
 */
export type ProjectRole = "PI" | "Co-PI" | "Postdoc" | "PhD" | "RA" | "Collaborator" | "Support"

/**
 * Recurrence frequency for calendar events
 */
export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom"

/**
 * ELN Item Types - unified multimodal input system
 */
export type ELNItemType =
  | "image"
  | "photo"
  | "voice"
  | "note"
  | "document"
  | "data"
  | "video"
  | "file"

/**
 * Equipment task types
 */
export enum EquipmentTaskType {
  MAINTENANCE = "equipment_maintenance",
  REORDER = "equipment_reorder",
  SUPPLY_CHECK = "equipment_supply_check",
  CALIBRATION = "equipment_calibration",
}
