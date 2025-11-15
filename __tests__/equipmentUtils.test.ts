/**
 * Integration Tests for Equipment Utilities
 * Tests reorder calculations, task generation, and maintenance tracking
 */

import {
  calculateReorderSuggestions,
  generateEquipmentTasks,
  recordMaintenanceCompletion,
} from '@/lib/equipmentUtils'
import { InventoryItem, EquipmentDevice, MasterProject, PersonProfile, ReorderSuggestion } from '@/lib/types'
import { DayToDayTask } from '@/lib/dayToDayTypes'
import { EquipmentTaskType } from '@/lib/types'

describe('calculateReorderSuggestions', () => {
  const mockInventory: InventoryItem[] = [
    {
      id: 'inv-1',
      productName: 'Test Reagent',
      catNum: 'TR-001',
      currentQuantity: 10,
      minQuantity: 5,
      priceExVAT: 50,
      currency: 'GBP',
      inventoryLevel: 'low',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    {
      id: 'inv-2',
      productName: 'Abundant Supply',
      catNum: 'AS-001',
      currentQuantity: 1000,
      minQuantity: 100,
      priceExVAT: 10,
      currency: 'GBP',
      inventoryLevel: 'ok',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
  ]

  const mockEquipment: EquipmentDevice[] = [
    {
      id: 'equip-1',
      name: 'Test Device',
      make: 'TestMake',
      model: 'TestModel',
      serialNumber: 'SN-001',
      lastMaintained: '2025-01-01',
      maintenanceDays: 90,
      threshold: 20,
      supplies: [
        {
          id: 'supply-1',
          inventoryItemId: 'inv-1',
          burnPerWeek: 5,
          minQty: 5,
          chargeToProjectId: 'proj-1',
        },
      ],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
  ]

  const mockProjects: MasterProject[] = [
    {
      id: 'proj-1',
      name: 'Test Project',
      accountIds: ['acc-1'],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as MasterProject,
  ]

  it('should calculate reorder suggestions for low stock items', () => {
    const suggestions = calculateReorderSuggestions(mockInventory, mockEquipment, mockProjects)

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      inventoryItemId: 'inv-1',
      itemName: 'Test Reagent',
      catNum: 'TR-001',
      currentQty: 10,
      totalBurnRate: 5,
      weeksTillEmpty: 2,
      priority: 'medium',
    })
  })

  it('should calculate correct suggested order quantity (4 weeks supply)', () => {
    const suggestions = calculateReorderSuggestions(mockInventory, mockEquipment, mockProjects)

    expect(suggestions[0].suggestedOrderQty).toBe(20) // 5 per week * 4 weeks
  })

  it('should calculate estimated cost correctly', () => {
    const suggestions = calculateReorderSuggestions(mockInventory, mockEquipment, mockProjects)

    expect(suggestions[0].estimatedCost).toBe(1000) // 20 units * £50
  })

  it('should assign correct priority based on weeks remaining', () => {
    const urgentInventory: InventoryItem[] = [
      { ...mockInventory[0], currentQuantity: 2 }, // 0.4 weeks = urgent
    ]

    const suggestions = calculateReorderSuggestions(urgentInventory, mockEquipment, mockProjects)

    expect(suggestions[0].priority).toBe('urgent')
    expect(suggestions[0].weeksTillEmpty).toBeLessThan(1)
  })

  it('should not suggest reorder for items with >4 weeks remaining', () => {
    const abundantInventory: InventoryItem[] = [
      { ...mockInventory[0], currentQuantity: 100 }, // 20 weeks
    ]

    const suggestions = calculateReorderSuggestions(abundantInventory, mockEquipment, mockProjects)

    expect(suggestions).toHaveLength(0)
  })

  it('should calculate charge to accounts correctly', () => {
    const suggestions = calculateReorderSuggestions(mockInventory, mockEquipment, mockProjects)

    expect(suggestions[0].chargeToAccounts).toHaveLength(1)
    expect(suggestions[0].chargeToAccounts[0]).toMatchObject({
      projectId: 'proj-1',
      projectName: 'Test Project',
      percentage: 100,
      amount: 1000,
    })
  })

  it('should sort suggestions by priority and weeks remaining', () => {
    const multiInventory: InventoryItem[] = [
      { ...mockInventory[0], id: 'inv-low', currentQuantity: 10 }, // 2 weeks, medium
      { ...mockInventory[0], id: 'inv-urgent', currentQuantity: 2 }, // 0.4 weeks, urgent
      { ...mockInventory[0], id: 'inv-high', currentQuantity: 7 }, // 1.4 weeks, high
    ]

    const multiEquipment: EquipmentDevice[] = [
      {
        ...mockEquipment[0],
        supplies: [
          { ...mockEquipment[0].supplies[0], inventoryItemId: 'inv-low' },
          { ...mockEquipment[0].supplies[0], id: 'supply-2', inventoryItemId: 'inv-urgent' },
          { ...mockEquipment[0].supplies[0], id: 'supply-3', inventoryItemId: 'inv-high' },
        ],
      },
    ]

    const suggestions = calculateReorderSuggestions(multiInventory, multiEquipment, mockProjects)

    expect(suggestions[0].priority).toBe('urgent')
    expect(suggestions[1].priority).toBe('high')
    expect(suggestions[2].priority).toBe('medium')
  })
})

describe('generateEquipmentTasks', () => {
  const mockCurrentUser: PersonProfile = {
    id: 'user-1',
    userId: 'auth-user-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'Researcher',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  } as PersonProfile

  const mockDevice: EquipmentDevice = {
    id: 'device-1',
    name: 'Test Device',
    make: 'TestMake',
    model: 'TestModel',
    serialNumber: 'SN-001',
    lastMaintained: '2024-10-01', // ~3.5 months ago (overdue, health ~0%)
    maintenanceDays: 90,
    threshold: 20,
    supplies: [],
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  }

  const mockReorderSuggestion: ReorderSuggestion = {
    inventoryItemId: 'inv-1',
    itemName: 'Test Reagent',
    catNum: 'TR-001',
    currentQty: 2,
    minQty: 5,
    totalBurnRate: 5,
    weeksTillEmpty: 0.4,
    suggestedOrderQty: 20,
    priority: 'urgent',
    affectedEquipment: [{ id: 'device-1', name: 'Test Device' }],
    affectedProjects: [{ id: 'proj-1', name: 'Test Project' }],
    estimatedCost: 1000,
    chargeToAccounts: [],
  }

  it('should generate maintenance task for device below threshold', () => {
    const tasks = generateEquipmentTasks([mockDevice], [], mockCurrentUser, [])

    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: 'Perform maintenance on Test Device',
      status: 'todo',
      equipmentId: 'device-1',
      taskType: EquipmentTaskType.MAINTENANCE,
      importance: 'critical', // Overdue maintenance = critical
    })
  })

  it('should not generate duplicate maintenance tasks', () => {
    const existingTask: DayToDayTask = {
      id: 'task-1',
      title: 'Existing maintenance',
      status: 'todo',
      equipmentId: 'device-1',
      taskType: EquipmentTaskType.MAINTENANCE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      order: 0,
    }

    const tasks = generateEquipmentTasks([mockDevice], [], mockCurrentUser, [existingTask])

    expect(tasks).toHaveLength(0)
  })

  it('should generate reorder task for urgent suggestions', () => {
    const tasks = generateEquipmentTasks([], [mockReorderSuggestion], mockCurrentUser, [])

    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: 'Reorder Test Reagent',
      status: 'todo',
      inventoryItemId: 'inv-1',
      taskType: EquipmentTaskType.REORDER,
      importance: 'critical',
    })
  })

  it('should not generate reorder task for medium/low priority', () => {
    const mediumSuggestion: ReorderSuggestion = {
      ...mockReorderSuggestion,
      priority: 'medium',
    }

    const tasks = generateEquipmentTasks([], [mediumSuggestion], mockCurrentUser, [])

    expect(tasks).toHaveLength(0)
  })

  it('should assign critical importance for critical maintenance health', () => {
    const criticalDevice: EquipmentDevice = {
      ...mockDevice,
      lastMaintained: '2024-06-01', // ~7 months ago (health ~23%)
    }

    const tasks = generateEquipmentTasks([criticalDevice], [], mockCurrentUser, [])

    expect(tasks[0].importance).toBe('critical')
  })
})

describe('recordMaintenanceCompletion', () => {
  it('should update lastMaintained to today', () => {
    const device: EquipmentDevice = {
      id: 'device-1',
      name: 'Test Device',
      make: 'TestMake',
      model: 'TestModel',
      serialNumber: 'SN-001',
      lastMaintained: '2024-01-01',
      maintenanceDays: 90,
      threshold: 20,
      supplies: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    const updated = recordMaintenanceCompletion(device)

    const today = new Date().toISOString().slice(0, 10)
    expect(updated.lastMaintained).toBe(today)
  })

  it('should update updatedAt timestamp', () => {
    const device: EquipmentDevice = {
      id: 'device-1',
      name: 'Test Device',
      make: 'TestMake',
      model: 'TestModel',
      serialNumber: 'SN-001',
      lastMaintained: '2024-01-01',
      maintenanceDays: 90,
      threshold: 20,
      supplies: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    const updated = recordMaintenanceCompletion(device)

    expect(updated.updatedAt).toBeTruthy()
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date('2025-01-01').getTime())
  })
})
