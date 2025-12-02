/**
 * Equipment & Inventory Utility Functions
 * Handles reorder calculations, burn rate tracking, and equipment task generation
 */

import {
  InventoryItem,
  EquipmentDevice,
  EquipmentSupply,
  ReorderSuggestion,
  EquipmentTaskType,
  MasterProject,
  PersonProfile
} from "./types"
import { DayToDayTask } from "./dayToDayTypes"
import { calculateMaintenanceHealth } from "./equipmentMath"
import { EQUIPMENT_CONFIG } from "./equipmentConfig"

/**
 * Calculate reorder suggestions based on inventory levels and burn rates
 */
export function calculateReorderSuggestions(
  inventory: InventoryItem[],
  equipment: EquipmentDevice[],
  masterProjects: MasterProject[]
): ReorderSuggestion[] {
  const suggestions: ReorderSuggestion[] = []

  inventory.forEach(item => {
    // Skip items without proper quantity tracking
    if (item.currentQuantity === undefined || item.minQuantity === undefined) {
      return
    }

    // Find all equipment devices that use this inventory item
    const devicesUsingItem = equipment.filter(device => {
      const supplies = device.supplies || [] as EquipmentSupply[];
      return supplies.some(supply => supply.inventoryItemId === item.id)
    })

    if (devicesUsingItem.length === 0) {
      return // Item not linked to any equipment
    }

    // Calculate total burn rate across all devices
    let totalBurnRate = 0
    const equipmentUsage: Array<{ deviceId: string; deviceName: string; burnRate: number; projectId?: string }> = []

    devicesUsingItem.forEach(device => {
      const supplies = device.supplies || [] as EquipmentSupply[];
      const supply = supplies.find(s => s.inventoryItemId === item.id)
      if (supply) {
        totalBurnRate += supply.burnPerWeek
        equipmentUsage.push({
          deviceId: device.id,
          deviceName: device.name,
          burnRate: supply.burnPerWeek,
          projectId: supply.chargeToProjectId
        })
      }
    })

    // Calculate weeks till empty
    const weeksTillEmpty = totalBurnRate > 0 ? item.currentQuantity / totalBurnRate : 999

    // Only suggest reorder if running low (< 4 weeks remaining)
    if (weeksTillEmpty >= 4) {
      return
    }

    // Determine priority
    let priority: 'urgent' | 'high' | 'medium' | 'low'
    if (weeksTillEmpty < 1) {
      priority = 'urgent'
    } else if (weeksTillEmpty < 2) {
      priority = 'high'
    } else if (weeksTillEmpty < 3) {
      priority = 'medium'
    } else {
      priority = 'low'
    }

    // Calculate suggested order quantity (4 weeks supply)
    const suggestedOrderQty = Math.ceil(totalBurnRate * 4)

    // Calculate cost
    const estimatedCost = (item.priceExVAT || 0) * suggestedOrderQty

    // Group by projects and calculate cost split
    const projectUsage = new Map<string, { projectName: string; burnRate: number; accountId?: string; accountName?: string }>()

    equipmentUsage.forEach(usage => {
      if (usage.projectId) {
        const project = masterProjects.find(p => p.id === usage.projectId)
        if (project) {
          const existing = projectUsage.get(usage.projectId)
          if (existing) {
            existing.burnRate += usage.burnRate
          } else {
            // Get first account for this project (simplified - could be improved)
            const accountId = project.accountIds?.[0]
            projectUsage.set(usage.projectId, {
              projectName: project.name,
              burnRate: usage.burnRate,
              accountId,
              accountName: accountId ? `Account ${accountId}` : undefined
            })
          }
        }
      }
    })

    // Calculate percentage split and amounts
    const chargeToAccounts = Array.from(projectUsage.entries()).map(([projectId, usage]) => {
      const percentage = (usage.burnRate / totalBurnRate) * 100
      const amount = (estimatedCost * percentage) / 100

      return {
        accountId: usage.accountId || '',
        accountName: usage.accountName || 'Unknown Account',
        projectId,
        projectName: usage.projectName,
        percentage: Math.round(percentage),
        amount: Math.round(amount * 100) / 100
      }
    })

    suggestions.push({
      inventoryItemId: item.id,
      itemName: item.productName,
      catNum: item.catNum,
      currentQty: item.currentQuantity,
      minQty: item.minQuantity,
      totalBurnRate,
      weeksTillEmpty: Math.round(weeksTillEmpty * 10) / 10,
      suggestedOrderQty,
      priority,
      affectedEquipment: devicesUsingItem.map(d => ({ id: d.id, name: d.name })),
      affectedProjects: Array.from(projectUsage.entries()).map(([id, data]) => ({
        id,
        name: data.projectName
      })),
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      chargeToAccounts
    })
  })

  // Sort by priority (urgent first) and then by weeks remaining
  return suggestions.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return a.weeksTillEmpty - b.weeksTillEmpty
  })
}

/**
 * Generate equipment-related tasks for the day-to-day board
 * Note: Uses calculateMaintenanceHealth from equipmentMath for consistency
 */
export function generateEquipmentTasks(
  equipment: EquipmentDevice[],
  reorderSuggestions: ReorderSuggestion[],
  currentUser: PersonProfile,
  existingTasks: DayToDayTask[]
): DayToDayTask[] {
  const tasks: DayToDayTask[] = []
  const now = new Date()

  // Maintenance tasks
  equipment.forEach(device => {
    const health = calculateMaintenanceHealth(device.lastMaintained, device.maintenanceDays)

    // Only create task if health is below threshold and no existing task
    if (health <= device.threshold) {
      const existingMaintenanceTask = existingTasks.find(
        t => t.equipmentId === device.id && t.taskType === EquipmentTaskType.MAINTENANCE
      )

      if (!existingMaintenanceTask) {
        const lastMaintained = new Date(device.lastMaintained)
        const dueDate = new Date(lastMaintained.getTime() + (device.maintenanceDays * 24 * 60 * 60 * 1000))

        tasks.push({
          id: `equip-maint-${device.id}-${Date.now()}`,
          title: `Perform maintenance on ${device.name}`,
          description: `Maintenance health at ${health}%. Last maintained: ${lastMaintained.toLocaleDateString()}. Due: ${dueDate.toLocaleDateString()}`,
          status: 'todo',
          importance: health < EQUIPMENT_CONFIG.maintenance.criticalThreshold
            ? 'critical'
            : health < EQUIPMENT_CONFIG.maintenance.warningThreshold
              ? 'high'
              : 'medium',
          assigneeId: currentUser.id,
          dueDate,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.userId || currentUser.id,
          equipmentId: device.id,
          taskType: EquipmentTaskType.MAINTENANCE,
          metadata: {
            maintenanceHealth: health
          },
          order: 0
        })
      }
    }
  })

  // Reorder tasks (only for urgent and high priority)
  reorderSuggestions
    .filter(s => s.priority === 'urgent' || s.priority === 'high')
    .forEach(suggestion => {
      const existingReorderTask = existingTasks.find(
        t => t.inventoryItemId === suggestion.inventoryItemId && t.taskType === EquipmentTaskType.REORDER
      )

      if (!existingReorderTask) {
        const daysUntilEmpty = suggestion.weeksTillEmpty * 7
        const dueDate = new Date(now.getTime() + (daysUntilEmpty * 24 * 60 * 60 * 1000))

        tasks.push({
          id: `equip-reorder-${suggestion.inventoryItemId}-${Date.now()}`,
          title: `Reorder ${suggestion.itemName}`,
          description: `${suggestion.weeksTillEmpty} weeks remaining. Order ${suggestion.suggestedOrderQty} units (£${suggestion.estimatedCost.toFixed(2)}). Used by: ${suggestion.affectedEquipment.map(e => e.name).join(', ')}`,
          status: 'todo',
          importance: suggestion.priority === 'urgent' ? 'critical' : 'high',
          assigneeId: currentUser.id, // Could be lab manager
          dueDate,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.userId || currentUser.id,
          inventoryItemId: suggestion.inventoryItemId,
          taskType: EquipmentTaskType.REORDER,
          metadata: {
            weeksRemaining: suggestion.weeksTillEmpty,
            suggestedQty: suggestion.suggestedOrderQty,
            estimatedCost: suggestion.estimatedCost
          },
          order: 0
        })
      }
    })

  return tasks
}

/**
 * Record equipment maintenance completion
 */
export function recordMaintenanceCompletion(device: EquipmentDevice): EquipmentDevice {
  return {
    ...device,
    lastMaintained: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString()
  }
}
