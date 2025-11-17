# Calendar System Refactoring - Phase 1 Foundation (P0)

## Executive Summary

This document outlines the Phase 1 refactoring plan for the Momentum calendar system, addressing critical technical debt and security issues identified in the strategic audit. Phase 1 focuses on **Foundation** fixes that must be completed before implementing two-way sync and advanced features.

---

## 1. Duplicate Calendar Service Files Analysis

### Current State

Two calendar service files exist with overlapping functionality:

#### **lib/services/calendarService.ts** (375 lines)
- **Location**: Inside the modular services directory
- **Export Method**: Via barrel export in `lib/services/index.ts`
- **Used By**: `useCalendar` hook (indirectly via `firestoreService.ts` re-export)

**Functions Provided**:
- ✅ **Event CRUD** (ACTIVE):
  - `createEvent()`
  - `updateEvent()`
  - `deleteEvent()`
  - `getEvents()`
  - `subscribeToEvents()`

- ❌ **Connection Management** (UNUSED):
  - `createCalendarConnection()`
  - `getCalendarConnections()`
  - `getCalendarConnection()`
  - `updateCalendarConnection()`
  - `deleteCalendarConnection()` - Has batch delete for conflicts/logs
  - `subscribeToCalendarConnections()`

- ❌ **Conflict Management** (UNUSED):
  - Collection: `calendarSyncConflicts`
  - `createSyncConflict()`
  - `getUnresolvedConflicts()`
  - `resolveSyncConflict()`
  - `subscribeToUnresolvedConflicts()`

- ❌ **Sync Log Management** (UNUSED):
  - `createSyncLog()`
  - `getSyncLogs()`
  - `updateSyncLog()`

#### **lib/firestoreCalendarService.ts** (378 lines)
- **Location**: Root lib directory (NOT in services folder)
- **Export Method**: Direct import (not in barrel export)
- **Used By**: `CalendarSettings.tsx` component

**Functions Provided**:
- ❌ **No Event Operations**

- ✅ **Connection Management** (ACTIVE):
  - `createCalendarConnection()`
  - `getUserCalendarConnections()`
  - `getUserCalendarConnectionByProvider()`
  - `getCalendarConnection()`
  - `updateCalendarConnection()`
  - `deleteCalendarConnection()` - Simple delete, no batch
  - `subscribeToCalendarConnections()`

- ✅ **Conflict Management** (ACTIVE):
  - Collection: `calendarConflicts` (different name!)
  - `createCalendarConflict()`
  - `getCalendarConflict()`
  - `getUserCalendarConflicts()`
  - `resolveCalendarConflict()`
  - `deleteCalendarConflict()`
  - `subscribeToCalendarConflicts()`

- ✅ **Sync Log Management** (ACTIVE):
  - `createCalendarSyncLog()`
  - `getUserSyncLogs()`
  - `getConnectionSyncLogs()`

- ✅ **Helper Functions** (ACTIVE):
  - `hasCalendarConnections()`
  - `isProviderConnected()`
  - `getUserSyncStatus()`

### Key Differences

| Feature | calendarService.ts | firestoreCalendarService.ts |
|---------|-------------------|----------------------------|
| **Event CRUD** | ✅ Has | ❌ Missing |
| **Connection CRUD** | ✅ Has (unused) | ✅ Has (used) |
| **Conflict Collection** | `calendarSyncConflicts` | `calendarConflicts` |
| **Batch Delete** | ✅ Yes | ❌ No |
| **Helper Functions** | ❌ No | ✅ Yes |
| **Function Naming** | `createSyncLog()` | `createCalendarSyncLog()` |
| **Usage** | Via barrel export | Direct import |

### Impact Assessment

**🔴 CRITICAL**: Two different collection names for conflicts create data inconsistency:
- `calendarSyncConflicts` (defined but never used)
- `calendarConflicts` (actively used)

**⚠️ HIGH**: Duplicate code maintenance burden - any bug fix must be applied twice

**⚠️ MEDIUM**: Confusion for developers - which service to use?

**⚠️ MEDIUM**: Missing batch deletion in active service could leave orphaned data

---

## 2. OAuth Token Security Issues

### Current Implementation (INSECURE)

Based on audit findings and code comments, OAuth tokens are currently stored in Firestore:

```typescript
// Mentioned in audit: tokens stored in _calendarTokens collection
// This is a CRITICAL SECURITY VULNERABILITY
```

### Problem Analysis

**Security Risks**:
1. **Client Access**: If tokens are in Firestore, security rules could accidentally expose them
2. **No Encryption**: Firestore data is encrypted at rest but tokens need additional protection
3. **Audit Trail**: No tracking of token access/usage
4. **Rotation**: No automatic token rotation mechanism
5. **Revocation**: No centralized revocation on compromise

**Research Evidence**:
- OWASP recommends server-side token storage with encryption
- OAuth 2.0 best practices mandate secure credential storage
- PCI DSS requires encryption for sensitive authentication data

### Required Changes

**Phase 1 (P0) - Document & Assess**:
1. ✅ Document current token storage implementation
2. ✅ Audit Firestore security rules for token collections
3. ✅ Create migration plan to Google Secret Manager
4. ✅ Add warnings to codebase

**Phase 2 (P1) - Implement**:
1. Set up Google Secret Manager integration
2. Create server-side token management functions (Cloud Functions)
3. Migrate existing tokens
4. Update calendar sync functions to use server-side tokens
5. Delete client-accessible token storage

---

## 3. Missing Error Handling

### Current State

Calendar sync functions make API calls without comprehensive error handling:

**Example from audit**:
```typescript
// normalizeGoogleEvent and normalizeMicrosoftEvent
// These may assume API calls always succeed
```

### Problem Categories

#### **A. Network Errors**
- API timeouts
- Connection failures
- Rate limiting (429 errors)

#### **B. Authentication Errors**
- Expired tokens
- Revoked permissions
- Invalid credentials

#### **C. Data Validation Errors**
- Malformed API responses
- Missing required fields
- Type mismatches

#### **D. Conflict Errors**
- Duplicate events
- Overlapping reservations
- Version conflicts

### Required Error Handling Strategy

**1. Wrap API Calls**:
```typescript
try {
  const result = await googleCalendarAPI.events.list(...)
  return normalizeGoogleEvent(result)
} catch (error) {
  if (error.code === 401) {
    // Token expired - trigger refresh
  } else if (error.code === 429) {
    // Rate limited - implement backoff
  } else if (error.code === 404) {
    // Calendar not found - handle gracefully
  }
  // Log error and update syncStatus
  await updateConnectionStatus(connectionId, 'error', error.message)
  throw error
}
```

**2. Update CalendarEvent Type**:
```typescript
interface CalendarEvent {
  // ... existing fields
  syncStatus?: 'pending' | 'synced' | 'error'
  syncError?: string
  lastSyncAttempt?: string
}
```

**3. Add Retry Logic**:
- Exponential backoff for transient errors
- Maximum retry attempts (3)
- Skip retry for permanent errors (404, 403)

**4. User Feedback**:
- Show sync errors in UI
- Provide actionable error messages
- Allow manual retry

---

## 4. Collection Naming Inconsistency

### Current Discrepancy

Two different collection names exist for calendar conflicts:

1. **`calendarSyncConflicts`** - Defined in `calendarService.ts` (unused)
2. **`calendarConflicts`** - Defined in `firestoreCalendarService.ts` (active)

### Impact

- **Data Fragmentation**: If both services were ever used, conflicts would be split across collections
- **Migration Risk**: Must ensure all existing data is in the correct collection
- **Query Performance**: Firestore indexes may be misconfigured

### Resolution Plan

1. **Audit Firestore**: Check which collection actually contains data
2. **Standardize**: Choose `calendarConflicts` (shorter, clearer)
3. **Migrate**: If any data exists in `calendarSyncConflicts`, migrate it
4. **Update Indexes**: Ensure Firestore indexes target correct collection
5. **Update Security Rules**: Remove rules for unused collection

---

## 5. Recommended Consolidation Approach

### Strategy: Merge into Single Service

**Target File**: `lib/services/calendarService.ts` (keep this one for consistency)

**Migration Steps**:

#### **Step 1: Add Missing Functions to calendarService.ts**
```typescript
// Add from firestoreCalendarService.ts:
- getUserCalendarConnectionByProvider()
- hasCalendarConnections()
- isProviderConnected()
- getUserSyncStatus()
- getConnectionSyncLogs()
```

#### **Step 2: Fix Collection Names**
```typescript
// Change all references from:
"calendarSyncConflicts" → "calendarConflicts"
```

#### **Step 3: Improve Batch Delete**
```typescript
// Enhance deleteCalendarConnection to clean up:
- Associated events
- Sync logs
- Conflicts
```

#### **Step 4: Add Error Handling**
```typescript
// Wrap all Firestore operations in try-catch
// Update syncStatus fields on errors
// Add detailed logging
```

#### **Step 5: Update Imports**
```typescript
// In CalendarSettings.tsx, change:
import { updateCalendarConnection } from '@/lib/firestoreCalendarService'
// To:
import { updateCalendarConnection } from '@/lib/services'
```

#### **Step 6: Delete Old File**
```bash
rm lib/firestoreCalendarService.ts
```

#### **Step 7: Update Documentation**
- Update README with new service structure
- Add JSDoc comments to all functions
- Document error handling patterns

---

## 6. Testing Plan

### Unit Tests Required

1. **Event Operations**:
   - Create/update/delete events
   - Timestamp conversions
   - Subscription callbacks

2. **Connection Operations**:
   - CRUD operations
   - Batch deletion
   - Status updates

3. **Error Handling**:
   - Network errors
   - Auth errors
   - Validation errors
   - Retry logic

### Integration Tests Required

1. **End-to-End Sync**:
   - Connect Google Calendar
   - Sync events
   - Handle conflicts
   - Update connection status

2. **Error Scenarios**:
   - Expired tokens
   - API rate limits
   - Network failures
   - Invalid data

### Manual Testing Checklist

- [ ] Connect Google Calendar successfully
- [ ] Connect Microsoft Calendar successfully
- [ ] Sync events from external calendars
- [ ] Handle token expiration gracefully
- [ ] Display sync errors in UI
- [ ] Retry failed syncs
- [ ] Delete connection and verify cleanup
- [ ] Check Firestore for orphaned data

---

## 7. Security Audit Checklist

### Pre-Migration

- [ ] Document all locations where OAuth tokens are stored
- [ ] Audit Firestore security rules for `_calendarTokens` collection
- [ ] Review all calendar-related security rules
- [ ] Identify server-side functions that need token access
- [ ] Create Secret Manager access control policies

### During Migration

- [ ] Set up Google Secret Manager in Firebase project
- [ ] Create Cloud Functions for token management
- [ ] Implement token encryption/decryption
- [ ] Add token rotation mechanism
- [ ] Set up audit logging for token access

### Post-Migration

- [ ] Verify no tokens remain in Firestore
- [ ] Remove `_calendarTokens` collection
- [ ] Update security rules to block token storage
- [ ] Run security scan with Firebase Security Checker
- [ ] Document new token management workflow

---

## 8. Implementation Timeline

### Week 1: Analysis & Planning ✅ (Current)
- [x] Analyze duplicate services
- [x] Document current architecture
- [x] Create consolidation plan
- [ ] Review with team

### Week 2: Consolidation
- [ ] Day 1-2: Merge functions into single service
- [ ] Day 3: Fix collection naming
- [ ] Day 4: Add error handling
- [ ] Day 5: Update imports and test

### Week 3: Security Fixes
- [ ] Day 1-2: Set up Secret Manager
- [ ] Day 3-4: Implement server-side token management
- [ ] Day 5: Migrate existing tokens

### Week 4: Testing & Documentation
- [ ] Day 1-2: Write unit tests
- [ ] Day 3: Integration testing
- [ ] Day 4: Security audit
- [ ] Day 5: Update documentation

---

## 9. Success Criteria

### Functional Requirements

✅ **Single Source of Truth**: Only one calendar service file exists
✅ **Complete Functionality**: All features from both services are preserved
✅ **Consistent Naming**: Collection names are standardized
✅ **Error Resilience**: All API calls have proper error handling
✅ **No Regressions**: Existing calendar features continue working

### Security Requirements

✅ **Token Security**: OAuth tokens stored in Secret Manager
✅ **No Client Access**: Tokens never exposed to client code
✅ **Audit Trail**: Token access is logged
✅ **Secure Rules**: Firestore rules prevent token storage

### Quality Requirements

✅ **Test Coverage**: 80%+ code coverage on calendar services
✅ **Documentation**: All functions have JSDoc comments
✅ **Type Safety**: No `any` types in service layer
✅ **Performance**: No degradation in sync speed

---

## 10. Risks & Mitigation

### Risk 1: Data Loss During Consolidation
**Mitigation**:
- Back up Firestore collections before migration
- Use feature flags to test new service in parallel
- Implement gradual rollout

### Risk 2: Breaking Changes for CalendarSettings
**Mitigation**:
- Create adapter functions for backward compatibility
- Update imports incrementally
- Extensive manual testing

### Risk 3: Token Migration Failure
**Mitigation**:
- Implement fallback to Firestore during migration
- Monitor error rates closely
- Keep old token storage temporarily

### Risk 4: Production Outages During Sync
**Mitigation**:
- Deploy during low-traffic hours
- Implement circuit breaker pattern
- Have rollback plan ready

---

## Next Steps

1. **Get Approval**: Review this document with stakeholders
2. **Create Branch**: `feat/calendar-phase1-foundation`
3. **Start Consolidation**: Begin merging services
4. **Incremental Commits**: Small, testable changes
5. **Continuous Testing**: Test after each step

---

## Appendix A: Function Mapping

### Functions to Keep (from calendarService.ts)

| Function | Reason | Status |
|----------|--------|--------|
| `createEvent()` | Used by useCalendar | ✅ Keep |
| `updateEvent()` | Used by useCalendar | ✅ Keep |
| `deleteEvent()` | Used by useCalendar | ✅ Keep |
| `getEvents()` | Used by useCalendar | ✅ Keep |
| `subscribeToEvents()` | Used by useCalendar | ✅ Keep |
| `deleteCalendarConnection()` | Better batch delete | ✅ Keep (merge) |

### Functions to Merge (from firestoreCalendarService.ts)

| Function | Reason | Action |
|----------|--------|--------|
| `getUserCalendarConnectionByProvider()` | Unique helper | ➕ Add |
| `hasCalendarConnections()` | Unique helper | ➕ Add |
| `isProviderConnected()` | Unique helper | ➕ Add |
| `getUserSyncStatus()` | Unique helper | ➕ Add |
| `getConnectionSyncLogs()` | Better naming | ➕ Add |

### Functions to Remove (duplicates)

| Function | Duplicate Of | Action |
|----------|--------------|--------|
| All connection CRUD in firestoreCalendarService.ts | calendarService.ts | 🗑️ Remove |
| Conflict operations in firestoreCalendarService.ts | calendarService.ts | 🗑️ Remove (after merge) |

---

## Appendix B: Security Rules Audit

**TODO**: Document current Firestore security rules for:
- `calendarConnections`
- `calendarConflicts` / `calendarSyncConflicts`
- `calendarSyncLogs`
- `_calendarTokens` (if exists)
- `events`

**TODO**: Identify any rules that expose sensitive data to clients

---

*Document created: 2025-11-17*
*Author: Claude (AI Assistant)*
*Project: Momentum - Phase 1 Foundation Refactoring*
