/**
 * Funding Notifications System
 * Proactive alerts for budget warnings and funding-related events
 */

import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"

const db = admin.firestore()

interface FundingAllocation {
  id: string
  fundingAccountId: string
  fundingAccountName: string
  labId: string
  type: "PERSON" | "PROJECT"
  personId?: string
  personName?: string
  projectId?: string
  allocatedAmount?: number
  currentSpent: number
  currentCommitted: number
  remainingBudget?: number
  currency: string
  status: "active" | "exhausted" | "suspended" | "archived"
}

// Funding warning thresholds (from lib/constants.ts)
const FUNDING_WARNING_THRESHOLDS = {
  CRITICAL: 90, // 90% spent
  HIGH: 80,     // 80% spent
  MEDIUM: 70,   // 70% spent
  LOW: 50,      // 50% spent
}

/**
 * Monitor allocation changes for low balance warnings
 * Triggers notifications when budget usage crosses threshold levels
 */
export const checkFundingAlertNotifications = functions.firestore
  .document("fundingAllocations/{allocationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as FundingAllocation
    const after = change.after.data() as FundingAllocation
    const allocationId = context.params.allocationId

    const percentBefore =
      ((before.currentSpent + before.currentCommitted) / (before.allocatedAmount || 1)) * 100
    const percentAfter =
      ((after.currentSpent + after.currentCommitted) / (after.allocatedAmount || 1)) * 100

    // Check if we crossed a warning threshold
    const thresholds = [
      FUNDING_WARNING_THRESHOLDS.MEDIUM,  // 70%
      FUNDING_WARNING_THRESHOLDS.HIGH,     // 80%
      FUNDING_WARNING_THRESHOLDS.CRITICAL, // 90%
    ]

    for (const threshold of thresholds) {
      if (percentBefore < threshold && percentAfter >= threshold) {
        // Crossed threshold - send notification
        await sendLowBalanceNotification(allocationId, after, threshold)
      }
    }

    // Check if exhausted
    if (before.status !== "exhausted" && after.status === "exhausted") {
      await sendBudgetExhaustedNotification(allocationId, after)
    }
  })

/**
 * Send low balance notification to user
 */
async function sendLowBalanceNotification(
  allocationId: string,
  allocation: FundingAllocation,
  threshold: number
) {
  if (!allocation.personId) return

  // Get user profile to check notification preferences
  const userDoc = await db.collection("users").doc(allocation.personId).get()
  const user = userDoc.data()

  if (!user || user.fundingAlertNotifications === false) {
    return // User has disabled funding notifications
  }

  const notification = {
    userId: allocation.personId,
    type: "FUNDING_LOW_BALANCE",
    title: `Budget Alert: ${threshold}% Used`,
    message: `Your ${allocation.fundingAccountName} allocation has reached ${threshold}% usage. Remaining budget: ${formatCurrency(allocation.remainingBudget || 0, allocation.currency)}`,
    priority: threshold >= FUNDING_WARNING_THRESHOLDS.CRITICAL ? "high" : "medium",
    relatedEntityType: "fundingAllocation",
    relatedEntityId: allocationId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    actionUrl: `/funding/allocations/${allocationId}`,
  }

  await db.collection("notifications").add(notification)

  // Also send email if critical
  if (threshold >= FUNDING_WARNING_THRESHOLDS.CRITICAL && user.email) {
    await sendEmail({
      to: user.email,
      subject: "Critical Budget Alert - Momentum Lab",
      body: notification.message,
    })
  }

  functions.logger.info(`Sent low balance notification for allocation ${allocationId}`, {
    threshold,
    percentUsed: ((allocation.currentSpent + allocation.currentCommitted) / (allocation.allocatedAmount || 1)) * 100,
  })
}

/**
 * Send budget exhausted notification
 */
async function sendBudgetExhaustedNotification(
  allocationId: string,
  allocation: FundingAllocation
) {
  if (!allocation.personId) return

  const notification = {
    userId: allocation.personId,
    type: "FUNDING_EXHAUSTED",
    title: "Budget Exhausted",
    message: `Your ${allocation.fundingAccountName} allocation has been fully depleted. Please contact your PI to request additional funding.`,
    priority: "high",
    relatedEntityType: "fundingAllocation",
    relatedEntityId: allocationId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    actionUrl: `/funding/allocations/${allocationId}`,
  }

  await db.collection("notifications").add(notification)

  // Notify PI as well
  const labDoc = await db.collection("labs").doc(allocation.labId).get()
  const lab = labDoc.data()

  if (lab?.piId) {
    const piNotification = {
      userId: lab.piId,
      type: "FUNDING_EXHAUSTED_PI",
      title: "Researcher Budget Exhausted",
      message: `${allocation.personName}'s ${allocation.fundingAccountName} allocation has been fully depleted.`,
      priority: "medium",
      relatedEntityType: "fundingAllocation",
      relatedEntityId: allocationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/funding/admin`,
    }

    await db.collection("notifications").add(piNotification)
  }

  functions.logger.info(`Sent budget exhausted notification for allocation ${allocationId}`)
}

/**
 * Notify PI about large orders (>€5000)
 */
export const notifyLargeOrder = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data()
    const orderId = context.params.orderId

    // Check if order exceeds threshold (€5000)
    const LARGE_ORDER_THRESHOLD = 5000

    if (order.estimatedCost >= LARGE_ORDER_THRESHOLD) {
      // Get lab PI
      const labDoc = await db.collection("labs").doc(order.labId).get()
      const lab = labDoc.data()

      if (lab?.piId) {
        const notification = {
          userId: lab.piId,
          type: "LARGE_ORDER_ALERT",
          title: "Large Order Created",
          message: `${order.orderedByName} created a ${formatCurrency(order.estimatedCost, order.currency)} order: ${order.orderDescription}`,
          priority: "medium",
          relatedEntityType: "order",
          relatedEntityId: orderId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          actionUrl: `/orders/${orderId}`,
        }

        await db.collection("notifications").add(notification)

        functions.logger.info(`Sent large order notification for order ${orderId}`, {
          amount: order.estimatedCost,
          currency: order.currency,
        })
      }
    }
  })

/**
 * Notify user when they receive a new funding allocation
 */
export const notifyAllocationCreated = functions.firestore
  .document("fundingAllocations/{allocationId}")
  .onCreate(async (snapshot, context) => {
    const allocation = snapshot.data() as FundingAllocation
    const allocationId = context.params.allocationId

    if (!allocation.personId || allocation.type !== "PERSON") {
      return // Only notify for personal allocations
    }

    const notification = {
      userId: allocation.personId,
      type: "ALLOCATION_CREATED",
      title: "New Funding Allocation",
      message: `You have been allocated ${formatCurrency(allocation.allocatedAmount || 0, allocation.currency)} from ${allocation.fundingAccountName}.`,
      priority: "medium",
      relatedEntityType: "fundingAllocation",
      relatedEntityId: allocationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/funding/my-budget`,
    }

    await db.collection("notifications").add(notification)

    functions.logger.info(`Sent allocation created notification`, {
      allocationId,
      userId: allocation.personId,
      amount: allocation.allocatedAmount,
    })
  })

/**
 * Notify when transaction is finalized
 */
export const notifyTransactionFinalized = functions.firestore
  .document("fundingTransactions/{transactionId}")
  .onCreate(async (snapshot, context) => {
    const transaction = snapshot.data()
    const transactionId = context.params.transactionId

    // Only notify for ORDER_RECEIVED transactions
    if (transaction.type !== "ORDER_RECEIVED" || !transaction.createdBy) {
      return
    }

    const notification = {
      userId: transaction.createdBy,
      type: "TRANSACTION_FINALIZED",
      title: "Order Received",
      message: `Your order has been received. ${formatCurrency(transaction.amount, transaction.currency)} has been deducted from your budget.`,
      priority: "low",
      relatedEntityType: "fundingTransaction",
      relatedEntityId: transactionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/orders/${transaction.orderId}`,
    }

    await db.collection("notifications").add(notification)

    functions.logger.info(`Sent transaction finalized notification`, {
      transactionId,
      userId: transaction.createdBy,
      amount: transaction.amount,
    })
  })

/**
 * Helper function to format currency
 */
function formatCurrency(amount: number, currency: string = "EUR"): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    GBP: "£",
    USD: "$",
    CHF: "CHF",
  }
  return `${symbols[currency] || currency}${amount.toFixed(2)}`
}

/**
 * Helper function to send emails
 * TODO: Implement with email service (SendGrid, AWS SES, etc.)
 */
async function sendEmail(params: { to: string; subject: string; body: string }) {
  // Placeholder for email sending
  functions.logger.info(`Email would be sent to ${params.to}: ${params.subject}`)
  // In production, implement with actual email service
}
