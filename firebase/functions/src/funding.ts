/**
 * Funding System Cloud Functions
 * Automates funding transaction lifecycle and budget tracking
 */

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

const db = admin.firestore()

interface FundingAllocation {
  id: string
  fundingAccountId: string
  fundingAccountName: string
  labId: string
  type: "PERSON" | "PROJECT"
  personId?: string
  projectId?: string
  allocatedAmount?: number
  softLimit?: number
  currentSpent: number
  currentCommitted: number
  remainingBudget?: number
  currency: string
  status: "active" | "exhausted" | "suspended" | "archived"
  lowBalanceWarningThreshold?: number
}

interface FundingTransaction {
  id: string
  fundingAccountId: string
  allocationId?: string
  orderId?: string
  amount: number
  currency: string
  type: "ORDER_COMMIT" | "ORDER_RECEIVED" | "ORDER_CANCELLED" | "ADJUSTMENT" | "REFUND"
  status: "PENDING" | "FINAL" | "CANCELLED"
  description: string
  createdAt: string
  createdBy: string
  createdByName?: string
  labId?: string
  finalizedAt?: string
}

/**
 * Handle order status changes to update funding transactions
 * ORDER_COMMIT (PENDING) → ORDER_RECEIVED (FINAL)
 */
export const onOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const orderId = context.params.orderId

    // Order marked as received - finalize transaction
    if (before.status !== "received" && after.status === "received") {
      await finalizeOrderTransaction(orderId, after)
    }

    // Order cancelled - cancel pending transaction
    if (before.status !== "cancelled" && after.status === "cancelled") {
      await cancelOrderTransaction(orderId, after)
    }
  })

/**
 * Finalize order transaction when order is received
 */
async function finalizeOrderTransaction(orderId: string, orderData: any) {
  try {
    // Find PENDING transaction for this order
    const transactionsSnapshot = await db
      .collection("fundingTransactions")
      .where("orderId", "==", orderId)
      .where("type", "==", "ORDER_COMMIT")
      .where("status", "==", "PENDING")
      .get()

    if (transactionsSnapshot.empty) {
      functions.logger.warn(`No pending transaction found for order ${orderId}`)
      return
    }

    const transactionDoc = transactionsSnapshot.docs[0]
    const transaction = transactionDoc.data() as FundingTransaction

    // Create new FINAL transaction (ORDER_RECEIVED)
    await db.collection("fundingTransactions").add({
      fundingAccountId: transaction.fundingAccountId,
      allocationId: transaction.allocationId,
      orderId,
      amount: orderData.actualCost || transaction.amount,
      currency: transaction.currency,
      type: "ORDER_RECEIVED",
      status: "FINAL",
      description: `Order received: ${orderData.orderDescription || ""}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: transaction.createdBy,
      createdByName: transaction.createdByName,
      labId: transaction.labId,
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Update original PENDING transaction to FINAL
    await transactionDoc.ref.update({
      status: "FINAL",
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Update FundingAccount budget (account-level tracking)
    const accountRef = db.collection("accounts").doc(transaction.fundingAccountId)
    const accountDoc = await accountRef.get()

    if (accountDoc.exists) {
      const account = accountDoc.data()
      const actualCost = orderData.actualCost || transaction.amount

      const newCommitted = Math.max(0, (account?.committedAmount || 0) - transaction.amount)
      const newSpent = (account?.spentAmount || 0) + actualCost
      const newRemaining = (account?.totalBudget || 0) - newCommitted - newSpent

      await accountRef.update({
        committedAmount: newCommitted,
        spentAmount: newSpent,
        remainingBudget: newRemaining,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      functions.logger.info(`Updated account budget for ${transaction.fundingAccountId}`, {
        committed: newCommitted,
        spent: newSpent,
        remaining: newRemaining,
      })
    }

    // Update allocation: move from committed to spent
    if (transaction.allocationId) {
      const allocationRef = db.collection("fundingAllocations").doc(transaction.allocationId)
      const allocationDoc = await allocationRef.get()

      if (allocationDoc.exists) {
        const allocation = allocationDoc.data() as FundingAllocation
        const actualCost = orderData.actualCost || transaction.amount

        const newCurrentSpent = allocation.currentSpent + actualCost
        const newCurrentCommitted = allocation.currentCommitted - transaction.amount
        const newRemainingBudget = (allocation.allocatedAmount || 0) - newCurrentSpent - newCurrentCommitted

        await allocationRef.update({
          currentCommitted: newCurrentCommitted,
          currentSpent: newCurrentSpent,
          remainingBudget: newRemainingBudget,
          lastTransactionAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Check if allocation is exhausted
        if (newRemainingBudget <= 0) {
          await allocationRef.update({ status: "exhausted" })
        }

        functions.logger.info(`Updated funding for order ${orderId}`, {
          allocationId: transaction.allocationId,
          spent: newCurrentSpent,
          committed: newCurrentCommitted,
          remaining: newRemainingBudget,
        })
      }
    }

    // Log audit event
    await db.collection("auditLogs").add({
      action: "FUNDING_TRANSACTION_CREATED",
      entityType: "fundingTransaction",
      entityId: orderId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        type: "ORDER_RECEIVED",
        amount: orderData.actualCost || transaction.amount,
        allocationId: transaction.allocationId,
      },
    })
  } catch (error: any) {
    functions.logger.error(`Error finalizing order transaction for ${orderId}`, error)
  }
}

/**
 * Cancel order transaction when order is cancelled
 */
async function cancelOrderTransaction(orderId: string, orderData: any) {
  try {
    // Find PENDING transaction for this order
    const transactionsSnapshot = await db
      .collection("fundingTransactions")
      .where("orderId", "==", orderId)
      .where("type", "==", "ORDER_COMMIT")
      .where("status", "==", "PENDING")
      .get()

    if (transactionsSnapshot.empty) {
      functions.logger.warn(`No pending transaction found for order ${orderId}`)
      return
    }

    const transactionDoc = transactionsSnapshot.docs[0]
    const transaction = transactionDoc.data() as FundingTransaction

    // Create cancellation transaction
    await db.collection("fundingTransactions").add({
      fundingAccountId: transaction.fundingAccountId,
      allocationId: transaction.allocationId,
      orderId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: "ORDER_CANCELLED",
      status: "FINAL",
      description: `Order cancelled: ${orderData.orderDescription || ""}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: transaction.createdBy,
      createdByName: transaction.createdByName,
      labId: transaction.labId,
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Update original PENDING transaction to CANCELLED
    await transactionDoc.ref.update({
      status: "CANCELLED",
      finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Update FundingAccount budget (account-level tracking)
    const accountRef = db.collection("accounts").doc(transaction.fundingAccountId)
    const accountDoc = await accountRef.get()

    if (accountDoc.exists) {
      const account = accountDoc.data()

      const newCommitted = Math.max(0, (account?.committedAmount || 0) - transaction.amount)
      const newRemaining = (account?.totalBudget || 0) - newCommitted - (account?.spentAmount || 0)

      await accountRef.update({
        committedAmount: newCommitted,
        remainingBudget: newRemaining,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      functions.logger.info(`Updated account budget for cancelled order ${transaction.fundingAccountId}`, {
        committed: newCommitted,
        remaining: newRemaining,
      })
    }

    // Update allocation: release committed funds
    if (transaction.allocationId) {
      const allocationRef = db.collection("fundingAllocations").doc(transaction.allocationId)
      const allocationDoc = await allocationRef.get()

      if (allocationDoc.exists) {
        const allocation = allocationDoc.data() as FundingAllocation

        const newCurrentCommitted = allocation.currentCommitted - transaction.amount
        const newRemainingBudget =
          (allocation.allocatedAmount || 0) - allocation.currentSpent - newCurrentCommitted

        await allocationRef.update({
          currentCommitted: newCurrentCommitted,
          remainingBudget: newRemainingBudget,
          lastTransactionAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Re-activate allocation if it was exhausted
        if (allocation.status === "exhausted" && newRemainingBudget > 0) {
          await allocationRef.update({ status: "active" })
        }

        functions.logger.info(`Released committed funds for cancelled order ${orderId}`, {
          allocationId: transaction.allocationId,
          releasedAmount: transaction.amount,
          newRemaining: newRemainingBudget,
        })
      }
    }

    // Log audit event
    await db.collection("auditLogs").add({
      action: "FUNDING_TRANSACTION_CREATED",
      entityType: "fundingTransaction",
      entityId: orderId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        type: "ORDER_CANCELLED",
        amount: transaction.amount,
        allocationId: transaction.allocationId,
      },
    })
  } catch (error: any) {
    functions.logger.error(`Error cancelling order transaction for ${orderId}`, error)
  }
}

/**
 * Automatically create funding allocation when user joins lab
 * This can be customized based on lab policy
 */
export const createDefaultAllocation = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId
    const userData = snapshot.data()

    // Only create allocation if user has a lab
    if (!userData.labId) {
      return
    }

    // Check if lab has default funding account
    const labDoc = await db.collection("labs").doc(userData.labId).get()
    if (!labDoc.exists) {
      return
    }

    const labData = labDoc.data()
    if (!labData?.defaultFundingAccountId) {
      return
    }

    // Create default personal allocation
    await db.collection("fundingAllocations").add({
      fundingAccountId: labData.defaultFundingAccountId,
      fundingAccountName: labData.defaultFundingAccountName || "Default Account",
      labId: userData.labId,
      type: "PERSON",
      personId: userId,
      personName: userData.fullName || userData.email,
      allocatedAmount: labData.defaultAllocationAmount || 0,
      currentSpent: 0,
      currentCommitted: 0,
      remainingBudget: labData.defaultAllocationAmount || 0,
      currency: labData.defaultCurrency || "EUR",
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "SYSTEM",
    })

    functions.logger.info(`Created default funding allocation for user ${userId}`)
  })
