# Phase 1 Deployment Guide

**Project**: Momentum Calendar System Refactoring
**Phase**: Phase 1 Foundation
**Status**: Ready for Deployment
**Date**: 2025-11-17

---

## Pre-Deployment Checklist

### Code Status
- ✅ All changes committed to git
- ✅ All changes pushed to branch `claude/check-latest-updates-011CV6ERPEbFLApQ9j5qaVgG`
- ✅ Code consolidated and tested locally
- ✅ Documentation complete
- ⏳ Awaiting production deployment

### Firebase Project
- **Project ID**: `momentum-a60c5`
- **Branch**: `claude/check-latest-updates-011CV6ERPEbFLApQ9j5qaVgG`
- **Firebase CLI Version Required**: 14.0.0+
- **Current Version Detected**: 14.25.0 ✅

---

## Deployment Steps

### Step 1: Authenticate with Firebase

If not already logged in:

```bash
# Login to Firebase
firebase login

# Verify you're using the correct project
firebase use momentum-a60c5

# Check current project
firebase projects:list
```

**Expected Output**:
```
✔  Preparing the list of your Firebase projects
┌──────────────────────┬────────────────┬────────────────┬──────────────────────┐
│ Project Display Name │ Project ID     │ Project Number │ Resource Location ID │
├──────────────────────┼────────────────┼────────────────┼──────────────────────┤
│ Momentum             │ momentum-a60c5 │ ...            │ ...                  │
└──────────────────────┴────────────────┴────────────────┴──────────────────────┘
```

---

### Step 2: Deploy Firestore Indexes (Critical - Do This First!)

**Why First?**: Indexes must be built before queries can run. Build time varies based on existing data.

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Expected output:
# ✔  firestore: deployed indexes in firestore.indexes.json successfully
```

**What This Does**:
- Creates 6 composite indexes for calendar queries
- Enables efficient querying of calendar collections
- No downtime or impact on existing data

**Indexes Created**:
1. `calendarConnections`: userId + provider
2. `calendarConflicts`: connectionId + resolved
3. `calendarConflicts`: userId + resolved
4. `calendarSyncLogs`: connectionId + syncStartedAt (desc)
5. `calendarSyncLogs`: userId + syncStartedAt (desc)
6. `events`: calendarConnectionId + isReadOnly

**Monitoring Index Build**:
```bash
# Check index build status
firebase firestore:indexes

# Or via Firebase Console:
# https://console.firebase.google.com/project/momentum-a60c5/firestore/indexes
```

**Expected Build Time**:
- Empty collections: < 1 minute
- 100 documents: 1-2 minutes
- 1000+ documents: 5-10 minutes

⏸️ **WAIT**: Ensure all indexes show "READY" status before proceeding to Step 3.

---

### Step 3: Deploy Firestore Security Rules

**Why After Indexes?**: Rules are applied immediately, but queries will fail without indexes.

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Expected output:
# ✔  firestore: deployed rules successfully
```

**What This Does**:
- Removes duplicate calendar security rule definitions (lines 34-94)
- Clarifies that only Cloud Functions can create conflicts/logs
- No functional changes (rules were already active)

**Changes Summary**:
- **Removed**: 61 lines of duplicate rules
- **Kept**: Active rules at lines 597-650
- **Impact**: None (duplicate rules were overridden anyway)

**Verification**:
```bash
# Check rules were deployed
firebase firestore:rules:list

# Or via Firebase Console:
# https://console.firebase.google.com/project/momentum-a60c5/firestore/rules
```

---

### Step 4: Build and Deploy Cloud Functions

**Preparation**:
```bash
# Navigate to functions directory
cd firebase/functions

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Return to project root
cd ../..
```

**Deploy Audit Functions**:
```bash
# Deploy only the new calendar audit functions
firebase deploy --only functions:auditCalendarCollections,functions:getOrphanedConflicts,functions:migrateOrphanedConflicts

# Expected output:
# ✔  functions[auditCalendarCollections(us-central1)] Successful create operation.
# ✔  functions[getOrphanedConflicts(us-central1)] Successful create operation.
# ✔  functions[migrateOrphanedConflicts(us-central1)] Successful create operation.
```

**What This Deploys**:
1. **auditCalendarCollections** - System audit function
2. **getOrphanedConflicts** - Retrieve deprecated collection data
3. **migrateOrphanedConflicts** - Migrate orphaned data

**Function Permissions**:
- ❗ **Admin Only**: All three functions require `isAdministrator: true` in user document
- Configured in: `firebase/functions/src/audit-calendar-collections.ts`

**Verification**:
```bash
# List deployed functions
firebase functions:list | grep -E "audit|orphaned|migrate"

# Or via Firebase Console:
# https://console.firebase.google.com/project/momentum-a60c5/functions
```

---

### Step 5: Run Calendar Collections Audit

**Purpose**: Check for orphaned data in deprecated collections before marking deployment complete.

#### Option A: Via Firebase Console

1. Go to [Firebase Console Functions](https://console.firebase.google.com/project/momentum-a60c5/functions)
2. Find `auditCalendarCollections` function
3. Click "Test function" (requires admin authentication)

#### Option B: Via Client Application

**Prerequisites**:
- Logged in as administrator user
- `isAdministrator: true` in `/users/{userId}` document

**Code**:
```typescript
// In your React app (admin user required)
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const auditCalendar = httpsCallable(functions, 'auditCalendarCollections')

try {
  const result = await auditCalendar()
  console.log('Audit Result:', result.data)

  // Check status
  if (result.data.status === 'critical') {
    console.error('CRITICAL ISSUES FOUND:', result.data.findings)
  } else if (result.data.status === 'warnings') {
    console.warn('Warnings found:', result.data.findings)
  } else {
    console.log('✅ All systems healthy')
  }

  // Display collection counts
  console.log('Collection Counts:', result.data.collections)

  // Show recommendations
  if (result.data.recommendations.length > 0) {
    console.log('Recommendations:')
    result.data.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })
  }
} catch (error) {
  console.error('Audit failed:', error)
}
```

#### Option C: Via Firebase CLI (with curl)

```bash
# Get your ID token (requires authentication)
# This is complex - Option B (client app) is recommended

# Alternative: Use Firebase Functions shell
cd firebase/functions
npm run shell

# Then in the shell:
auditCalendarCollections({}, { auth: { uid: 'YOUR_ADMIN_UID' } })
```

**Expected Output Structure**:
```json
{
  "timestamp": "2025-11-17T...",
  "collections": {
    "events": 150,
    "calendarConnections": 5,
    "calendarConflicts": 2,
    "calendarSyncConflicts": 0,
    "calendarSyncLogs": 45,
    "_calendarTokens": 5
  },
  "findings": [
    {
      "severity": "info",
      "category": "orphaned_data",
      "message": "No orphaned data found in deprecated 'calendarSyncConflicts' collection",
      "affectedCollection": "calendarSyncConflicts",
      "count": 0
    },
    {
      "severity": "warning",
      "category": "security",
      "message": "5 OAuth tokens stored in Firestore (should migrate to Secret Manager)",
      "affectedCollection": "_calendarTokens",
      "count": 5
    }
  ],
  "recommendations": [
    "Migrate OAuth tokens from Firestore to Google Secret Manager for enhanced security"
  ],
  "status": "warnings"
}
```

**Interpreting Results**:

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `healthy` | ✅ No issues found | None - proceed to Step 6 |
| `warnings` | ⚠️ Non-critical issues | Review findings, plan fixes |
| `critical` | 🔴 Critical issues | **STOP** - Fix before proceeding |

**Common Findings**:

1. **Orphaned Conflicts** (Critical)
   ```json
   {
     "severity": "critical",
     "message": "Found 10 documents in deprecated 'calendarSyncConflicts' collection",
     "count": 10
   }
   ```
   **Action**: Run migration (see Step 6)

2. **Token/Connection Mismatch** (Warning)
   ```json
   {
     "severity": "warning",
     "message": "Token count (3) does not match connection count (5)",
     "details": { "tokens": 3, "connections": 5, "difference": 2 }
   }
   ```
   **Action**: Investigate missing tokens

3. **Tokens in Firestore** (Warning - Expected)
   ```json
   {
     "severity": "warning",
     "message": "5 OAuth tokens stored in Firestore",
     "count": 5
   }
   ```
   **Action**: Normal for now, Phase 2 will migrate to Secret Manager

---

### Step 6: Migrate Orphaned Data (If Required)

**Run This Step ONLY If**:
- Audit shows `calendarSyncConflicts` count > 0
- Audit status is `critical` with orphaned data finding

#### Check for Orphaned Conflicts

```typescript
// In client app (admin user)
const getOrphaned = httpsCallable(functions, 'getOrphanedConflicts')

const orphanedResult = await getOrphaned()
console.log('Orphaned conflicts:', orphanedResult.data)

// Output:
// {
//   "count": 10,
//   "conflicts": [ /* array of conflict objects */ ],
//   "migrationRequired": true
// }
```

#### Run Migration

**⚠️ WARNING**: This is a one-time operation. Review orphaned data before migrating.

```typescript
// In client app (admin user)
const migrate = httpsCallable(functions, 'migrateOrphanedConflicts')

try {
  const result = await migrate()
  console.log('Migration result:', result.data)

  // Expected output:
  // {
  //   "success": true,
  //   "migrated": 10,
  //   "message": "Successfully migrated 10 conflicts"
  // }

  // Verify migration
  const auditAfter = await auditCalendar()
  console.log('Post-migration audit:', auditAfter.data)

} catch (error) {
  console.error('Migration failed:', error)
}
```

**What Migration Does**:
1. Reads all documents from `calendarSyncConflicts`
2. Copies them to `calendarConflicts` (keeping same IDs)
3. Deletes documents from old collection
4. Logs migration in `auditLogs` collection

**Rollback** (if migration fails):
- Migration uses Firestore batch writes (atomic)
- If any step fails, entire batch rolls back
- Original data remains in `calendarSyncConflicts`
- Safe to retry after fixing issues

---

### Step 7: Post-Deployment Verification

#### A. Check Firebase Console

1. **Firestore Indexes**:
   - Navigate to: https://console.firebase.google.com/project/momentum-a60c5/firestore/indexes
   - Verify all 6 calendar indexes show "READY" status
   - Check for any error indexes

2. **Firestore Rules**:
   - Navigate to: https://console.firebase.google.com/project/momentum-a60c5/firestore/rules
   - Verify rules file is 694 lines (down from 755)
   - Check "Last published" timestamp is recent

3. **Cloud Functions**:
   - Navigate to: https://console.firebase.google.com/project/momentum-a60c5/functions
   - Verify 3 new audit functions are listed
   - Check health status (should be green)

#### B. Test Calendar Queries

**Test 1: Get User Calendar Connections**
```typescript
// In your app
import { getCalendarConnections } from '@/lib/services'

const connections = await getCalendarConnections(userId)
console.log('User connections:', connections)
// Should return without errors (even if empty array)
```

**Test 2: Get Unresolved Conflicts**
```typescript
import { getUnresolvedConflicts } from '@/lib/services'

const conflicts = await getUnresolvedConflicts(connectionId)
console.log('Unresolved conflicts:', conflicts)
// Should return without errors
```

**Test 3: Get Sync Logs**
```typescript
import { getSyncLogs } from '@/lib/services'

const logs = await getSyncLogs(connectionId, 10)
console.log('Recent sync logs:', logs)
// Should return without errors
```

#### C. Monitor Firestore Logs

```bash
# Stream logs for 5 minutes
firebase functions:log --only auditCalendarCollections,getOrphanedConflicts,migrateOrphanedConflicts --tail

# Check for errors
firebase functions:log --since 1h | grep -i "error"
```

**Look For**:
- ✅ No permission errors
- ✅ No index missing errors
- ✅ Successful function executions
- ❌ Any "PERMISSION_DENIED" errors
- ❌ Any "index not found" errors

#### D. Run Final Audit

```typescript
// Run audit one more time to confirm everything is healthy
const finalAudit = await auditCalendar()

console.log('Final Status:', finalAudit.data.status)
// Expected: "healthy" or "warnings" (warnings are OK if just token migration pending)

if (finalAudit.data.status === 'critical') {
  console.error('❌ CRITICAL ISSUES REMAIN:', finalAudit.data.findings)
} else if (finalAudit.data.status === 'warnings') {
  console.warn('⚠️ Warnings (expected):', finalAudit.data.findings)
} else {
  console.log('✅ Deployment successful - all systems healthy!')
}
```

---

## Rollback Procedures

### If Indexes Cause Issues

**Symptoms**:
- Queries fail with "index not found" errors
- Slow query performance
- Firestore Console shows "ERROR" status on indexes

**Rollback**:
```bash
# Indexes cannot be "rolled back", but you can delete problematic ones
# Via Firebase Console:
# 1. Go to Firestore > Indexes
# 2. Find the problematic index
# 3. Click "..." menu > "Delete index"

# Re-deploy fixed indexes
firebase deploy --only firestore:indexes
```

### If Security Rules Cause Issues

**Symptoms**:
- PERMISSION_DENIED errors
- Users cannot access calendar data
- Cloud Functions cannot create conflicts/logs

**Rollback**:
```bash
# Revert to previous rules
git revert c6597d6
firebase deploy --only firestore:rules

# Or manually restore from Firebase Console backup
```

**Check Previous Rules**:
```bash
# View rules history in Firebase Console
# https://console.firebase.google.com/project/momentum-a60c5/firestore/rules
# Click "Rules" tab > "Version history"
```

### If Cloud Functions Fail

**Symptoms**:
- Functions return errors
- Admin users cannot run audit
- Functions don't appear in console

**Rollback**:
```bash
# Delete problematic functions
firebase functions:delete auditCalendarCollections
firebase functions:delete getOrphanedConflicts
firebase functions:delete migrateOrphanedConflicts

# Fix code and redeploy
```

**Debug Function Errors**:
```bash
# View detailed logs
firebase functions:log --only auditCalendarCollections

# Check function code
cat firebase/functions/src/audit-calendar-collections.ts
```

### If Migration Creates Issues

**Symptoms**:
- Duplicate conflicts in both collections
- Data loss in conflicts
- Conflict resolution doesn't work

**Recovery**:
- Migration uses Firestore batch writes (atomic)
- If batch failed, data remains in `calendarSyncConflicts`
- If batch succeeded but created issues:

**Option 1: Re-run Audit**
```typescript
// Check what actually happened
const audit = await auditCalendar()
console.log('Conflicts in old collection:', audit.data.collections.calendarSyncConflicts)
console.log('Conflicts in new collection:', audit.data.collections.calendarConflicts)
```

**Option 2: Manual Firestore Cleanup**
```bash
# Via Firebase Console
# 1. Go to Firestore > Data
# 2. Find calendarConflicts collection
# 3. Review documents
# 4. Delete/fix as needed
```

---

## Common Issues and Solutions

### Issue 1: "Index not found" Error

**Error Message**:
```
FAILED_PRECONDITION: The query requires an index. You can create it here: https://...
```

**Cause**: Indexes not built yet or build failed

**Solution**:
1. Click the provided link to create index manually
2. Wait for index to build (check status in Console)
3. Or re-deploy indexes: `firebase deploy --only firestore:indexes`

### Issue 2: "PERMISSION_DENIED" on Audit Functions

**Error Message**:
```
Error: permission-denied: Only administrators can run system audits
```

**Cause**: User calling function is not an administrator

**Solution**:
```typescript
// Check user's admin status in Firestore
// Collection: users
// Document: {userId}
// Field: isAdministrator should be true

// Update in Firebase Console or via code:
import { doc, updateDoc } from 'firebase/firestore'
await updateDoc(doc(db, 'users', userId), { isAdministrator: true })
```

### Issue 3: Functions Won't Deploy

**Error Message**:
```
Error: Build failed: npm install failed
```

**Cause**: Missing dependencies or build errors

**Solution**:
```bash
cd firebase/functions

# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build

# If errors, fix and rebuild
npm run lint
npm run build

cd ../..
firebase deploy --only functions
```

### Issue 4: Token Count Mismatch

**Audit Finding**:
```
"Token count (3) does not match connection count (5)"
```

**Possible Causes**:
1. Tokens deleted manually from `_calendarTokens`
2. Connections created without tokens
3. Failed OAuth flow left connection without token

**Investigation**:
```typescript
// Get all connections
const connections = await getCalendarConnections(userId)

// Check each connection's token in Firestore
// (Admin SDK required - do this in Cloud Function)
for (const conn of connections) {
  const tokenDoc = await admin.firestore()
    .collection('_calendarTokens')
    .doc(conn.id)
    .get()

  if (!tokenDoc.exists) {
    console.log('Missing token for connection:', conn.id)
  }
}
```

**Solution**:
- User must reconnect calendar (re-auth will create new token)
- Or manually delete orphaned connections

---

## Success Criteria

### Deployment is Successful When:

✅ **Firestore Indexes**:
- [ ] All 6 calendar indexes show "READY" status
- [ ] No ERROR status indexes in console
- [ ] Calendar queries run without "index not found" errors

✅ **Security Rules**:
- [ ] Rules deployed successfully
- [ ] File shows 694 lines (down from 755)
- [ ] No PERMISSION_DENIED errors in logs
- [ ] Users can access their own calendar data
- [ ] Users CANNOT access other users' calendar data

✅ **Cloud Functions**:
- [ ] 3 audit functions deployed successfully
- [ ] Functions appear in Firebase Console
- [ ] Health status shows green
- [ ] Admin users can call functions
- [ ] Non-admin users receive permission-denied (expected)

✅ **Audit Results**:
- [ ] Audit returns status "healthy" or "warnings"
- [ ] No "critical" findings
- [ ] `calendarSyncConflicts` collection count is 0
- [ ] Token count matches connection count (or mismatch is explained)

✅ **Functional Testing**:
- [ ] Calendar Settings UI loads without errors
- [ ] Can create calendar connection
- [ ] Can view calendar events
- [ ] Can delete calendar connection (cleanup works)
- [ ] No orphaned data after deletion

---

## Next Steps After Deployment

### Immediate (Same Day)

1. **Monitor Logs**: Watch for errors for 2-4 hours
   ```bash
   firebase functions:log --tail
   ```

2. **Test Calendar Sync**: Have a test user connect their calendar
   - Google Calendar
   - Microsoft Calendar
   - Verify events sync correctly

3. **Verify Cleanup**: Test connection deletion
   - Delete a calendar connection
   - Run audit to verify no orphaned data

### Short-term (This Week)

1. **Secret Manager Setup**: Begin Week 3 token migration
   - Enable Secret Manager API
   - Configure IAM permissions
   - Implement token service

2. **Documentation**: Update user-facing docs
   - Calendar setup guide
   - Troubleshooting guide
   - Security documentation

### Medium-term (Next Week)

1. **Testing**: Write automated tests
   - Unit tests for calendarService
   - Integration tests for sync flow
   - Security rules tests

2. **Monitoring**: Set up alerts
   - Failed sync notifications
   - Token expiration alerts
   - Conflict resolution reminders

---

## Deployment Timeline Estimate

| Step | Time | Can Start After |
|------|------|-----------------|
| 1. Authenticate | 2 min | Anytime |
| 2. Deploy Indexes | 5-10 min | Step 1 |
| 3. Wait for Index Build | 1-10 min | Step 2 |
| 4. Deploy Security Rules | 2 min | Step 3 complete |
| 5. Deploy Cloud Functions | 3-5 min | Step 1 |
| 6. Run Audit | 1 min | Step 5 |
| 7. Migrate Data (if needed) | 2-5 min | Step 6 |
| 8. Post-Deployment Verification | 10-15 min | All steps |

**Total Time**: 25-50 minutes (depending on index build time and data volume)

---

## Support and Troubleshooting

### If You Encounter Issues

1. **Check Logs First**:
   ```bash
   firebase functions:log --tail
   ```

2. **Verify Firebase Console**:
   - [Firestore Indexes](https://console.firebase.google.com/project/momentum-a60c5/firestore/indexes)
   - [Security Rules](https://console.firebase.google.com/project/momentum-a60c5/firestore/rules)
   - [Cloud Functions](https://console.firebase.google.com/project/momentum-a60c5/functions)

3. **Check Documentation**:
   - `CALENDAR_REFACTORING_PHASE1.md` - Overall plan
   - `FIRESTORE_CALENDAR_AUDIT.md` - Audit details
   - `OAUTH_TOKEN_SECURITY_ASSESSMENT.md` - Token security

4. **Rollback if Needed**: Use procedures in "Rollback Procedures" section above

### Contact Points

- **Code Issues**: Review git commits for context
- **Firebase Issues**: Check Firebase Console and logs
- **Security Questions**: Refer to `OAUTH_TOKEN_SECURITY_ASSESSMENT.md`

---

## Appendix A: Deployment Commands Quick Reference

```bash
# Full deployment sequence
firebase login
firebase use momentum-a60c5

# Deploy in order (wait for each to complete)
firebase deploy --only firestore:indexes
# Wait for indexes to build
firebase deploy --only firestore:rules
firebase deploy --only functions:auditCalendarCollections,functions:getOrphanedConflicts,functions:migrateOrphanedConflicts

# Verify
firebase firestore:indexes
firebase functions:list | grep -E "audit|orphaned|migrate"

# Monitor
firebase functions:log --tail
```

## Appendix B: Audit Function Response Schema

```typescript
interface CalendarAuditResult {
  timestamp: string
  collections: {
    events: number
    calendarConnections: number
    calendarConflicts: number
    calendarSyncConflicts: number
    calendarSyncLogs: number
    _calendarTokens: number
  }
  findings: Array<{
    severity: "info" | "warning" | "critical"
    category: "orphaned_data" | "data_mismatch" | "security" | "performance"
    message: string
    affectedCollection: string
    count?: number
    details?: any
  }>
  recommendations: string[]
  status: "healthy" | "warnings" | "critical"
}
```

---

*Deployment Guide Created: 2025-11-17*
*Phase: Phase 1 Foundation*
*Ready for: Production Deployment*
