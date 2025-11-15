/**
 * Supply Utility Functions
 *
 * Provides utilities to join equipment supply settings with inventory data.
 * Part of Equipment & Inventory System Integration (Phase 1)
 *
 * CRITICAL: InventoryItem is the single source of truth for quantities and prices.
 * EquipmentSupply stores only device-specific settings (minQty, burnPerWeek).
 * Use these utilities to "join" the data for display and calculations.
 */

import { EquipmentDevice, EquipmentSupply, InventoryItem, InventoryLevel } from './types'
import { calculateWeeksRemaining, weeksToHealthPercentage } from './equipmentMath'

/**
 * Enriched supply with inventory data joined in
 * Combines device-specific settings with master inventory data
 */
export interface EnrichedSupply extends EquipmentSupply {
  // From InventoryItem (joined)
  name: string
  price: number
  currentQuantity: number
  supplier?: string
  catNum?: string
  inventoryLevel?: InventoryLevel

  // Calculated health metrics
  weeksRemaining: number
  healthPercent: number
  needsReorder: boolean
}

/**
 * Joins device supply settings with master inventory data
 *
 * @param supply - Device-specific supply settings
 * @param inventory - Master inventory list
 * @returns Enriched supply with joined inventory data, or null if inventory item not found
 *
 * @example
 * const supply = { id: '1', inventoryItemId: 'inv-123', minQty: 10, burnPerWeek: 2 }
 * const enriched = enrichSupply(supply, inventory)
 * console.log(enriched.name) // "Taq Master Mix"
 * console.log(enriched.currentQuantity) // 25 (from inventory)
 * console.log(enriched.weeksRemaining) // 12.5 (calculated)
 */
export function enrichSupply(
  supply: EquipmentSupply,
  inventory: InventoryItem[]
): EnrichedSupply | null {
  const item = inventory.find(i => i.id === supply.inventoryItemId)

  if (!item) {
    console.warn(
      `Supply ${supply.id} references missing inventory item ${supply.inventoryItemId}`
    )
    return null
  }

  // Calculate health metrics
  const weeksRemaining = calculateWeeksRemaining(item.currentQuantity, supply.burnPerWeek)
  const healthPercent = weeksToHealthPercentage(weeksRemaining)
  const needsReorder = item.currentQuantity <= supply.minQty

  return {
    ...supply,
    // Joined from inventory
    name: item.productName,
    price: item.priceExVAT,
    currentQuantity: item.currentQuantity,
    supplier: item.supplier,
    catNum: item.catNum,
    inventoryLevel: item.inventoryLevel,
    // Calculated
    weeksRemaining,
    healthPercent: Math.min(healthPercent, 100),
    needsReorder
  }
}

/**
 * Enriches all supplies for a device
 * Filters out supplies with missing inventory items
 *
 * @param device - Equipment device with supplies
 * @param inventory - Master inventory list
 * @returns Array of enriched supplies (excludes supplies with missing inventory)
 *
 * @example
 * const enrichedSupplies = enrichDeviceSupplies(device, inventory)
 * enrichedSupplies.forEach(s => {
 *   console.log(`${s.name}: ${s.currentQuantity} units, ${s.weeksRemaining} weeks left`)
 * })
 */
export function enrichDeviceSupplies(
  device: EquipmentDevice,
  inventory: InventoryItem[]
): EnrichedSupply[] {
  return device.supplies
    .map(s => enrichSupply(s, inventory))
    .filter((s): s is EnrichedSupply => s !== null)
}

/**
 * Updates inventory quantity when checking stock
 * Returns updated inventory item with recalculated inventory level
 *
 * @param inventoryItemId - ID of inventory item to update
 * @param newQuantity - New stock quantity
 * @param inventory - Current inventory list
 * @returns Updated inventory item, or null if not found
 *
 * @example
 * const updatedItem = updateInventoryQuantity('inv-123', 50, inventory)
 * if (updatedItem) {
 *   await onInventoryUpdate(updatedItem)
 * }
 */
export function updateInventoryQuantity(
  inventoryItemId: string,
  newQuantity: number,
  inventory: InventoryItem[]
): InventoryItem | null {
  const item = inventory.find(i => i.id === inventoryItemId)
  if (!item) {
    console.warn(`Inventory item ${inventoryItemId} not found`)
    return null
  }

  return {
    ...item,
    currentQuantity: newQuantity,
    updatedAt: new Date(),
    inventoryLevel: calculateInventoryLevel(newQuantity, item.minQuantity)
  }
}

/**
 * Calculates inventory level based on current vs minimum quantity
 *
 * @param current - Current quantity
 * @param min - Minimum quantity threshold
 * @returns Inventory level indicator
 */
function calculateInventoryLevel(
  current: number,
  min?: number
): InventoryLevel {
  if (current === 0) return 'empty'
  if (min && current <= min) return 'low'
  if (min && current <= min * 2) return 'medium'
  return 'full'
}

/**
 * Gets all inventory items used by a specific device
 *
 * @param device - Equipment device
 * @param inventory - Master inventory list
 * @returns Array of inventory items linked to this device
 */
export function getDeviceInventoryItems(
  device: EquipmentDevice,
  inventory: InventoryItem[]
): InventoryItem[] {
  const inventoryItemIds = device.supplies.map(s => s.inventoryItemId)
  return inventory.filter(item => inventoryItemIds.includes(item.id))
}

/**
 * Gets all devices using a specific inventory item
 *
 * @param inventoryItemId - Inventory item ID
 * @param devices - All equipment devices
 * @returns Array of devices using this inventory item
 */
export function getDevicesUsingInventoryItem(
  inventoryItemId: string,
  devices: EquipmentDevice[]
): EquipmentDevice[] {
  return devices.filter(device =>
    device.supplies.some(s => s.inventoryItemId === inventoryItemId)
  )
}

/**
 * Calculates total burn rate for an inventory item across all devices
 *
 * @param inventoryItemId - Inventory item ID
 * @param devices - All equipment devices
 * @returns Total burn rate per week across all devices
 *
 * @example
 * const totalBurn = calculateTotalBurnRate('inv-123', allDevices)
 * console.log(`Total consumption: ${totalBurn} units/week`)
 */
export function calculateTotalBurnRate(
  inventoryItemId: string,
  devices: EquipmentDevice[]
): number {
  return devices.reduce((total, device) => {
    const supply = device.supplies.find(s => s.inventoryItemId === inventoryItemId)
    return total + (supply?.burnPerWeek || 0)
  }, 0)
}

/**
 * Validates that all device supplies have valid inventory links
 * Used during device creation/update to ensure data integrity
 *
 * @param device - Equipment device to validate
 * @param inventory - Master inventory list
 * @returns Validation result with any errors
 */
export function validateDeviceSupplies(
  device: EquipmentDevice,
  inventory: InventoryItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  device.supplies.forEach((supply, index) => {
    // Check inventory item exists
    const item = inventory.find(i => i.id === supply.inventoryItemId)
    if (!item) {
      errors.push(`Supply #${index + 1}: Inventory item ${supply.inventoryItemId} not found`)
    }

    // Validate settings
    if (supply.minQty <= 0) {
      errors.push(`Supply #${index + 1}: minQty must be greater than 0`)
    }
    if (supply.burnPerWeek < 0) {
      errors.push(`Supply #${index + 1}: burnPerWeek cannot be negative`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
