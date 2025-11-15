/**
 * Order-Inventory Reconciliation Utilities
 *
 * Handles the workflow of reconciling received orders with existing inventory.
 * Part of Equipment & Inventory System Integration (Phase 2)
 *
 * Key Principle: When an order is received, check for existing inventory items
 * before creating new ones to avoid duplicates.
 */

import { Order, InventoryItem, EquipmentDevice } from './types'
import { generateId } from './equipmentConfig'
import { logger } from './logger'

/**
 * Result of reconciling a received order with inventory
 */
export interface ReconcileOrderResult {
  action: 'CREATE' | 'UPDATE'
  inventoryItem: InventoryItem
  updatedDevices?: EquipmentDevice[]
  message?: string
}

/**
 * Reconciles a received order with existing inventory
 *
 * Decision tree:
 * 1. If order has sourceInventoryItemId → UPDATE that specific item
 * 2. Else if matching item exists (by catNum + supplier) → UPDATE it
 * 3. Else → CREATE new inventory item
 *
 * @param order - The order that was just received
 * @param existingInventory - Current inventory items
 * @param devices - All equipment devices (for linking new inventory items)
 * @returns Result indicating CREATE or UPDATE action with the inventory item
 *
 * @example
 * // Order from equipment reorder (has sourceInventoryItemId)
 * const result = await reconcileReceivedOrder(receivedOrder, inventory, devices)
 * if (result.action === 'UPDATE') {
 *   await updateInventoryItem(result.inventoryItem)
 * } else {
 *   await createInventoryItem(result.inventoryItem)
 * }
 */
export function reconcileReceivedOrder(
  order: Order,
  existingInventory: InventoryItem[],
  devices: EquipmentDevice[]
): ReconcileOrderResult {

  // CASE 1: Order has source inventory item ID (equipment reorder scenario)
  if (order.sourceInventoryItemId) {
    const existingItem = existingInventory.find(
      i => i.id === order.sourceInventoryItemId
    )

    if (existingItem) {
      // UPDATE existing item - add quantity received
      const quantityReceived = order.quantity || 1 // Default to 1 if not specified

      const updatedItem: InventoryItem = {
        ...existingItem,
        currentQuantity: existingItem.currentQuantity + quantityReceived,
        lastOrderedDate: order.orderedDate,
        receivedDate: new Date(),
        updatedAt: new Date(),
        // Recalculate inventory level
        inventoryLevel: calculateInventoryLevel(
          existingItem.currentQuantity + quantityReceived,
          existingItem.minQuantity
        )
      }

      return {
        action: 'UPDATE',
        inventoryItem: updatedItem,
        message: `Updated ${existingItem.productName}: +${quantityReceived} units`
      }
    } else {
      logger.warn('Order references missing inventory item - creating new', {
        sourceInventoryItemId: order.sourceInventoryItemId,
      })
      // Fall through to create new item
    }
  }

  // CASE 2: Check for existing item by catNum + supplier (manual order scenario)
  if (order.catNum && order.supplier) {
    const matchByCatNum = existingInventory.find(
      i => i.catNum === order.catNum && i.supplier === order.supplier
    )

    if (matchByCatNum) {
      // UPDATE existing item
      const quantityReceived = order.quantity || 1

      const updatedItem: InventoryItem = {
        ...matchByCatNum,
        currentQuantity: matchByCatNum.currentQuantity + quantityReceived,
        priceExVAT: order.priceExVAT, // Update price in case it changed
        lastOrderedDate: order.orderedDate,
        receivedDate: new Date(),
        updatedAt: new Date(),
        inventoryLevel: calculateInventoryLevel(
          matchByCatNum.currentQuantity + quantityReceived,
          matchByCatNum.minQuantity
        )
      }

      return {
        action: 'UPDATE',
        inventoryItem: updatedItem,
        message: `Updated ${matchByCatNum.productName} (matched by catalog #): +${quantityReceived} units`
      }
    }
  }

  // CASE 3: Check by product name only (fallback for items without catNum)
  const matchByName = existingInventory.find(
    i => i.productName.toLowerCase().trim() === order.productName.toLowerCase().trim()
  )

  if (matchByName) {
    const quantityReceived = order.quantity || 1

    const updatedItem: InventoryItem = {
      ...matchByName,
      currentQuantity: matchByName.currentQuantity + quantityReceived,
      priceExVAT: order.priceExVAT,
      lastOrderedDate: order.orderedDate,
      receivedDate: new Date(),
      updatedAt: new Date(),
      inventoryLevel: calculateInventoryLevel(
        matchByName.currentQuantity + quantityReceived,
        matchByName.minQuantity
      )
    }

    return {
      action: 'UPDATE',
      inventoryItem: updatedItem,
      message: `Updated ${matchByName.productName} (matched by name): +${quantityReceived} units`
    }
  }

  // CASE 4: No match found - CREATE new inventory item
  const quantityReceived = order.quantity || 1
  const newItem: InventoryItem = {
    id: generateId('inventory'),
    productName: order.productName,
    catNum: order.catNum || '',
    supplier: order.supplier || '',
    currentQuantity: quantityReceived,
    priceExVAT: order.priceExVAT,
    minQuantity: 1, // Default minimum
    burnRatePerWeek: 0, // Will be calculated once linked to devices
    inventoryLevel: calculateInventoryLevel(quantityReceived, 1),
    receivedDate: new Date(),
    lastOrderedDate: order.orderedDate,
    category: order.category,
    subcategory: order.subcategory,
    chargeToAccount: order.accountId,
    labId: order.labId,
    equipmentDeviceIds: order.sourceDeviceId ? [order.sourceDeviceId] : [],
    notes: `Created from order ${order.id}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // If order came from a specific device supply, link the supply to this new inventory item
  let updatedDevices: EquipmentDevice[] | undefined

  if (order.sourceDeviceId && order.sourceSupplyId) {
    const device = devices.find(d => d.id === order.sourceDeviceId)

    if (device) {
      const updatedDevice: EquipmentDevice = {
        ...device,
        supplies: device.supplies.map(s =>
          s.id === order.sourceSupplyId
            ? { ...s, inventoryItemId: newItem.id }
            : s
        ),
        updatedAt: new Date().toISOString()
      }

      updatedDevices = [updatedDevice]
    }
  }

  return {
    action: 'CREATE',
    inventoryItem: newItem,
    updatedDevices,
    message: `Created new inventory item: ${newItem.productName}`
  }
}

/**
 * Calculates inventory level indicator based on quantity vs minimum
 */
function calculateInventoryLevel(
  currentQuantity: number,
  minQuantity?: number
): 'empty' | 'low' | 'medium' | 'full' {
  if (currentQuantity === 0) return 'empty'
  if (!minQuantity) return 'full'

  if (currentQuantity <= minQuantity) return 'low'
  if (currentQuantity <= minQuantity * 2) return 'medium'
  return 'full'
}

/**
 * Validates that an order is ready to be reconciled
 * Checks for required fields and logical consistency
 */
export function validateOrderForReconciliation(order: Order): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!order.productName || order.productName.trim() === '') {
    errors.push('Order must have a product name')
  }

  if (order.priceExVAT === undefined || order.priceExVAT < 0) {
    errors.push('Order must have a valid price')
  }

  if (order.status !== 'received') {
    errors.push('Order must have status "received" to reconcile with inventory')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Finds potential duplicate inventory items that might match an order
 * Useful for showing warnings to users before creating new items
 */
export function findPotentialDuplicates(
  order: Order,
  existingInventory: InventoryItem[]
): InventoryItem[] {
  const candidates: InventoryItem[] = []

  // Exact match by catNum + supplier
  if (order.catNum && order.supplier) {
    const exactMatch = existingInventory.filter(
      i => i.catNum === order.catNum && i.supplier === order.supplier
    )
    candidates.push(...exactMatch)
  }

  // Fuzzy match by product name (case-insensitive, trimmed)
  const nameLower = order.productName.toLowerCase().trim()
  const nameMatches = existingInventory.filter(
    i => i.productName.toLowerCase().trim().includes(nameLower) ||
         nameLower.includes(i.productName.toLowerCase().trim())
  )
  candidates.push(...nameMatches)

  // Remove duplicates (same item matched multiple ways)
  const unique = Array.from(new Set(candidates.map(c => c.id)))
    .map(id => candidates.find(c => c.id === id)!)

  return unique
}

/**
 * Batch reconciles multiple received orders
 * Useful for bulk operations (e.g., importing multiple orders at once)
 */
export function reconcileMultipleOrders(
  orders: Order[],
  existingInventory: InventoryItem[],
  devices: EquipmentDevice[]
): {
  results: ReconcileOrderResult[]
  summary: {
    created: number
    updated: number
    errors: number
  }
} {
  const results: ReconcileOrderResult[] = []
  let created = 0
  let updated = 0
  let errors = 0

  // Process orders one by one, updating inventory as we go
  let currentInventory = [...existingInventory]

  for (const order of orders) {
    const validation = validateOrderForReconciliation(order)

    if (!validation.valid) {
      logger.error('Invalid order for reconciliation', { orderId: order.id, errors: validation.errors })
      errors++
      continue
    }

    try {
      const result = reconcileReceivedOrder(order, currentInventory, devices)
      results.push(result)

      if (result.action === 'CREATE') {
        created++
        // Add to current inventory for subsequent reconciliations
        currentInventory.push(result.inventoryItem)
      } else {
        updated++
        // Update in current inventory
        currentInventory = currentInventory.map(item =>
          item.id === result.inventoryItem.id ? result.inventoryItem : item
        )
      }
    } catch (error) {
      logger.error('Error reconciling order', error, { orderId: order.id })
      errors++
    }
  }

  return {
    results,
    summary: { created, updated, errors }
  }
}
