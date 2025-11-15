/**
 * useFunding Hook
 *
 * Centralized funding data management for funding accounts and allocations.
 * Part of Equipment & Inventory System Integration (Phase 3)
 *
 * Purpose: Eliminate redundant Firestore queries by fetching funding data
 * once at the context level and sharing it across all components.
 *
 * Before: PersonalLedger, OrderFormDialog, and others each fetch funding data
 * After: All components use shared state from useAppContext
 */

import { useState, useEffect } from 'react'
import { FundingAccount, FundingAllocation } from '../types'
import {
  subscribeToFundingAccounts,
  subscribeToFundingAllocations,
} from '../firestoreService'
import { logger } from '../logger'

export interface UseFundingResult {
  // Funding accounts (lab-wide budget accounts)
  fundingAccounts: FundingAccount[]
  fundingAccountsLoading: boolean
  fundingAccountsError: Error | null

  // Funding allocations (personal budget allocations)
  fundingAllocations: FundingAllocation[]
  fundingAllocationsLoading: boolean
  fundingAllocationsError: Error | null

  // Combined loading state
  loading: boolean
}

/**
 * Fetches and manages funding data for a lab and user
 *
 * @param labId - Lab ID to fetch funding accounts for
 * @param userId - User ID to fetch personal allocations for
 * @returns Funding data with loading states
 *
 * @example
 * // In AppContext.tsx
 * const funding = useFunding(currentUserProfile?.labId, currentUser?.uid)
 *
 * // In any component
 * const { fundingAccounts, fundingAllocations } = useAppContext()
 */
export function useFunding(
  labId: string | null | undefined,
  userId: string | null | undefined
): UseFundingResult {
  // Funding accounts state (lab-wide)
  const [fundingAccounts, setFundingAccounts] = useState<FundingAccount[]>([])
  const [fundingAccountsLoading, setFundingAccountsLoading] = useState(true)
  const [fundingAccountsError, setFundingAccountsError] = useState<Error | null>(null)

  // Funding allocations state (user-specific)
  const [fundingAllocations, setFundingAllocations] = useState<FundingAllocation[]>([])
  const [fundingAllocationsLoading, setFundingAllocationsLoading] = useState(true)
  const [fundingAllocationsError, setFundingAllocationsError] = useState<Error | null>(null)

  // Subscribe to funding accounts for the lab
  useEffect(() => {
    if (!labId) {
      setFundingAccounts([])
      setFundingAccountsLoading(false)
      return
    }

    setFundingAccountsLoading(true)
    setFundingAccountsError(null)

    try {
      const unsubscribe = subscribeToFundingAccounts(
        { labId },
        (accounts) => {
          setFundingAccounts(accounts)
          setFundingAccountsLoading(false)
        },
        (error) => {
          logger.error('Error subscribing to funding accounts', error)
          setFundingAccountsError(error as Error)
          setFundingAccountsLoading(false)
        }
      )

      return unsubscribe
    } catch (error) {
      logger.error('Error setting up funding accounts subscription', error)
      setFundingAccountsError(error as Error)
      setFundingAccountsLoading(false)
      return undefined
    }
  }, [labId])

  // Subscribe to funding allocations for the user
  useEffect(() => {
    if (!userId) {
      setFundingAllocations([])
      setFundingAllocationsLoading(false)
      return
    }

    setFundingAllocationsLoading(true)
    setFundingAllocationsError(null)

    try {
      const unsubscribe = subscribeToFundingAllocations(
        { userId },
        (allocations) => {
          setFundingAllocations(allocations)
          setFundingAllocationsLoading(false)
        },
        (error) => {
          logger.error('Error subscribing to funding allocations', error)
          setFundingAllocationsError(error as Error)
          setFundingAllocationsLoading(false)
        }
      )

      return unsubscribe
    } catch (error) {
      logger.error('Error setting up funding allocations subscription', error)
      setFundingAllocationsError(error as Error)
      setFundingAllocationsLoading(false)
      return undefined
    }
  }, [userId])

  return {
    fundingAccounts,
    fundingAccountsLoading,
    fundingAccountsError,
    fundingAllocations,
    fundingAllocationsLoading,
    fundingAllocationsError,
    loading: fundingAccountsLoading || fundingAllocationsLoading,
  }
}

/**
 * Helper: Get active allocations for a user
 * Filters out exhausted/suspended allocations
 */
export function getActiveAllocations(
  allocations: FundingAllocation[]
): FundingAllocation[] {
  return allocations.filter(
    a => a.status === 'active' && (a.remainingBudget === undefined || a.remainingBudget > 0)
  )
}

/**
 * Helper: Get total remaining budget for a user
 */
export function getTotalRemainingBudget(
  allocations: FundingAllocation[]
): number {
  return allocations
    .filter(a => a.status === 'active')
    .reduce((total, a) => total + (a.remainingBudget || 0), 0)
}

/**
 * Helper: Check if user has sufficient funds in any allocation
 */
export function hasSufficientFunds(
  allocations: FundingAllocation[],
  requiredAmount: number
): boolean {
  const totalRemaining = getTotalRemainingBudget(allocations)
  return totalRemaining >= requiredAmount
}

/**
 * Helper: Find allocation by account ID
 */
export function findAllocationByAccount(
  allocations: FundingAllocation[],
  accountId: string
): FundingAllocation | undefined {
  return allocations.find(a => a.fundingAccountId === accountId)
}

/**
 * Helper: Get account name from funding accounts list
 */
export function getAccountName(
  accounts: FundingAccount[],
  accountId: string
): string {
  const account = accounts.find(a => a.id === accountId)
  return account?.accountName || 'Unknown Account'
}
