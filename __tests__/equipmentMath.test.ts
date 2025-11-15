/**
 * Integration Tests for Equipment Math Functions
 * Tests core calculation logic for maintenance health, supplies, and enrichment
 */

import {
  calculateMaintenanceHealth,
  calculateSuppliesHealth,
  calculateWeeksRemaining,
  weeksToHealthPercentage,
} from '@/lib/equipmentMath'
import { enrichSupply } from '@/lib/supplyUtils'
import { EquipmentSupply, InventoryItem } from '@/lib/types'

describe('calculateMaintenanceHealth', () => {
  it('should return 100% for maintenance done today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const health = calculateMaintenanceHealth(today, 90)

    expect(health).toBe(100)
  })

  it('should return ~50% for maintenance at halfway point', () => {
    const date = new Date()
    date.setDate(date.getDate() - 45) // 45 days ago
    const lastMaintained = date.toISOString().slice(0, 10)

    const health = calculateMaintenanceHealth(lastMaintained, 90)

    expect(health).toBeGreaterThan(49)
    expect(health).toBeLessThan(51)
  })

  it('should return 0% for overdue maintenance', () => {
    const date = new Date()
    date.setDate(date.getDate() - 91) // 91 days ago
    const lastMaintained = date.toISOString().slice(0, 10)

    const health = calculateMaintenanceHealth(lastMaintained, 90)

    expect(health).toBe(0)
  })

  it('should return 0% for significantly overdue maintenance', () => {
    const lastMaintained = '2020-01-01'

    const health = calculateMaintenanceHealth(lastMaintained, 90)

    expect(health).toBe(0)
  })

  it('should handle invalid date gracefully', () => {
    const health = calculateMaintenanceHealth('invalid-date', 90)

    expect(health).toBe(100) // Failsafe to healthy
  })

  it('should handle zero interval days', () => {
    const today = new Date().toISOString().slice(0, 10)
    const health = calculateMaintenanceHealth(today, 0)

    expect(health).toBe(100) // Failsafe to healthy
  })

  it('should calculate correctly for different intervals', () => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // 30 days ago
    const lastMaintained = date.toISOString().slice(0, 10)

    const health30 = calculateMaintenanceHealth(lastMaintained, 30)
    const health60 = calculateMaintenanceHealth(lastMaintained, 60)
    const health90 = calculateMaintenanceHealth(lastMaintained, 90)

    expect(health30).toBe(0) // Overdue for 30-day interval
    expect(health60).toBe(50) // Halfway through 60-day interval
    expect(health90).toBe(67) // 2/3 remaining for 90-day interval (rounded)
  })
})

describe('calculateSuppliesHealth', () => {
  it('should return 100% for devices with no supplies', () => {
    const health = calculateSuppliesHealth([])

    expect(health).toBe(100)
  })

  it('should return worst supply health', () => {
    const supplies: EquipmentSupply[] = [
      { id: 's1', inventoryItemId: 'i1', burnPerWeek: 1, minQty: 10, qty: 50 }, // 50 weeks
      { id: 's2', inventoryItemId: 'i2', burnPerWeek: 5, minQty: 10, qty: 10 }, // 2 weeks
      { id: 's3', inventoryItemId: 'i3', burnPerWeek: 2, minQty: 10, qty: 100 }, // 50 weeks
    ]

    const health = calculateSuppliesHealth(supplies)

    // Should be based on worst supply (2 weeks remaining)
    expect(health).toBeLessThan(100)
  })

  it('should handle supplies with zero burn rate', () => {
    const supplies: EquipmentSupply[] = [
      { id: 's1', inventoryItemId: 'i1', burnPerWeek: 0, minQty: 10, qty: 50 },
    ]

    const health = calculateSuppliesHealth(supplies)

    expect(health).toBe(100) // No consumption = always healthy
  })
})

describe('calculateWeeksRemaining', () => {
  it('should calculate weeks correctly', () => {
    expect(calculateWeeksRemaining(100, 10)).toBe(10)
    expect(calculateWeeksRemaining(50, 5)).toBe(10)
    expect(calculateWeeksRemaining(17, 5)).toBeCloseTo(3.4, 1)
  })

  it('should handle zero burn rate', () => {
    expect(calculateWeeksRemaining(50, 0)).toBe(99) // Effectively infinite
  })

  it('should handle zero quantity', () => {
    expect(calculateWeeksRemaining(0, 5)).toBe(0)
  })
})

describe('enrichSupply', () => {
  const mockSupply: EquipmentSupply = {
    id: 'supply-1',
    inventoryItemId: 'inv-1',
    burnPerWeek: 5,
    minQty: 10,
  }

  const mockInventory: InventoryItem[] = [
    {
      id: 'inv-1',
      productName: 'Test Reagent',
      catNum: 'TR-001',
      currentQuantity: 50,
      minQuantity: 10,
      priceExVAT: 100,
      currency: 'GBP',
      inventoryLevel: 'full',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
  ]

  it('should enrich supply with inventory data', () => {
    const enriched = enrichSupply(mockSupply, mockInventory)

    expect(enriched).toMatchObject({
      id: 'supply-1',
      inventoryItemId: 'inv-1',
      burnPerWeek: 5,
      minQty: 10,
      name: 'Test Reagent',
      catNum: 'TR-001',
      currentQuantity: 50,
    })
  })

  it('should calculate health correctly', () => {
    const enriched = enrichSupply(mockSupply, mockInventory)

    expect(enriched?.healthPercent).toBe(100)
  })

  it('should calculate weeks remaining correctly', () => {
    const enriched = enrichSupply(mockSupply, mockInventory)

    expect(enriched?.weeksRemaining).toBe(10) // 50 qty / 5 per week
  })

  it('should return null for missing inventory item', () => {
    const enriched = enrichSupply(mockSupply, [])

    expect(enriched).toBeNull()
  })

  it('should calculate low supply health correctly', () => {
    const lowInventory: InventoryItem[] = [
      {
        ...mockInventory[0],
        currentQuantity: 5, // Below minQty of 10
      },
    ]

    const enriched = enrichSupply(mockSupply, lowInventory)

    expect(enriched?.weeksRemaining).toBe(1) // 5/5 = 1 week
    expect(enriched?.needsReorder).toBe(true) // 5 <= 10 minQty
  })

  it('should handle zero burn rate', () => {
    const zeroBurnSupply: EquipmentSupply = {
      ...mockSupply,
      burnPerWeek: 0,
    }

    const enriched = enrichSupply(zeroBurnSupply, mockInventory)

    expect(enriched?.weeksRemaining).toBe(99) // Effectively infinite
  })

  it('should handle empty inventory', () => {
    const emptyInventory: InventoryItem[] = [
      {
        ...mockInventory[0],
        currentQuantity: 0,
      },
    ]

    const enriched = enrichSupply(mockSupply, emptyInventory)

    expect(enriched?.currentQuantity).toBe(0)
    expect(enriched?.weeksRemaining).toBe(0)
    expect(enriched?.needsReorder).toBe(true)
  })

  it('should preserve all supply properties', () => {
    const supplyWithProject: EquipmentSupply = {
      ...mockSupply,
      chargeToProjectId: 'proj-1',
    }

    const enriched = enrichSupply(supplyWithProject, mockInventory)

    expect(enriched?.chargeToProjectId).toBe('proj-1')
  })

  it('should calculate weeks remaining with decimal precision', () => {
    const inventory: InventoryItem[] = [
      {
        ...mockInventory[0],
        currentQuantity: 17, // 17 / 5 = 3.4 weeks
      },
    ]

    const enriched = enrichSupply(mockSupply, inventory)

    expect(enriched?.weeksRemaining).toBeCloseTo(3.4, 1)
  })
})

describe('Integration: Supply enrichment with reorder logic', () => {
  it('should correctly identify supplies needing reorder', () => {
    const supplies: EquipmentSupply[] = [
      {
        id: 'supply-ok',
        inventoryItemId: 'inv-ok',
        burnPerWeek: 5,
        minQty: 10,
      },
      {
        id: 'supply-low',
        inventoryItemId: 'inv-low',
        burnPerWeek: 10,
        minQty: 20,
      },
    ]

    const inventory: InventoryItem[] = [
      {
        id: 'inv-ok',
        productName: 'OK Supply',
        catNum: 'OK-001',
        currentQuantity: 100,
        minQuantity: 10,
        priceExVAT: 50,
        currency: 'GBP',
        inventoryLevel: 'full',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'inv-low',
        productName: 'Low Supply',
        catNum: 'LOW-001',
        currentQuantity: 15,
        minQuantity: 20,
        priceExVAT: 75,
        currency: 'GBP',
        inventoryLevel: 'low',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ]

    const enrichedOk = enrichSupply(supplies[0], inventory)
    const enrichedLow = enrichSupply(supplies[1], inventory)

    expect(enrichedOk?.weeksRemaining).toBe(20) // No reorder needed
    expect(enrichedOk?.needsReorder).toBe(false)

    expect(enrichedLow?.weeksRemaining).toBe(1.5) // Reorder urgently needed
    expect(enrichedLow?.needsReorder).toBe(true) // 15 <= 20 minQty
  })
})
