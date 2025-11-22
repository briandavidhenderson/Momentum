/**
 * Equipment & Inventory System Migration Script
 *
 * Migrates existing Firestore data to new centralized structure:
 * - Removes duplicate qty/price fields from EquipmentSupply (Phase 1)
 * - Ensures InventoryItem is single source of truth
 * - Adds budget tracking fields to FundingAllocations (Phase 3)
 * - Validates data integrity after migration
 *
 * USAGE:
 *   npx ts-node scripts/migrate-equipment-inventory.ts [--dry-run] [--collection=<name>]
 *
 * OPTIONS:
 *   --dry-run         Preview changes without modifying database
 *   --collection      Migrate specific collection only (equipment|inventory|fundingAllocations|all)
 *
 * Part of Equipment & Inventory System Integration - Task 28/28
 * 
 * NOTE: This is a one-time migration script. According to MIGRATION_README.md, this migration
 * (Task 28/28) has been completed. Only run again if you need to re-migrate data or if
 * new equipment/inventory items were added before the migration was run.
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const collectionArg = args.find(arg => arg.startsWith('--collection='))
const targetCollection = collectionArg ? collectionArg.split('=')[1] : 'all'

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './service-account-key.json'

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: Service account key not found at:', serviceAccountPath)
  console.error('   Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable')
  console.error('   or place service-account-key.json in the project root')
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Migration statistics
interface MigrationStats {
  equipment: { total: number; migrated: number; errors: number }
  inventory: { total: number; migrated: number; errors: number }
  fundingAllocations: { total: number; migrated: number; errors: number }
  errors: Array<{ collection: string; docId: string; error: string }>
}

const stats: MigrationStats = {
  equipment: { total: 0, migrated: 0, errors: 0 },
  inventory: { total: 0, migrated: 0, errors: 0 },
  fundingAllocations: { total: 0, migrated: 0, errors: 0 },
  errors: []
}

/**
 * PHASE 1: Migrate Equipment Supplies
 * Removes duplicate qty, productName, catNum, price fields from EquipmentSupply
 * These fields should only exist in InventoryItem (single source of truth)
 */
async function migrateEquipmentSupplies() {
  console.log('\n📦 Migrating Equipment Supplies (Phase 1)...')

  const equipmentSnapshot = await db.collection('equipment').get()
  stats.equipment.total = equipmentSnapshot.size

  for (const doc of equipmentSnapshot.docs) {
    try {
      const equipment = doc.data()
      const supplies = equipment.supplies || []

      // Check if any supply has duplicate fields
      const hasDuplicateFields = supplies.some((supply: any) =>
        supply.qty !== undefined ||
        supply.productName !== undefined ||
        supply.catNum !== undefined ||
        supply.price !== undefined
      )

      if (hasDuplicateFields) {
        // Remove duplicate fields from each supply
        const cleanedSupplies = supplies.map((supply: any) => {
          const { qty, productName, catNum, price, ...cleanSupply } = supply
          return cleanSupply
        })

        console.log(`  ✓ Cleaning ${doc.id}: Removed duplicate fields from ${supplies.length} supplies`)

        if (!isDryRun) {
          await doc.ref.update({ supplies: cleanedSupplies })
        }

        stats.equipment.migrated++
      }
    } catch (error) {
      stats.equipment.errors++
      stats.errors.push({
        collection: 'equipment',
        docId: doc.id,
        error: error instanceof Error ? error.message : String(error)
      })
      console.error(`  ✗ Error migrating ${doc.id}:`, error)
    }
  }

  console.log(`  📊 Equipment: ${stats.equipment.migrated}/${stats.equipment.total} migrated, ${stats.equipment.errors} errors`)
}

/**
 * PHASE 1: Validate Inventory Items
 * Ensures all inventory items have required fields and proper structure
 */
async function validateInventoryItems() {
  console.log('\n📋 Validating Inventory Items...')

  const inventorySnapshot = await db.collection('inventory').get()
  stats.inventory.total = inventorySnapshot.size

  for (const doc of inventorySnapshot.docs) {
    try {
      const item = doc.data()
      const updates: any = {}

      // Ensure required fields exist
      if (item.currentQuantity === undefined) {
        updates.currentQuantity = 0
        console.log(`  ℹ ${doc.id}: Adding missing currentQuantity`)
      }

      if (item.minQuantity === undefined) {
        updates.minQuantity = 0
        console.log(`  ℹ ${doc.id}: Adding missing minQuantity`)
      }

      // Calculate inventory level if missing
      if (item.inventoryLevel === undefined) {
        const current = item.currentQuantity || 0
        const min = item.minQuantity || 0

        let level: string
        if (current === 0) level = 'empty'
        else if (current <= min) level = 'low'
        else if (current <= min * 2) level = 'medium'
        else level = 'full'

        updates.inventoryLevel = level
        console.log(`  ℹ ${doc.id}: Calculated inventoryLevel = ${level}`)
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        if (!isDryRun) {
          await doc.ref.update(updates)
        }
        stats.inventory.migrated++
      }
    } catch (error) {
      stats.inventory.errors++
      stats.errors.push({
        collection: 'inventory',
        docId: doc.id,
        error: error instanceof Error ? error.message : String(error)
      })
      console.error(`  ✗ Error validating ${doc.id}:`, error)
    }
  }

  console.log(`  📊 Inventory: ${stats.inventory.migrated}/${stats.inventory.total} updated, ${stats.inventory.errors} errors`)
}

/**
 * PHASE 3: Migrate Funding Allocations
 * Adds budget tracking fields (remainingBudget, currentSpent, currentCommitted)
 */
async function migrateFundingAllocations() {
  console.log('\n💰 Migrating Funding Allocations (Phase 3)...')

  const allocationsSnapshot = await db.collection('fundingAllocations').get()
  stats.fundingAllocations.total = allocationsSnapshot.size

  for (const doc of allocationsSnapshot.docs) {
    try {
      const allocation = doc.data()
      const updates: any = {}

      // Add missing budget tracking fields
      if (allocation.remainingBudget === undefined) {
        const allocated = allocation.allocatedAmount || 0
        const spent = allocation.currentSpent || 0
        const committed = allocation.currentCommitted || 0
        updates.remainingBudget = allocated - spent - committed
        console.log(`  ✓ ${doc.id}: Calculated remainingBudget = ${updates.remainingBudget}`)
      }

      if (allocation.currentSpent === undefined) {
        updates.currentSpent = 0
        console.log(`  ℹ ${doc.id}: Initialized currentSpent = 0`)
      }

      if (allocation.currentCommitted === undefined) {
        updates.currentCommitted = 0
        console.log(`  ℹ ${doc.id}: Initialized currentCommitted = 0`)
      }

      // Add default warning threshold if missing
      if (allocation.lowBalanceWarningThreshold === undefined) {
        updates.lowBalanceWarningThreshold = 25 // 25% default
        console.log(`  ℹ ${doc.id}: Set default lowBalanceWarningThreshold = 25%`)
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        if (!isDryRun) {
          await doc.ref.update(updates)
        }
        stats.fundingAllocations.migrated++
      }
    } catch (error) {
      stats.fundingAllocations.errors++
      stats.errors.push({
        collection: 'fundingAllocations',
        docId: doc.id,
        error: error instanceof Error ? error.message : String(error)
      })
      console.error(`  ✗ Error migrating ${doc.id}:`, error)
    }
  }

  console.log(`  📊 Funding Allocations: ${stats.fundingAllocations.migrated}/${stats.fundingAllocations.total} migrated, ${stats.fundingAllocations.errors} errors`)
}

/**
 * Data Integrity Validation
 * Validates that equipment supplies reference valid inventory items
 */
async function validateDataIntegrity() {
  console.log('\n🔍 Validating Data Integrity...')

  // Get all inventory item IDs
  const inventorySnapshot = await db.collection('inventory').get()
  const inventoryIds = new Set(inventorySnapshot.docs.map(doc => doc.id))

  // Check all equipment supplies
  const equipmentSnapshot = await db.collection('equipment').get()
  const orphanedSupplies: Array<{ equipmentId: string; supplyId: string; inventoryItemId: string }> = []

  for (const doc of equipmentSnapshot.docs) {
    const equipment = doc.data()
    const supplies = equipment.supplies || []

    supplies.forEach((supply: any) => {
      if (!inventoryIds.has(supply.inventoryItemId)) {
        orphanedSupplies.push({
          equipmentId: doc.id,
          supplyId: supply.id,
          inventoryItemId: supply.inventoryItemId
        })
      }
    })
  }

  if (orphanedSupplies.length > 0) {
    console.log(`  ⚠️  Found ${orphanedSupplies.length} orphaned supplies (referencing non-existent inventory):`)
    orphanedSupplies.slice(0, 10).forEach(({ equipmentId, supplyId, inventoryItemId }) => {
      console.log(`     - Equipment ${equipmentId} / Supply ${supplyId} → Missing inventory ${inventoryItemId}`)
    })
    if (orphanedSupplies.length > 10) {
      console.log(`     ... and ${orphanedSupplies.length - 10} more`)
    }
  } else {
    console.log('  ✓ All equipment supplies reference valid inventory items')
  }
}

/**
 * Print Migration Summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes made)' : '✍️  LIVE (changes applied)'}`)
  console.log(`Target: ${targetCollection}`)
  console.log('')
  console.log('Equipment Supplies:')
  console.log(`  Total:    ${stats.equipment.total}`)
  console.log(`  Migrated: ${stats.equipment.migrated}`)
  console.log(`  Errors:   ${stats.equipment.errors}`)
  console.log('')
  console.log('Inventory Items:')
  console.log(`  Total:    ${stats.inventory.total}`)
  console.log(`  Updated:  ${stats.inventory.migrated}`)
  console.log(`  Errors:   ${stats.inventory.errors}`)
  console.log('')
  console.log('Funding Allocations:')
  console.log(`  Total:    ${stats.fundingAllocations.total}`)
  console.log(`  Migrated: ${stats.fundingAllocations.migrated}`)
  console.log(`  Errors:   ${stats.fundingAllocations.errors}`)
  console.log('')

  if (stats.errors.length > 0) {
    console.log('❌ Errors Encountered:')
    stats.errors.forEach(({ collection, docId, error }) => {
      console.log(`  - ${collection}/${docId}: ${error}`)
    })
  } else {
    console.log('✅ No errors encountered')
  }

  console.log('='.repeat(60))

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply these changes')
  } else {
    console.log('\n✅ Migration completed successfully!')
  }
}

/**
 * Main Migration Function
 */
async function runMigration() {
  console.log('🚀 Equipment & Inventory System Data Migration')
  console.log('='.repeat(60))
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Target Collections: ${targetCollection}`)
  console.log('='.repeat(60))

  try {
    // Run migrations based on target
    if (targetCollection === 'all' || targetCollection === 'equipment') {
      await migrateEquipmentSupplies()
    }

    if (targetCollection === 'all' || targetCollection === 'inventory') {
      await validateInventoryItems()
    }

    if (targetCollection === 'all' || targetCollection === 'fundingAllocations') {
      await migrateFundingAllocations()
    }

    // Always validate integrity
    await validateDataIntegrity()

    // Print summary
    printSummary()

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run migration
runMigration().catch(console.error)
