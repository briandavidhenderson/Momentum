# Critical Deployment Fix Checklist

**Date**: 2025-11-16
**Status**: ⚠️ FIXES READY - NEEDS DEPLOYMENT

## Issues Reported

1. ✅ **FIXED**: ORCID linking 500 error
2. ✅ **FIXED**: Missing Firestore indexes (notifications, dataExportRequests)
3. ✅ **FIXED**: Onboarding profile completion bug
4. ⚠️ **INVESTIGATE**: Duplicate users in backend
5. ⚠️ **INVESTIGATE**: Network visualization error (missing firstName, lastName)
6. ⚠️ **INFO**: Auth 400 errors (likely due to email not verified)

---

## ⚠️ IMPORTANT: You Haven't Deployed Recent Fixes!

You mentioned: **"I have not merged the most recent branches"**

This means you're still running **OLD CODE** with all the bugs. The fixes are ready in this branch but not deployed yet!

### What's Already Fixed (but not deployed):

| Fix | Commit | Status |
|-----|--------|--------|
| ORCID 500 error | 8e1def4 | ✅ Ready (Cloud Functions) |
| Profile labId validation | 8e1def4 | ✅ Ready (Frontend) |
| Onboarding callback timing | fb8ce66 | ✅ Ready (Frontend) |
| ORCID data parsing | e4721c2 | ✅ Ready (Cloud Functions) |
| Firestore indexes | THIS COMMIT | ✅ Ready (Firestore) |

---

## Deployment Steps

### Step 1: Deploy Firestore Indexes

```bash
cd /home/user/Momentum
firebase deploy --only firestore:indexes
```

**What this fixes**:
- ❌ Error: "The query requires an index" for notifications
- ❌ Error: "The query requires an index" for privacy board (dataExportRequests)

**Expected output**:
```
✔ firestore: deployed indexes in firestore.indexes.json successfully
```

---

### Step 2: Deploy Cloud Functions

```bash
cd /home/user/Momentum
firebase deploy --only functions
```

**What this fixes**:
- ❌ ORCID linking 500 error (firebase/functions/src/index.ts:683)
  - Changed from `update()` to `set({...}, { merge: true })`
  - Now safely creates or updates profile even if document doesn't exist

**Affected functions**:
- `orcidLinkAccount` - Links ORCID to user profile
- `orcidResyncProfile` - Refreshes ORCID data
- `syncOrderBudgets` - Updates budgets when orders received
- `notifyFundingEvents` - Sends budget alerts
- And 17 other functions

**Expected duration**: 2-3 minutes

---

### Step 3: Deploy Hosting (Frontend)

```bash
cd /home/user/Momentum
npm run build && firebase deploy --only hosting
```

**What this fixes**:
- ❌ Onboarding crash after profile creation (OnboardingFlow.tsx:636-645)
  - Removed setTimeout delay on onComplete callback
  - Fixed profile recognition issue
- ❌ Better labId error messages (useOptimisticDayToDayTasks.ts:117-124)
- ✅ All recent bug fixes and improvements

**Expected duration**: 1-2 minutes (build) + 30 seconds (deploy)

---

### Step 4: Run Profile Validation Script

**IMPORTANT**: Only run this AFTER deploying all fixes above!

```bash
# Download Firebase Admin service account key from Firebase Console
# Project Settings → Service Accounts → Generate New Private Key

# Option A: Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Option B: Place file in project root
mv ~/Downloads/momentum-a60c5-firebase-adminsdk-*.json ./momentum-a60c5-firebase-adminsdk-7fwnw-5a5a10f3e1.json

# Run validation script
npx tsx scripts/validate-profiles.ts
```

**What this fixes**:
- ❌ "No funding account appeared for my orders"
- ❌ "Profile missing labId" errors
- ❌ Missing organisationId and instituteId
- ❌ User/profile sync issues

---

## Issue Analysis

### 1. ORCID Linking 500 Error ✅ FIXED

**Root Cause**: Cloud Function used `update()` which fails if document doesn't exist

**Error in logs**:
```
POST https://us-central1-momentum-a60c5.cloudfunctions.net/orcidLinkAccount 500
[ERROR] ORCID linking error FirebaseError: Failed to link ORCID account
```

**Fix**: `firebase/functions/src/index.ts:683`
```typescript
// BEFORE:
await admin.firestore().collection("personProfiles").doc(profileId).update(firestoreUpdate)

// AFTER:
await admin.firestore().collection("personProfiles").doc(profileId).set(firestoreUpdate, { merge: true })
```

**Status**: ✅ Fixed in commit 8e1def4, **NEEDS DEPLOYMENT**

---

### 2. Missing Firestore Indexes ✅ FIXED

**Error 1 - Notifications**:
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/momentum-a60c5/firestore/indexes?create_composite=...
```

**Error 2 - Privacy Board (dataExportRequests)**:
```
[ERROR] Error loading privacy data FirebaseError: The query requires an index.
```

**Fix**: Added to `firestore.indexes.json`
```json
{
  "collectionGroup": "notifications",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "dataExportRequests",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "requestedAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
}
```

**Status**: ✅ Fixed in THIS COMMIT, **NEEDS DEPLOYMENT**

---

### 3. Onboarding Profile Not Recognized ✅ FIXED

**Error**: After creating account, home page crashed. On subsequent login, user lands on onboarding page.

**Root Cause**: `setTimeout(1500ms)` delay before calling `onComplete` callback
- If browser closed or navigation occurred during delay, callback never fired
- App state never updated even though profile was created in Firestore

**Fix**: `components/OnboardingFlow.tsx:636-645`
```typescript
// BEFORE:
setTimeout(() => {
  onComplete({ ...profileData, id: profileId } as PersonProfile)
}, 1500)

// AFTER:
onComplete({ ...profileData, id: profileId } as PersonProfile)
setCurrentStep("complete")
setLoading(false)
```

**Status**: ✅ Fixed in commit fb8ce66, **NEEDS DEPLOYMENT**

---

### 4. Duplicate Users ⚠️ INVESTIGATE

**Reported**: "Creating a user creates two identical users in the backend"

**Analysis**:
- `AuthPage.tsx:79` calls `createUser(user.uid, email, fullName)` once
- `createUser` uses `setDoc(userRef, {...})` with uid as document ID
- This should NOT create duplicates (setDoc overwrites if exists)

**Possible causes**:
1. **Two documents in `personProfiles`** instead of `users`?
   - Onboarding flow only calls `createProfile` once (line 550)
   - Should not create duplicates
2. **One in Firebase Auth, one in Firestore `users`**?
   - This is **NORMAL** - separate systems
   - Firebase Auth = authentication
   - Firestore users collection = app user data
3. **Audit logs showing multiple entries**?
   - `logUserLogin` Cloud Function logs to `auditLogs` collection (audit.ts:102)
   - This is for audit trail, not duplicate users

**Action Required**: Please clarify:
- Which collection has duplicates? (`users` or `personProfiles`?)
- Same `id` or different `id`?
- Screenshot of duplicates in Firebase Console?

**Status**: ⚠️ **NEEDS MORE INFO**

---

### 5. Network Visualization Error ⚠️ INFO

**Error**:
```
[ERROR] No valid profiles found for network visualization - need at minimum: firstName, lastName
```

**Root Cause**: Profiles missing `firstName` or `lastName` fields

**Why**:
- Onboarding bug (fixed in commit fb8ce66) may have created incomplete profiles
- Validation script will fix missing fields

**Fix**: Run profile validation script (see Step 4 above)

**Status**: ⚠️ **WILL BE FIXED** after running validation script

---

### 6. Auth 400 Errors ℹ️ EXPECTED

**Errors**:
```
identitytoolkit.googleapis.com/v1/accounts:lookup?key=... 400
identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=... 400
[ERROR] Authentication error FirebaseError: Firebase: Error (auth/invalid-credential)
```

**Possible causes**:
1. **Email not verified** (most likely)
   - User signed up but didn't verify email
   - Firebase blocks login until email is verified
   - `AuthPage.tsx:54-60` checks for email verification

2. **Wrong password or email**
   - User entered incorrect credentials
   - Firebase returns `auth/invalid-credential`

3. **User deleted but trying to log in**
   - Firebase Auth account was deleted
   - Firestore user document still exists

**Action**: Have user:
1. Check email inbox for verification link
2. Verify email address
3. Try logging in again with correct credentials

**Status**: ℹ️ **NOT A BUG** - Expected behavior for unverified email or wrong credentials

---

## Testing Checklist (After Deployment)

### Test 1: ORCID Linking
- [ ] Go to Profile page
- [ ] Click "Link ORCID"
- [ ] Complete OAuth flow
- [ ] Verify ORCID data appears in profile
- [ ] Should NOT get 500 error

### Test 2: Notifications
- [ ] Create a new order
- [ ] Move order to "received"
- [ ] Click "Notifications" bell icon
- [ ] Should load without index error

### Test 3: Privacy Board
- [ ] Click "Privacy" in sidebar
- [ ] Should load without index error
- [ ] Should show GDPR controls

### Test 4: Onboarding
- [ ] Create new test account
- [ ] Complete onboarding flow
- [ ] Should land on home page (not onboarding)
- [ ] Profile should be recognized immediately

### Test 5: Funding Accounts
- [ ] After running validation script
- [ ] Have users log out and back in
- [ ] Click "Orders" → "New Order"
- [ ] Funding account dropdown should have options

---

## Post-Deployment Actions

### 1. Monitor Cloud Functions Logs

```bash
# Check for ORCID errors
firebase functions:log --only orcidLinkAccount

# Check for budget sync errors
firebase functions:log --only syncOrderBudgets

# Check for notification errors
firebase functions:log --only notifyFundingEvents
```

### 2. Verify Firestore Indexes

```bash
# List all indexes
firebase firestore:indexes

# Should show:
# - notifications (userId, createdAt, __name__)
# - dataExportRequests (userId, requestedAt, __name__)
```

### 3. Check for Errors in Browser Console

After deployment, have users:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log out and back in
3. Navigate through all major features
4. Report any new errors in console

---

## Rollback Plan (If Issues)

### If Cloud Functions fail:

```bash
# List recent deployments
firebase functions:log

# Rollback to previous version (if needed)
# Unfortunately Firebase doesn't have built-in rollback
# You would need to:
# 1. git revert to previous commit
# 2. Redeploy
```

### If Hosting fails:

```bash
# List hosting versions
firebase hosting:channel:list

# Deploy previous version
git checkout <previous-commit>
npm run build && firebase deploy --only hosting
```

### If Firestore indexes fail:

```bash
# Delete problematic index via Firebase Console
# Then fix firestore.indexes.json and redeploy
```

---

## Summary

**Critical fixes ready for deployment**:
1. ✅ ORCID 500 error fix (Cloud Functions)
2. ✅ Firestore indexes (dataExportRequests, notifications)
3. ✅ Onboarding callback timing (Frontend)
4. ✅ Profile validation script (ready to run)

**Deployment order**:
1. Firestore indexes (30 seconds)
2. Cloud Functions (2-3 minutes)
3. Hosting (2-3 minutes)
4. Run validation script (1 minute)

**Total estimated time**: ~10 minutes

**After deployment**:
- ORCID linking will work
- Notifications and Privacy board will load
- Onboarding will complete correctly
- Funding accounts will appear (after validation script)

---

## Questions/Clarifications Needed

1. **Duplicate users**: Please provide screenshot or details:
   - Which collection? (users or personProfiles)
   - Same ID or different ID?
   - Firebase Console screenshot?

2. **Email verification**: Are users verifying their emails before logging in?

3. **Merge strategy**: Do you want to merge this branch to main before deploying?

