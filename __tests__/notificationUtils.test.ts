/**
 * Integration Tests for Notification Utilities
 * Tests notification triggers, priorities, and throttling logic
 */

import {
  getLabManagers,
  shouldSendLowBudgetNotification,
} from '@/lib/notificationUtils'
import { PersonProfile, FundingAllocation } from '@/lib/types'
import { getBudgetNotificationPriority } from '@/lib/equipmentConfig'

describe('getLabManagers', () => {
  const mockProfiles: PersonProfile[] = [
    {
      id: 'user-1',
      userId: 'auth-1',
      firstName: 'John',
      lastName: 'PI',
      email: 'pi@example.com',
      role: 'PI',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as PersonProfile,
    {
      id: 'user-2',
      userId: 'auth-2',
      firstName: 'Jane',
      lastName: 'Manager',
      email: 'manager@example.com',
      role: 'Lab Manager',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as PersonProfile,
    {
      id: 'user-3',
      userId: 'auth-3',
      firstName: 'Bob',
      lastName: 'Researcher',
      email: 'researcher@example.com',
      role: 'Researcher',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as PersonProfile,
    {
      id: 'user-4',
      userId: 'auth-4',
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'admin@example.com',
      role: 'Administrator',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as PersonProfile,
  ]

  it('should return only managers and PIs', () => {
    const managers = getLabManagers(mockProfiles)

    expect(managers).toHaveLength(3)
    expect(managers.map(m => m.role)).toContain('PI')
    expect(managers.map(m => m.role)).toContain('Lab Manager')
    expect(managers.map(m => m.role)).toContain('Administrator')
    expect(managers.map(m => m.role)).not.toContain('Researcher')
  })

  it('should return empty array when no managers exist', () => {
    const noManagers: PersonProfile[] = [
      {
        ...mockProfiles[2],
        role: 'Researcher',
      } as PersonProfile,
    ]

    const managers = getLabManagers(noManagers)

    expect(managers).toHaveLength(0)
  })

  it('should handle empty profile list', () => {
    const managers = getLabManagers([])

    expect(managers).toHaveLength(0)
  })
})

describe('shouldSendLowBudgetNotification', () => {
  it('should send notification if never sent before', () => {
    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 200,
      currentSpent: 800,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      // lastLowBalanceWarningAt is undefined
    }

    expect(shouldSendLowBudgetNotification(allocation)).toBe(true)
  })

  it('should not send notification if recently sent (within 24 hours)', () => {
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 200,
      currentSpent: 800,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      lastLowBalanceWarningAt: oneHourAgo.toISOString(),
    }

    expect(shouldSendLowBudgetNotification(allocation)).toBe(false)
  })

  it('should send notification if last sent over 24 hours ago', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 200,
      currentSpent: 800,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      lastLowBalanceWarningAt: twoDaysAgo.toISOString(),
    }

    expect(shouldSendLowBudgetNotification(allocation)).toBe(true)
  })

  it('should support custom threshold hours', () => {
    const thirtyHoursAgo = new Date()
    thirtyHoursAgo.setHours(thirtyHoursAgo.getHours() - 30)

    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 200,
      currentSpent: 800,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      lastLowBalanceWarningAt: thirtyHoursAgo.toISOString(),
    }

    expect(shouldSendLowBudgetNotification(allocation, 24)).toBe(true) // Over 24 hours
    expect(shouldSendLowBudgetNotification(allocation, 48)).toBe(false) // Under 48 hours
  })

  it('should handle edge case of exactly 24 hours', () => {
    const exactlyOneDayAgo = new Date()
    exactlyOneDayAgo.setHours(exactlyOneDayAgo.getHours() - 24)

    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 200,
      currentSpent: 800,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      lastLowBalanceWarningAt: exactlyOneDayAgo.toISOString(),
    }

    expect(shouldSendLowBudgetNotification(allocation, 24)).toBe(true)
  })
})

describe('getBudgetNotificationPriority', () => {
  it('should return high priority for critical budget (<10%)', () => {
    expect(getBudgetNotificationPriority(5)).toBe('high')
    expect(getBudgetNotificationPriority(9)).toBe('high')
  })

  it('should return medium priority for warning budget (10-24%)', () => {
    expect(getBudgetNotificationPriority(10)).toBe('medium')
    expect(getBudgetNotificationPriority(15)).toBe('medium')
    expect(getBudgetNotificationPriority(24)).toBe('medium')
  })

  it('should return low priority for healthy budget (>=25%)', () => {
    expect(getBudgetNotificationPriority(25)).toBe('low')
    expect(getBudgetNotificationPriority(50)).toBe('low')
    expect(getBudgetNotificationPriority(100)).toBe('low')
  })

  it('should handle edge cases', () => {
    expect(getBudgetNotificationPriority(0)).toBe('high')
    expect(getBudgetNotificationPriority(9.9)).toBe('high')
    expect(getBudgetNotificationPriority(10.1)).toBe('medium')
    expect(getBudgetNotificationPriority(24.9)).toBe('medium')
    expect(getBudgetNotificationPriority(25.1)).toBe('low')
  })
})

describe('Integration: Budget notification workflow', () => {
  it('should correctly determine when to notify about low budget', () => {
    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 80, // 8% remaining
      currentSpent: 920,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    const percentRemaining = (allocation.remainingBudget / allocation.allocatedAmount) * 100

    // Should send notification (never sent before)
    expect(shouldSendLowBudgetNotification(allocation)).toBe(true)

    // Should be high priority (< 10%)
    expect(getBudgetNotificationPriority(percentRemaining)).toBe('high')
  })

  it('should prevent notification spam with throttling', () => {
    const fiveHoursAgo = new Date()
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5)

    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 80, // 8% remaining (critical)
      currentSpent: 920,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      lastLowBalanceWarningAt: fiveHoursAgo.toISOString(),
    }

    const percentRemaining = (allocation.remainingBudget / allocation.allocatedAmount) * 100

    // Still critical, but notification should be throttled
    expect(getBudgetNotificationPriority(percentRemaining)).toBe('high')
    expect(shouldSendLowBudgetNotification(allocation)).toBe(false)
  })

  it('should handle budget exhaustion scenario', () => {
    const allocation: FundingAllocation = {
      id: 'alloc-1',
      fundingAccountId: 'acc-1',
      allocatedAmount: 1000,
      remainingBudget: 0, // Exhausted
      currentSpent: 1000,
      currentCommitted: 0,
      currency: 'GBP',
      status: 'active',
      type: 'PERSON',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    const percentRemaining = (allocation.remainingBudget / allocation.allocatedAmount) * 100

    expect(percentRemaining).toBe(0)
    expect(getBudgetNotificationPriority(percentRemaining)).toBe('high')
  })
})
