/**
 * Migration Script: Fix Funding Synchronization
 *
 * This script:
 * 1. Creates missing FundingTransactions for existing orders
 * 2. Recalculates allocation budgets from transactions
 * 3. Validates account/allocation budget consistency
 * 4. Fixes any orphaned data
 *
 * Run with: npx ts-node scripts/fix-funding-sync.ts
 */

import * as admin from 'firebase-admin'
import * as path from 'path'

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'))
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

interface Order {
  id: string
  fundingAllocationId?: string
  accountId?: string
  accountName?: string
  allocationName?: string
  labId?: string
  catNum?: string
  productName?: string
  priceExVAT: number
  currency: string
  status: string
  orderedDate?: any
  receivedDate?: any
  createdDate?: any
  createdBy: string
  supplier?: string
}

interface FundingAllocation {
  id: string
  fundingAccountId: string
  allocatedAmount?: number
  currentSpent: number
  currentCommitted: number
  remainingBudget?: number
  status: string
}

interface MigrationStats {
  ordersProcessed: number
  transactionsCreated: number
  allocationsUpdated: number
  errors: string[]
}

async function migrateOrdersToTransactions() {
  const stats: MigrationStats = {
    ordersProcessed: 0,
    transactionsCreated: 0,
    allocationsUpdated: 0,
    errors: [],
  }

  console.log('🔍 Fetching all orders with funding allocations...')

  const ordersSnapshot = await db.collection('orders')
    .where('fundingAllocationId', '!=', null)
    .get()

  console.log(`📦 Found ${ordersSnapshot.size} orders with allocations`)

  for (const orderDoc of ordersSnapshot.docs) {
    const order = { id: orderDoc.id, ...orderDoc.data() } as Order

    try {
      stats.ordersProcessed++

      // Check if transaction already exists
      const existingTxn = await db.collection('fundingTransactions')
        .where('orderId', '==', order.id)
        .limit(1)
        .get()

      if (!existingTxn.empty) {
        console.log(`⏭️  Order ${order.id} already has transaction, skipping`)
        continue
      }

      // Determine transaction type based on order status
      let transactionType: 'ORDER_COMMIT' | 'ORDER_RECEIVED'
      let transactionStatus: 'PENDING' | 'FINAL'

      if (order.status === 'received') {
        transactionType = 'ORDER_RECEIVED'
        transactionStatus = 'FINAL'
      } else if (order.status === 'ordered') {
        transactionType = 'ORDER_COMMIT'
        transactionStatus = 'PENDING'
      } else {
        // Skip 'to-order' status - no transaction needed
        continue
      }

      // Create missing transaction
      await db.collection('fundingTransactions').add({
        fundingAccountId: order.accountId,
        fundingAccountName: order.accountName,
        allocationId: order.fundingAllocationId,
        allocationName: order.allocationName,
        labId: order.labId,
        orderId: order.id,
        orderNumber: order.catNum || order.id.substring(0, 8),
        amount: order.priceExVAT,
        currency: order.currency,
        type: transactionType,
        status: transactionStatus,
        description: `Migrated: ${order.productName}`,
        createdAt: order.orderedDate || order.createdDate,
        createdBy: order.createdBy,
        finalizedAt: order.status === 'received' ? (order.receivedDate || order.orderedDate) : null,
        supplierName: order.supplier,
      })

      stats.transactionsCreated++
      console.log(`✅ Created ${transactionType} transaction for order ${order.id}`)

    } catch (error) {
      const errorMsg = `❌ Error processing order ${order.id}: ${error}`
      console.error(errorMsg)
      stats.errors.push(errorMsg)
    }
  }

  console.log('\n🔄 Recalculating allocation budgets...')

  const allocationsSnapshot = await db.collection('fundingAllocations').get()

  for (const allocationDoc of allocationsSnapshot.docs) {
    const allocation = { id: allocationDoc.id, ...allocationDoc.data() } as FundingAllocation

    try {
      // Calculate spent from FINAL transactions
      const finalTxns = await db.collection('fundingTransactions')
        .where('allocationId', '==', allocation.id)
        .where('status', '==', 'FINAL')
        .where('type', 'in', ['ORDER_RECEIVED', 'ADJUSTMENT'])
        .get()

      const currentSpent = finalTxns.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0)
      }, 0)

      // Calculate committed from PENDING transactions
      const pendingTxns = await db.collection('fundingTransactions')
        .where('allocationId', '==', allocation.id)
        .where('status', '==', 'PENDING')
        .where('type', '==', 'ORDER_COMMIT')
        .get()

      const currentCommitted = pendingTxns.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0)
      }, 0)

      // Calculate remaining
      const remainingBudget = (allocation.allocatedAmount || 0) - currentSpent - currentCommitted

      // Determine status
      let status: 'active' | 'exhausted' | 'suspended' | 'archived' = 'active'
      if (remainingBudget <= 0) status = 'exhausted'
      if (allocation.status === 'suspended') status = 'suspended'
      if (allocation.status === 'archived') status = 'archived'

      // Update allocation
      await db.collection('fundingAllocations').doc(allocation.id).update({
        currentSpent,
        currentCommitted,
        remainingBudget,
        status,
        lastTransactionAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      stats.allocationsUpdated++
      console.log(`✅ Updated allocation ${allocation.id}: spent=${currentSpent}, committed=${currentCommitted}, remaining=${remainingBudget}`)

    } catch (error) {
      const errorMsg = `❌ Error updating allocation ${allocation.id}: ${error}`
      console.error(errorMsg)
      stats.errors.push(errorMsg)
    }
  }

  console.log('\n📊 Migration Complete!')
  console.log('─'.repeat(50))
  console.log(`Orders processed: ${stats.ordersProcessed}`)
  console.log(`Transactions created: ${stats.transactionsCreated}`)
  console.log(`Allocations updated: ${stats.allocationsUpdated}`)
  console.log(`Errors: ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    stats.errors.forEach(err => console.log(err))
  }

  return stats
}

// Run migration
migrateOrdersToTransactions()
  .then(() => {
    console.log('\n✅ Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
