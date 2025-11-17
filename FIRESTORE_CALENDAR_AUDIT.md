# Firestore Calendar Collections Audit

**Date**: 2025-11-17
**Auditor**: Claude (AI Assistant)
**Purpose**: Audit calendar-related Firestore collections for data consistency, security, and migration readiness

---

## Executive Summary

### Critical Findings

🔴 **CRITICAL**: Duplicate security rule definitions found in `firestore.rules`
🟡 **WARNING**: Collection naming inconsistency between old and new rules
🟢 **SECURE**: `_calendarTokens` properly protected from client access

### Immediate Actions Required

1. **Remove duplicate security rules** (lines 34-94 in firestore.rules)
2. **Verify data location** - Check if data exists in `calendarSyncConflicts` (old) vs `calendarConflicts` (new)
3. **Update security rules** to remove deprecated collections
4. **Deploy updated rules** after verification

---

## 1. Security Rules Analysis

### 1.1 Duplicate Rules Found

The `firestore.rules` file contains **TWO complete sets** of calendar collection rules:

#### **Set 1: OLD (Lines 34-94) - DEPRECATED**

```javascript
// Lines 34-48: calendarConnections (first definition)
match /calendarConnections/{connectionId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}

// Lines 53-71: calendarSyncConflicts (WRONG COLLECTION NAME)
match /calendarSyncConflicts/{conflictId} {
  function ownsConnection(connectionId) {
    let connection = get(/databases/$(database)/documents/calendarConnections/$(connectionId));
    return connection != null && connection.data != null && connection.data.userId == request.auth.uid;
  }

  allow read: if isAuthenticated() && ownsConnection(resource.data.connectionId);
  allow create: if isAuthenticated() && ownsConnection(request.resource.data.connectionId);
  allow update: if isAuthenticated() && ownsConnection(resource.data.connectionId);
  allow delete: if isAuthenticated() && ownsConnection(resource.data.connectionId);
}

// Lines 76-94: calendarSyncLogs (first definition - too permissive)
match /calendarSyncLogs/{logId} {
  function ownsConnectionLog(connectionId) {
    let connection = get(/databases/$(database)/documents/calendarConnections/$(connectionId));
    return connection != null && connection.data != null && connection.data.userId == request.auth.uid;
  }

  allow read: if isAuthenticated() && ownsConnectionLog(resource.data.connectionId);
  allow create: if isAuthenticated(); // Too permissive!
  allow update: if isAuthenticated(); // Too permissive!
  allow delete: if isAuthenticated() && ownsConnectionLog(resource.data.connectionId);
}
```

#### **Set 2: NEW (Lines 660-715) - ACTIVE**

```javascript
// Lines 660-674: calendarConnections (DUPLICATE - this one takes precedence)
match /calendarConnections/{connectionId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}

// Lines 678-688: calendarSyncLogs (CORRECT - more restrictive)
match /calendarSyncLogs/{logId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if false; // Only Cloud Functions can create
  allow update, delete: if false; // Immutable logs
}

// Lines 692-705: calendarConflicts (CORRECT COLLECTION NAME)
match /calendarConflicts/{conflictId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if false; // Only Cloud Functions can create
  allow delete: if false; // No deletion allowed
}

// Lines 712-715: _calendarTokens (SECURE)
match /_calendarTokens/{tokenId} {
  allow read, write: if false; // No client access - CORRECT!
}
```

### 1.2 Impact of Duplicate Rules

**Firestore Security Rules Behavior**:
- When multiple `match` statements exist for the same path, **the last one wins**
- This means the NEW rules (lines 660-715) override the OLD rules (lines 34-94)

**Active Collections** (based on winning rules):
- ✅ `calendarConnections` - Active (duplicate rules, but identical)
- ✅ `calendarConflicts` - Active (correct name)
- ✅ `calendarSyncLogs` - Active (more restrictive = better)
- ✅ `_calendarTokens` - Active (properly secured)

**Deprecated Collections** (defined but overridden):
- ❌ `calendarSyncConflicts` - Rules exist but are OVERRIDDEN

### 1.3 Security Implications

#### **Good News**:
1. **Token Protection**: `_calendarTokens` properly blocks all client access (line 714)
2. **Stricter Logs**: New `calendarSyncLogs` rules are immutable (no client updates)
3. **Correct Collection**: `calendarConflicts` is the active collection (matches code)

#### **Concerns**:
1. **Confusing**: Duplicate rules make it unclear which collection is active
2. **Maintenance Risk**: Future changes might update wrong rule section
3. **Migration Risk**: Old `calendarSyncConflicts` collection might have data

---

## 2. Collection Status Summary

### 2.1 Calendar Collections Expected

Based on code analysis (`lib/services/calendarService.ts`), the following collections should exist:

| Collection | Purpose | Used By | Status |
|------------|---------|---------|--------|
| `events` | Calendar events (internal + external) | calendarService.ts | ✅ Active |
| `calendarConnections` | OAuth connections to external calendars | calendarService.ts | ✅ Active |
| `calendarConflicts` | Two-way sync conflicts | calendarService.ts | ✅ Active |
| `calendarSyncLogs` | Sync operation logs | calendarService.ts | ✅ Active |
| `_calendarTokens` | OAuth access/refresh tokens | Cloud Functions | ⚠️ Exists (needs migration) |

### 2.2 Orphaned Collections Risk

The following collection was defined in old security rules but is NOT used in current code:

| Collection | Defined Where | Used? | Action Required |
|------------|---------------|-------|-----------------|
| `calendarSyncConflicts` | firestore.rules:53-71 | ❌ No | Check for data, migrate if found |

---

## 3. Code vs. Security Rules Alignment

### 3.1 calendarService.ts References

Checked all collection references in `lib/services/calendarService.ts`:

```typescript
// Line 80, 97, 103: events collection ✅
collection(db, "events")

// Line 129, 147, 159, 174, 198, 253: calendarConnections ✅
collection(db, "calendarConnections")

// Line 203, 283, 301, 314, 330, 347, 363, 376, 403: calendarConflicts ✅
collection(db, "calendarConflicts")

// Line 214, 432, 452, 470, 484, 503: calendarSyncLogs ✅
collection(db, "calendarSyncLogs")
```

**Result**: All code references match the NEW security rules (lines 660-715). No references to `calendarSyncConflicts` found.

### 3.2 Cloud Functions References

From `firebase/functions/src/calendar-sync.ts`:

```typescript
// Lines 163-165: Token access
admin.firestore().collection("_calendarTokens").doc(connectionId).get()

// Lines 227-230: Token updates
admin.firestore().collection("_calendarTokens").doc(connectionId).update(...)
```

**Result**: Cloud Functions access `_calendarTokens` directly (bypassing client rules). This is correct and necessary.

---

## 4. Data Verification Checklist

### 4.1 Collections to Audit

To complete this audit, we need to check actual Firestore data:

#### **Priority 1: Check for orphaned data**
- [ ] Query `calendarSyncConflicts` collection - does it have any documents?
- [ ] If yes, migrate data to `calendarConflicts`
- [ ] If no, remove security rules

#### **Priority 2: Verify active collections**
- [ ] Count documents in `calendarConnections`
- [ ] Count documents in `calendarConflicts`
- [ ] Count documents in `calendarSyncLogs`
- [ ] Count documents in `events` with `calendarConnectionId` field

#### **Priority 3: Token storage audit**
- [ ] Count documents in `_calendarTokens`
- [ ] Verify token structure matches expected schema
- [ ] Identify connections that need migration to Secret Manager

### 4.2 Audit Script Required

**Recommended**: Create a Cloud Function to audit collections (client cannot access `_calendarTokens`)

```typescript
// firebase/functions/src/audit-calendar-collections.ts
import * as admin from "firebase-admin"

export async function auditCalendarCollections(): Promise<{
  events: number
  calendarConnections: number
  calendarConflicts: number
  calendarSyncConflicts: number // Check for orphaned data
  calendarSyncLogs: number
  _calendarTokens: number
  findings: string[]
}> {
  const db = admin.firestore()
  const findings: string[] = []

  // Count documents in each collection
  const eventsCount = (await db.collection("events").count().get()).data().count
  const connectionsCount = (await db.collection("calendarConnections").count().get()).data().count
  const conflictsCount = (await db.collection("calendarConflicts").count().get()).data().count
  const oldConflictsCount = (await db.collection("calendarSyncConflicts").count().get()).data().count
  const logsCount = (await db.collection("calendarSyncLogs").count().get()).data().count
  const tokensCount = (await db.collection("_calendarTokens").count().get()).data().count

  // Check for orphaned data
  if (oldConflictsCount > 0) {
    findings.push(`⚠️ ORPHANED DATA: ${oldConflictsCount} documents in deprecated 'calendarSyncConflicts' collection`)
  }

  // Check token count matches connections
  if (tokensCount !== connectionsCount) {
    findings.push(`⚠️ MISMATCH: ${connectionsCount} connections but ${tokensCount} tokens`)
  }

  // Check for events without connections (should not happen)
  const externalEvents = await db.collection("events")
    .where("isReadOnly", "==", true)
    .count()
    .get()

  if (externalEvents.data().count > 0 && connectionsCount === 0) {
    findings.push(`⚠️ ORPHANED EVENTS: ${externalEvents.data().count} external events but no connections`)
  }

  return {
    events: eventsCount,
    calendarConnections: connectionsCount,
    calendarConflicts: conflictsCount,
    calendarSyncConflicts: oldConflictsCount,
    calendarSyncLogs: logsCount,
    _calendarTokens: tokensCount,
    findings,
  }
}
```

**Usage**:
```bash
# Deploy function
firebase deploy --only functions:auditCalendarCollections

# Call via Firebase CLI
firebase functions:call auditCalendarCollections
```

---

## 5. Recommended Security Rules Cleanup

### 5.1 Current State (firestore.rules)

**Problem**: Lines 34-94 contain deprecated rules that are confusing and serve no purpose

### 5.2 Proposed Fix

**Action**: Remove lines 34-94 from `firestore.rules`

**Before** (755 lines with duplicates):
```javascript
// Lines 34-94: OLD CALENDAR RULES (REMOVE THESE)
match /calendarConnections/{connectionId} { ... }
match /calendarSyncConflicts/{conflictId} { ... }
match /calendarSyncLogs/{logId} { ... }

// ... other rules ...

// Lines 660-715: NEW CALENDAR RULES (KEEP THESE)
match /calendarConnections/{connectionId} { ... }
match /calendarSyncLogs/{logId} { ... }
match /calendarConflicts/{conflictId} { ... }
match /_calendarTokens/{tokenId} { ... }
```

**After** (694 lines, cleaner):
```javascript
// Lines 34+: Keep all non-calendar rules

// Lines 660-715: CALENDAR RULES (only these remain)
match /calendarConnections/{connectionId} { ... }
match /calendarSyncLogs/{logId} { ... }
match /calendarConflicts/{conflictId} { ... }
match /_calendarTokens/{tokenId} { ... }
```

### 5.3 Migration Checklist

Before removing old rules:
- [ ] Run audit script to check for data in `calendarSyncConflicts`
- [ ] If data found, migrate to `calendarConflicts`
- [ ] Test new rules in Firebase emulator
- [ ] Deploy updated rules to production
- [ ] Monitor error logs for 24 hours

---

## 6. Token Storage Assessment

### 6.1 Current Implementation

**Collection**: `_calendarTokens`
**Security**: ✅ Properly secured (no client access)
**Location**: Firestore (should be Secret Manager)

**Schema** (from cloud functions analysis):
```typescript
interface StoredToken {
  accessToken: string       // Short-lived (1 hour)
  refreshToken: string      // Long-lived (indefinite)
  expiresAt: number        // Timestamp
  provider: 'google' | 'microsoft'
  createdAt: string
  updatedAt: string
}
```

### 6.2 Security Risks

**Risk Level**: 🟡 MEDIUM

**Why Medium (not High)**:
1. ✅ Client access is blocked by security rules
2. ✅ Firestore encryption at rest
3. ✅ Only Cloud Functions can access
4. ❌ No additional encryption layer
5. ❌ No audit logging of token access
6. ❌ No automatic rotation

**Compliance Impact**:
- **GDPR**: Requires encryption of sensitive data (currently basic)
- **SOC 2**: Requires audit trail (missing)
- **HIPAA**: Requires additional encryption (if health data involved)

### 6.3 Migration Priority

**Phase 1 (P0)**: ✅ Document current implementation (DONE)
**Phase 2 (P1)**: Migrate to Google Secret Manager (NEXT)

---

## 7. Firestore Indexes Required

### 7.1 Expected Composite Indexes

Based on query patterns in `calendarService.ts`:

#### **Index 1: calendarConnections by userId**
```javascript
// Query at line 147-149
query(
  collection(db, "calendarConnections"),
  where("userId", "==", userId)
)
```
**Index**: `calendarConnections` on `userId` (ascending)
**Status**: Single-field index, auto-created ✅

#### **Index 2: calendarConnections by userId and provider**
```javascript
// Query at line 527-530
query(
  collection(db, "calendarConnections"),
  where("userId", "==", userId),
  where("provider", "==", provider)
)
```
**Index**: `calendarConnections` on `userId` (asc) + `provider` (asc)
**Status**: Composite index required ⚠️

#### **Index 3: calendarConflicts by connectionId and resolved**
```javascript
// Query at line 314-317
query(
  collection(db, "calendarConflicts"),
  where("connectionId", "==", connectionId),
  where("resolved", "==", false)
)
```
**Index**: `calendarConflicts` on `connectionId` (asc) + `resolved` (asc)
**Status**: Composite index required ⚠️

#### **Index 4: calendarConflicts by userId and resolved**
```javascript
// Query at line 330-333
query(
  collection(db, "calendarConflicts"),
  where("userId", "==", userId),
  where("resolved", "==", false)
)
```
**Index**: `calendarConflicts` on `userId` (asc) + `resolved` (asc)
**Status**: Composite index required ⚠️

#### **Index 5: calendarSyncLogs by connectionId ordered by syncStartedAt**
```javascript
// Query at line 452-455
query(
  collection(db, "calendarSyncLogs"),
  where("connectionId", "==", connectionId),
  orderBy("syncStartedAt", "desc")
)
```
**Index**: `calendarSyncLogs` on `connectionId` (asc) + `syncStartedAt` (desc)
**Status**: Composite index required ⚠️

#### **Index 6: calendarSyncLogs by userId ordered by syncStartedAt**
```javascript
// Query at line 503-506
query(
  collection(db, "calendarSyncLogs"),
  where("userId", "==", userId),
  orderBy("syncStartedAt", "desc")
)
```
**Index**: `calendarSyncLogs` on `userId` (asc) + `syncStartedAt` (desc)
**Status**: Composite index required ⚠️

#### **Index 7: events by calendarConnectionId and isReadOnly**
```javascript
// Query at line 226-229 (deleteCalendarConnection)
query(
  collection(db, "events"),
  where("calendarConnectionId", "==", connectionId),
  where("isReadOnly", "==", true)
)
```
**Index**: `events` on `calendarConnectionId` (asc) + `isReadOnly` (asc)
**Status**: Composite index required ⚠️

### 7.2 Index Creation Commands

**Option 1: Auto-create via Firebase Console**
- Run queries in production
- Firebase will suggest indexes
- Click "Create Index" in error messages

**Option 2: Define in firestore.indexes.json**

Check if `firestore.indexes.json` exists and add:

```json
{
  "indexes": [
    {
      "collectionGroup": "calendarConnections",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "provider", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "calendarConflicts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "connectionId", "order": "ASCENDING" },
        { "fieldPath": "resolved", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "calendarConflicts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "resolved", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "calendarSyncLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "connectionId", "order": "ASCENDING" },
        { "fieldPath": "syncStartedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "calendarSyncLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "syncStartedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "calendarConnectionId", "order": "ASCENDING" },
        { "fieldPath": "isReadOnly", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Deployment**:
```bash
firebase deploy --only firestore:indexes
```

---

## 8. Action Items

### 8.1 Immediate (This Week)

- [ ] **Create audit Cloud Function** to check for orphaned data
- [ ] **Run audit** to verify collection status
- [ ] **Check firestore.indexes.json** and add missing indexes
- [ ] **Document findings** from audit in this file

### 8.2 Short-term (Next Week)

- [ ] **Remove duplicate security rules** (lines 34-94 in firestore.rules)
- [ ] **Migrate orphaned data** if found in `calendarSyncConflicts`
- [ ] **Deploy updated security rules**
- [ ] **Deploy Firestore indexes**
- [ ] **Test calendar sync** after rule changes

### 8.3 Medium-term (Phase 2)

- [ ] **Migrate tokens** from `_calendarTokens` to Secret Manager
- [ ] **Update Cloud Functions** to use Secret Manager
- [ ] **Delete `_calendarTokens` collection** after migration
- [ ] **Update security rules** to remove `_calendarTokens` match block

---

## 9. Testing Strategy

### 9.1 Security Rules Testing

**Before deploying rule changes**:

```bash
# Start Firebase emulator
firebase emulators:start

# Run security rules tests
npm run test:firestore-rules
```

**Test Cases Required**:
1. ✅ User can read their own `calendarConnections`
2. ❌ User cannot read another user's `calendarConnections`
3. ✅ User can create `calendarConnection` for themselves
4. ❌ User cannot create `calendarConnection` for another user
5. ❌ User cannot create `calendarConflicts` (only Cloud Functions)
6. ❌ User cannot create `calendarSyncLogs` (only Cloud Functions)
7. ❌ User cannot read `_calendarTokens` (no client access)
8. ✅ Cloud Functions can access `_calendarTokens`

### 9.2 Index Performance Testing

**After deploying indexes**:

1. Measure query performance for:
   - `getCalendarConnections(userId)`
   - `getUnresolvedConflicts(connectionId)`
   - `getSyncLogs(connectionId, limit)`

2. Expected performance:
   - Single-document reads: < 10ms
   - Multi-document queries: < 50ms for 100 documents

---

## 10. Appendix

### A. Collection Schema Definitions

#### events
```typescript
{
  id: string
  title: string
  start: Timestamp
  end: Timestamp
  ownerId?: string
  relatedIds?: { projectId?, workpackageId?, taskId?, deliverableId? }
  type?: string
  notes?: string
  createdBy: string
  createdAt: Timestamp

  // External calendar fields
  calendarConnectionId?: string
  isReadOnly?: boolean
  externalId?: string
  externalCalendarId?: string
}
```

#### calendarConnections
```typescript
{
  id: string
  userId: string
  provider: 'google' | 'microsoft'
  email: string
  calendarId: string
  calendarName: string
  status: 'active' | 'error' | 'disconnected'
  lastSyncedAt?: string
  lastError?: string
  syncDirection: 'one-way' | 'two-way'
  createdAt: string
  updatedAt?: string
}
```

#### calendarConflicts
```typescript
{
  id: string
  connectionId: string
  userId: string
  eventId: string
  conflictType: 'duplicate' | 'time-overlap' | 'deleted-externally' | 'modified-both'
  momentumEvent: CalendarEvent
  externalEvent: any
  detectedAt: string
  resolved: boolean
  resolvedAt?: string
  resolution?: 'keep_momentum' | 'keep_external' | 'merge' | 'manual'
  resolvedBy?: string
}
```

#### calendarSyncLogs
```typescript
{
  id: string
  connectionId: string
  userId: string
  syncStartedAt: string
  syncCompletedAt?: string
  status: 'in_progress' | 'completed' | 'failed'
  eventsImported: number
  eventsUpdated: number
  eventsDeleted: number
  conflictsDetected: number
  error?: string
}
```

#### _calendarTokens (to be migrated)
```typescript
{
  accessToken: string
  refreshToken: string
  expiresAt: number
  provider: 'google' | 'microsoft'
  createdAt: string
  updatedAt: string
}
```

---

**Next Steps**: Create and run audit Cloud Function to verify actual data in Firestore collections.

---

*Document created: 2025-11-17*
*Last updated: 2025-11-17*
*Related: CALENDAR_REFACTORING_PHASE1.md, OAUTH_TOKEN_SECURITY_ASSESSMENT.md*
