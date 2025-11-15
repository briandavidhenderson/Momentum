/**
 * Budget Utilities
 * Feature #7: Budget tracking and validation utilities
 */

import { getFirebaseDb } from './firebase'
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore'
import { FundingAccount, Order } from './types'
import { logger } from './logger'

/**
 * Calculate available balance for an account
 */
export function calculateAvailableBalance(account: FundingAccount): number {
  const total = account.totalBudget || 0
  const spent = account.spentAmount || 0
  const committed = account.committedAmount || 0
  return total - spent - committed
}

/**
 * Check if account has sufficient funds for an order
 */
export async function checkSufficientFunds(
  accountId: string,
  orderAmount: number
): Promise<{ sufficient: boolean; available: number; message?: string }> {
  const db = getFirebaseDb()
  try {
    const accountDoc = await getDoc(doc(db, 'accounts', accountId))

    if (!accountDoc.exists()) {
      return {
        sufficient: false,
        available: 0,
        message: 'Funding account not found'
      }
    }

    const account = accountDoc.data() as FundingAccount
    const available = calculateAvailableBalance(account)

    if (orderAmount > available) {
      return {
        sufficient: false,
        available,
        message: `Insufficient funds. Available: ${available.toFixed(2)} ${account.currency}, Required: ${orderAmount.toFixed(2)} ${account.currency}`
      }
    }

    return {
      sufficient: true,
      available
    }
  } catch (error) {
    logger.error('Error checking funds', error)
    return {
      sufficient: false,
      available: 0,
      message: 'Error checking account balance'
    }
  }
}

/**
 * Update account budget when order status changes
 * Feature #7: Implements the order lifecycle budget flow:
 * - to-order → ordered: move to committed
 * - ordered → received: move from committed to spent
 * - to-order → received: move directly to spent
 * - Deleting order: remove from committed or spent
 */
export async function updateAccountBudget(
  accountId: string,
  orderAmount: number,
  oldStatus: Order['status'] | null,
  newStatus: Order['status'] | null
): Promise<void> {
  const db = getFirebaseDb()
  try {
    await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, 'accounts', accountId)
      const accountDoc = await transaction.get(accountRef)

      if (!accountDoc.exists()) {
        throw new Error('Funding account not found')
      }

      const account = accountDoc.data() as FundingAccount
      let committed = account.committedAmount || 0
      let spent = account.spentAmount || 0

      // Handle budget changes based on status transition
      if (oldStatus === null && newStatus === 'to-order') {
        // New order in to-order state - no budget impact yet
        // (will be committed when moved to "ordered")
      } else if (oldStatus === null && newStatus === 'ordered') {
        // New order directly to ordered - add to committed
        committed += orderAmount
      } else if (oldStatus === null && newStatus === 'received') {
        // New order directly to received - add to spent
        spent += orderAmount
      } else if (oldStatus === 'to-order' && newStatus === 'ordered') {
        // Moving from to-order to ordered - add to committed
        committed += orderAmount
      } else if (oldStatus === 'to-order' && newStatus === 'received') {
        // Moving from to-order directly to received - add to spent
        spent += orderAmount
      } else if (oldStatus === 'ordered' && newStatus === 'received') {
        // Moving from ordered to received - move from committed to spent
        committed -= orderAmount
        spent += orderAmount
      } else if (oldStatus === 'ordered' && newStatus === 'to-order') {
        // Moving back from ordered to to-order - remove from committed
        committed -= orderAmount
      } else if (oldStatus === 'received' && newStatus === 'ordered') {
        // Moving back from received to ordered - move from spent to committed
        spent -= orderAmount
        committed += orderAmount
      } else if (oldStatus === 'received' && newStatus === 'to-order') {
        // Moving back from received to to-order - remove from spent
        spent -= orderAmount
      } else if (oldStatus !== null && newStatus === null) {
        // Deleting order - remove from appropriate bucket
        if (oldStatus === 'ordered') {
          committed -= orderAmount
        } else if (oldStatus === 'received') {
          spent -= orderAmount
        }
      }

      // Ensure no negative values
      committed = Math.max(0, committed)
      spent = Math.max(0, spent)

      // Calculate remaining budget
      const remainingBudget = (account.totalBudget || 0) - committed - spent

      // Update account
      transaction.update(accountRef, {
        committedAmount: committed,
        spentAmount: spent,
        remainingBudget,
        updatedAt: new Date().toISOString()
      })
    })
  } catch (error) {
    logger.error('Error updating account budget', error)
    throw error
  }
}

/**
 * Validate order creation against account budget
 */
export async function validateOrderCreation(
  accountId: string,
  orderAmount: number
): Promise<{ valid: boolean; message?: string }> {
  const fundsCheck = await checkSufficientFunds(accountId, orderAmount)

  if (!fundsCheck.sufficient) {
    return {
      valid: false,
      message: fundsCheck.message || 'Insufficient funds'
    }
  }

  return { valid: true }
}

/**
 * Get account budget summary
 */
export async function getAccountBudgetSummary(accountId: string): Promise<{
  total: number
  committed: number
  spent: number
  available: number
  currency: string
} | null> {
  const db = getFirebaseDb()
  try {
    const accountDoc = await getDoc(doc(db, 'accounts', accountId))

    if (!accountDoc.exists()) {
      return null
    }

    const account = accountDoc.data() as FundingAccount

    return {
      total: account.totalBudget || 0,
      committed: account.committedAmount || 0,
      spent: account.spentAmount || 0,
      available: calculateAvailableBalance(account),
      currency: account.currency
    }
  } catch (error) {
    logger.error('Error getting budget summary', error)
    return null
  }
}
