/**
 * Funding Service - Funder and funding account management
 * Handles operations on 'funders', 'accounts', and 'fundingAllocations' collections
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  Query,
} from "firebase/firestore"
import { getFirebaseDb } from "../firebase"
import { logger } from "../logger"
import type { Funder, FundingAccount, FundingAllocation, FundingTransaction } from "../types"

// ============================================================================
// FUNDERS
// ============================================================================

/**
 * Creates a new funder (funding body/organization)
 * Handles Date to Timestamp conversion for Firestore
 */
export async function createFunder(funderData: Omit<Funder, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const funderRef = doc(collection(db, "funders"))
  const funderId = funderRef.id

  const dataToSave: any = {
    ...funderData,
    id: funderId,
    createdAt: new Date().toISOString(),
  }

  // Convert Date fields to Timestamps for Firestore
  if (funderData.startDate) {
    dataToSave.startDate = Timestamp.fromDate(funderData.startDate)
  }
  if (funderData.endDate) {
    dataToSave.endDate = Timestamp.fromDate(funderData.endDate)
  }

  // Remove undefined values - Firestore doesn't allow them
  Object.keys(dataToSave).forEach(key => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key]
    }
  })

  await setDoc(funderRef, dataToSave)

  return funderId
}

/**
 * Get all funders, optionally filtered by organisation
 */
export async function getFunders(orgId?: string): Promise<Funder[]> {
  const db = getFirebaseDb()
  const fundersRef = collection(db, "funders")

  let q = query(fundersRef)
  if (orgId) {
    q = query(fundersRef, where("organisationId", "==", orgId))
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => {
    const data = doc.data()
    // Convert Timestamps back to Dates
    return {
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
    } as Funder
  })
}

/**
 * Subscribe to funders with real-time updates
 */
export function subscribeToFunders(callback: (funders: Funder[]) => void, orgId?: string): Unsubscribe {
  const db = getFirebaseDb()
  const fundersRef = collection(db, "funders")

  let q = query(fundersRef)
  if (orgId) {
    q = query(fundersRef, where("organisationId", "==", orgId))
  }

  return onSnapshot(q, (snapshot) => {
    const funders = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
      } as Funder
    })
    callback(funders)
  })
}

// ============================================================================
// FUNDING ACCOUNTS
// ============================================================================

/**
 * Creates a new funding account linked to a master project
 */
export async function createFundingAccount(accountData: Omit<FundingAccount, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirebaseDb()
  const accountRef = doc(collection(db, "accounts"))
  const accountId = accountRef.id

  await setDoc(accountRef, {
    ...accountData,
    id: accountId,
    createdAt: new Date().toISOString(),
    spentAmount: 0,
    committedAmount: 0,
    remainingBudget: accountData.totalBudget || 0,
  })

  return accountId
}

/**
 * Gets all funding accounts, optionally filtered by project or funder
 */
export async function getFundingAccounts(filters?: {
  masterProjectId?: string
  funderId?: string
}): Promise<FundingAccount[]> {
  const db = getFirebaseDb()
  let q = collection(db, "accounts")

  if (filters?.masterProjectId) {
    q = query(q as any, where("masterProjectId", "==", filters.masterProjectId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data() as FundingAccount)
}

/**
 * Updates a funding account
 */
export async function updateFundingAccount(accountId: string, updates: Partial<FundingAccount>): Promise<void> {
  const db = getFirebaseDb()
  const accountRef = doc(db, "accounts", accountId)
  const updateData: any = { ...updates, updatedAt: new Date().toISOString() }
  await updateDoc(accountRef, updateData)
}

/**
 * Deletes a funding account
 */
export async function deleteFundingAccount(accountId: string): Promise<void> {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, "accounts", accountId))
}

/**
 * Subscribes to funding accounts with optional filters
 */
export function subscribeToFundingAccounts(
  filters: { labId?: string; masterProjectId?: string; funderId?: string } | null,
  callback: (accounts: FundingAccount[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q = collection(db, "accounts")

  if (filters?.labId) {
    q = query(q as any, where("labId", "==", filters.labId)) as any
  }
  if (filters?.masterProjectId) {
    q = query(q as any, where("masterProjectId", "==", filters.masterProjectId)) as any
  }
  if (filters?.funderId) {
    q = query(q as any, where("funderId", "==", filters.funderId)) as any
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const accounts = snapshot.docs.map(doc => doc.data() as FundingAccount)
      callback(accounts)
    },
    (error) => {
      logger.error("Error in subscribeToFundingAccounts", error)
      if (errorCallback) {
        errorCallback(error as Error)
      }
    }
  )
}

// ============================================================================
// FUNDING ALLOCATIONS
// ============================================================================

/**
 * Subscribe to funding allocations with real-time updates
 */
export function subscribeToFundingAllocations(
  filters: { userId?: string } | null,
  callback: (allocations: FundingAllocation[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseDb()
  let q: Query = collection(db, "fundingAllocations")

  if (filters?.userId) {
    q = query(
      q,
      where("type", "==", "PERSON"),
      where("personId", "==", filters.userId),
      where("status", "in", ["active", "exhausted"])
    )
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const allocations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FundingAllocation[]
      callback(allocations)
    },
    (error) => {
      logger.error("Error in subscribeToFundingAllocations", error)
      if (errorCallback) {
        errorCallback(error as Error)
      }
    }
  )
}

// ============================================================================
// FUNDING TRANSACTIONS
// ============================================================================

/**
 * Creates a new funding transaction (ledger entry)
 * Used for tracking ORDER_COMMIT, ORDER_RECEIVED, ORDER_CANCELLED, ADJUSTMENTS
 */
export async function createFundingTransaction(
  transactionData: Omit<FundingTransaction, 'id' | 'createdAt'>
): Promise<string> {
  const db = getFirebaseDb()
  const transactionRef = doc(collection(db, "fundingTransactions"))
  const transactionId = transactionRef.id

  await setDoc(transactionRef, {
    ...transactionData,
    id: transactionId,
    createdAt: new Date().toISOString(),
  })

  logger.info(`Created funding transaction ${transactionId}`, {
    type: transactionData.type,
    amount: transactionData.amount,
    orderId: transactionData.orderId,
    allocationId: transactionData.allocationId,
  })

  return transactionId
}

/**
 * Updates a funding allocation's budget tracking
 * Used when orders are placed, received, or cancelled
 */
export async function updateAllocationBudget(
  allocationId: string,
  updates: {
    currentSpent?: number
    currentCommitted?: number
    remainingBudget?: number
    status?: FundingAllocation['status']
  }
): Promise<void> {
  const db = getFirebaseDb()
  const allocationRef = doc(db, "fundingAllocations", allocationId)

  const updateData: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
    lastTransactionAt: new Date().toISOString(),
  }

  await updateDoc(allocationRef, updateData)

  logger.info(`Updated allocation budget ${allocationId}`, updates)
}

/**
 * Gets an allocation by ID with error handling
 */
export async function getAllocation(allocationId: string): Promise<FundingAllocation | null> {
  const db = getFirebaseDb()
  const allocationRef = doc(db, "fundingAllocations", allocationId)
  const allocationDoc = await getDoc(allocationRef)

  if (!allocationDoc.exists()) {
    logger.warn(`Allocation ${allocationId} not found`)
    return null
  }

  return allocationDoc.data() as FundingAllocation
}

/**
 * Create a new funding allocation
 * @returns The ID of the newly created allocation
 */
export async function createFundingAllocation(allocationData: Omit<FundingAllocation, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const allocationRef = doc(collection(db, "fundingAllocations"))
  const allocationId = allocationRef.id

  await setDoc(allocationRef, {
    ...allocationData,
    id: allocationId,
  })

  logger.info(`Created funding allocation ${allocationId}`, {
    type: allocationData.type,
    personId: allocationData.personId,
    projectId: allocationData.projectId,
    amount: allocationData.allocatedAmount,
  })

  return allocationId
}
