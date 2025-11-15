/**
 * Integration Tests for Equipment Configuration
 * Tests centralized threshold helpers and configuration consistency
 */

import {
  EQUIPMENT_CONFIG,
  getBudgetHealthClass,
  getBudgetNotificationPriority,
} from '@/lib/equipmentConfig'

describe('EQUIPMENT_CONFIG', () => {
  it('should have consistent budget thresholds', () => {
    expect(EQUIPMENT_CONFIG.budgetThresholds.critical).toBeLessThan(
      EQUIPMENT_CONFIG.budgetThresholds.warning
    )
    expect(EQUIPMENT_CONFIG.budgetThresholds.warning).toBeLessThan(
      EQUIPMENT_CONFIG.budgetThresholds.healthy
    )
  })

  it('should have consistent maintenance thresholds', () => {
    expect(EQUIPMENT_CONFIG.maintenance.criticalThreshold).toBeLessThan(
      EQUIPMENT_CONFIG.maintenance.warningThreshold
    )
  })

  it('should have reasonable default values', () => {
    expect(EQUIPMENT_CONFIG.maintenance.defaultIntervalDays).toBeGreaterThan(0)
    expect(EQUIPMENT_CONFIG.maintenance.defaultThreshold).toBeGreaterThan(0)
    expect(EQUIPMENT_CONFIG.maintenance.defaultThreshold).toBeLessThan(100)
  })
})

describe('getBudgetHealthClass', () => {
  it('should return critical for budget below critical threshold', () => {
    expect(getBudgetHealthClass(5)).toBe('critical')
    expect(getBudgetHealthClass(9)).toBe('critical')
    expect(getBudgetHealthClass(0)).toBe('critical')
  })

  it('should return warning for budget below warning threshold', () => {
    expect(getBudgetHealthClass(10)).toBe('warning')
    expect(getBudgetHealthClass(15)).toBe('warning')
    expect(getBudgetHealthClass(24)).toBe('warning')
  })

  it('should return ok for healthy budget', () => {
    expect(getBudgetHealthClass(25)).toBe('ok')
    expect(getBudgetHealthClass(50)).toBe('ok')
    expect(getBudgetHealthClass(100)).toBe('ok')
  })

  it('should handle edge cases at exact thresholds', () => {
    const criticalThreshold = EQUIPMENT_CONFIG.budgetThresholds.critical
    const warningThreshold = EQUIPMENT_CONFIG.budgetThresholds.warning

    expect(getBudgetHealthClass(criticalThreshold - 0.1)).toBe('critical')
    expect(getBudgetHealthClass(criticalThreshold)).toBe('warning')
    expect(getBudgetHealthClass(warningThreshold - 0.1)).toBe('warning')
    expect(getBudgetHealthClass(warningThreshold)).toBe('ok')
  })

  it('should handle negative percentages', () => {
    expect(getBudgetHealthClass(-10)).toBe('critical')
  })

  it('should handle over 100%', () => {
    expect(getBudgetHealthClass(150)).toBe('ok')
  })
})

describe('getBudgetNotificationPriority', () => {
  it('should return high priority for critical budget', () => {
    expect(getBudgetNotificationPriority(5)).toBe('high')
    expect(getBudgetNotificationPriority(0)).toBe('high')
  })

  it('should return medium priority for warning budget', () => {
    expect(getBudgetNotificationPriority(15)).toBe('medium')
    expect(getBudgetNotificationPriority(20)).toBe('medium')
  })

  it('should return low priority for healthy budget', () => {
    expect(getBudgetNotificationPriority(50)).toBe('low')
    expect(getBudgetNotificationPriority(100)).toBe('low')
  })

  it('should align with getBudgetHealthClass priorities', () => {
    const testValues = [0, 5, 10, 15, 25, 50, 100]

    testValues.forEach(percent => {
      const healthClass = getBudgetHealthClass(percent)
      const priority = getBudgetNotificationPriority(percent)

      if (healthClass === 'critical') {
        expect(priority).toBe('high')
      } else if (healthClass === 'warning') {
        expect(priority).toBe('medium')
      } else if (healthClass === 'ok') {
        expect(priority).toBe('low')
      }
    })
  })
})

describe('Integration: Configuration usage consistency', () => {
  it('should use same thresholds for health class and notification priority', () => {
    const criticalValue = EQUIPMENT_CONFIG.budgetThresholds.critical - 1
    const warningValue = EQUIPMENT_CONFIG.budgetThresholds.warning - 1
    const healthyValue = EQUIPMENT_CONFIG.budgetThresholds.warning + 1

    expect(getBudgetHealthClass(criticalValue)).toBe('critical')
    expect(getBudgetNotificationPriority(criticalValue)).toBe('high')

    expect(getBudgetHealthClass(warningValue)).toBe('warning')
    expect(getBudgetNotificationPriority(warningValue)).toBe('medium')

    expect(getBudgetHealthClass(healthyValue)).toBe('ok')
    expect(getBudgetNotificationPriority(healthyValue)).toBe('low')
  })

  it('should provide consistent threshold values for maintenance', () => {
    const critical = EQUIPMENT_CONFIG.maintenance.criticalThreshold
    const warning = EQUIPMENT_CONFIG.maintenance.warningThreshold

    expect(critical).toBe(25)
    expect(warning).toBe(60)

    // These values should be used in generateEquipmentTasks
    expect(critical).toBeLessThan(warning)
  })

  it('should have budget thresholds that make sense for notifications', () => {
    // Critical should trigger immediate action
    expect(EQUIPMENT_CONFIG.budgetThresholds.critical).toBeLessThanOrEqual(10)

    // Warning should give reasonable time to plan
    expect(EQUIPMENT_CONFIG.budgetThresholds.warning).toBeLessThanOrEqual(25)

    // Gap between critical and warning should allow for planning
    const gap = EQUIPMENT_CONFIG.budgetThresholds.warning - EQUIPMENT_CONFIG.budgetThresholds.critical
    expect(gap).toBeGreaterThanOrEqual(10)
  })
})

describe('Threshold boundary testing', () => {
  it('should handle exact boundary values consistently', () => {
    const boundaries = [
      { value: 10, expectedHealth: 'warning', expectedPriority: 'medium' },
      { value: 25, expectedHealth: 'ok', expectedPriority: 'low' },
    ]

    boundaries.forEach(({ value, expectedHealth, expectedPriority }) => {
      expect(getBudgetHealthClass(value)).toBe(expectedHealth)
      expect(getBudgetNotificationPriority(value)).toBe(expectedPriority)
    })
  })

  it('should handle floating point precision', () => {
    const almostCritical = 10.0001
    const almostWarning = 25.0001

    expect(getBudgetHealthClass(almostCritical)).toBe('warning')
    expect(getBudgetHealthClass(almostWarning)).toBe('ok')
  })
})
