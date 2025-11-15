# Equipment & Inventory System Data Migration

This directory contains migration scripts for updating existing Firestore data to match the new centralized data structure implemented in the Equipment & Inventory System Integration.

## Overview

The Equipment & Inventory System Integration (28-task refactoring project) introduced several breaking changes to the data model:

### Phase 1: Data Model Centralization
- **InventoryItem** is now the single source of truth for quantities and prices
- **EquipmentSupply** stores only device-specific settings (minQty, burnPerWeek, chargeToProjectId)
- Removed duplicate fields: `qty`, `productName`, `catNum`, `price` from EquipmentSupply

### Phase 3: Enhanced Budget Tracking
- **FundingAllocation** now tracks real-time budget status
- New fields: `remainingBudget`, `currentSpent`, `currentCommitted`
- New field: `lowBalanceWarningThreshold` (percentage for notifications)

## Migration Script

### Prerequisites

1. **Firebase Admin SDK Service Account Key**

   Download from Firebase Console → Project Settings → Service Accounts

   Place in project root as `service-account-key.json` OR set environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
   ```

2. **Dependencies**
   ```bash
   npm install firebase-admin ts-node
   ```

### Usage

#### Dry Run (Preview Changes)
```bash
npx ts-node scripts/migrate-equipment-inventory.ts --dry-run
```

#### Migrate All Collections
```bash
npx ts-node scripts/migrate-equipment-inventory.ts
```

#### Migrate Specific Collection
```bash
# Equipment only
npx ts-node scripts/migrate-equipment-inventory.ts --collection=equipment

# Inventory only
npx ts-node scripts/migrate-equipment-inventory.ts --collection=inventory

# Funding allocations only
npx ts-node scripts/migrate-equipment-inventory.ts --collection=fundingAllocations
```

## What the Migration Does

### 1. Equipment Supplies (Phase 1)

**Before:**
```json
{
  "id": "device-1",
  "name": "PCR Machine",
  "supplies": [
    {
      "id": "supply-1",
      "inventoryItemId": "inv-123",
      "qty": 50,                    // ❌ DUPLICATE
      "productName": "Taq Mix",     // ❌ DUPLICATE
      "catNum": "TM-001",           // ❌ DUPLICATE
      "price": 100,                 // ❌ DUPLICATE
      "minQty": 10,                 // ✅ Device-specific
      "burnPerWeek": 5              // ✅ Device-specific
    }
  ]
}
```

**After:**
```json
{
  "id": "device-1",
  "name": "PCR Machine",
  "supplies": [
    {
      "id": "supply-1",
      "inventoryItemId": "inv-123",  // ✅ Reference to single source of truth
      "minQty": 10,                  // ✅ Device-specific
      "burnPerWeek": 5,              // ✅ Device-specific
      "chargeToProjectId": "proj-1"  // ✅ Device-specific
    }
  ]
}
```

Quantities, names, and prices are fetched from the referenced InventoryItem at runtime using `enrichSupply()`.

### 2. Inventory Items (Phase 1)

Validates and adds missing fields:

**Before:**
```json
{
  "id": "inv-123",
  "productName": "Taq Mix",
  "catNum": "TM-001",
  "currentQuantity": 50,
  "priceExVAT": 100
}
```

**After:**
```json
{
  "id": "inv-123",
  "productName": "Taq Mix",
  "catNum": "TM-001",
  "currentQuantity": 50,
  "minQuantity": 10,              // ✅ Added if missing
  "priceExVAT": 100,
  "inventoryLevel": "medium",     // ✅ Calculated automatically
  "updatedAt": "2025-01-15"
}
```

### 3. Funding Allocations (Phase 3)

**Before:**
```json
{
  "id": "alloc-1",
  "type": "PERSON",
  "personId": "person-123",
  "allocatedAmount": 10000,
  "currency": "EUR"
}
```

**After:**
```json
{
  "id": "alloc-1",
  "type": "PERSON",
  "personId": "person-123",
  "allocatedAmount": 10000,
  "currentSpent": 0,                     // ✅ Real-time tracking
  "currentCommitted": 0,                 // ✅ Orders not yet fulfilled
  "remainingBudget": 10000,              // ✅ Calculated automatically
  "lowBalanceWarningThreshold": 25,     // ✅ Notification trigger (25%)
  "currency": "EUR"
}
```

### 4. Data Integrity Validation

The script validates that all equipment supplies reference valid inventory items and reports any orphaned references.

## Migration Output

Example output:
```
🚀 Equipment & Inventory System Data Migration
============================================================
Mode: DRY RUN
Target Collections: all
============================================================

📦 Migrating Equipment Supplies (Phase 1)...
  ✓ Cleaning device-1: Removed duplicate fields from 3 supplies
  ✓ Cleaning device-2: Removed duplicate fields from 2 supplies
  📊 Equipment: 2/5 migrated, 0 errors

📋 Validating Inventory Items...
  ℹ inv-123: Calculated inventoryLevel = medium
  ℹ inv-456: Adding missing minQuantity
  📊 Inventory: 2/15 updated, 0 errors

💰 Migrating Funding Allocations (Phase 3)...
  ✓ alloc-1: Calculated remainingBudget = 8500
  ℹ alloc-2: Initialized currentSpent = 0
  📊 Funding Allocations: 2/8 migrated, 0 errors

🔍 Validating Data Integrity...
  ✓ All equipment supplies reference valid inventory items

============================================================
📊 MIGRATION SUMMARY
============================================================
Mode: 🔍 DRY RUN (no changes made)
Target: all

Equipment Supplies:
  Total:    5
  Migrated: 2
  Errors:   0

Inventory Items:
  Total:    15
  Updated:  2
  Errors:   0

Funding Allocations:
  Total:    8
  Migrated: 2
  Errors:   0

✅ No errors encountered
============================================================

💡 Run without --dry-run to apply these changes
```

## Rollback Strategy

While this migration is designed to be non-destructive (it only removes redundant data that exists elsewhere), you should:

1. **Backup your database** before running the migration:
   ```bash
   gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d)
   ```

2. **Run with `--dry-run` first** to preview changes

3. **Test on a staging environment** before production

## Post-Migration Verification

After running the migration, verify:

1. **Equipment supplies no longer have duplicate fields:**
   ```javascript
   db.collection('equipment').get().then(snapshot => {
     snapshot.forEach(doc => {
       const supplies = doc.data().supplies || []
       const hasDuplicates = supplies.some(s => s.qty || s.productName || s.price)
       if (hasDuplicates) console.warn('❌ Still has duplicates:', doc.id)
     })
   })
   ```

2. **All inventory items have inventoryLevel:**
   ```javascript
   db.collection('inventory').get().then(snapshot => {
     snapshot.forEach(doc => {
       if (!doc.data().inventoryLevel) {
         console.warn('❌ Missing inventoryLevel:', doc.id)
       }
     })
   })
   ```

3. **All funding allocations have budget tracking:**
   ```javascript
   db.collection('fundingAllocations').get().then(snapshot => {
     snapshot.forEach(doc => {
       const data = doc.data()
       if (data.remainingBudget === undefined) {
         console.warn('❌ Missing remainingBudget:', doc.id)
       }
     })
   })
   ```

## Troubleshooting

### "Service account key not found"
- Ensure `service-account-key.json` exists in project root OR
- Set `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

### "Permission denied"
- Verify service account has Firestore read/write permissions
- Check Firebase IAM settings

### "Orphaned supplies found"
- These are equipment supplies referencing non-existent inventory items
- Fix by either:
  - Creating the missing inventory items, or
  - Removing the orphaned supplies from equipment documents

## Related Documentation

- **Integration Plan**: `/docs/INTEGRATION_PLAN.md` (if created)
- **Security Rules**: `/firestore.rules` - Updated notification rules
- **Type Definitions**: `/lib/types.ts` - Updated InventoryItem and FundingAllocation types
- **Utility Functions**: `/lib/supplyUtils.ts` - enrichSupply() and related functions

## Support

For issues or questions:
1. Check test suite: `npm test` - 70 integration tests cover the new system
2. Review commit history for Equipment & Inventory System Integration (Tasks 1-28)
3. Contact the development team

---

**Part of Equipment & Inventory System Integration - Task 28/28**
