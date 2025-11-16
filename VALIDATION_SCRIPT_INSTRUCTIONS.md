# Profile Validation Script - Quick Start Guide

## What This Script Does

The `scripts/validate-profiles.ts` script fixes profiles with missing data:
- ✅ Missing `labId` (required for funding and tasks)
- ✅ Missing `organisationId`
- ✅ Missing `instituteId`
- ✅ User/profile sync issues

## Why You Need This

**Current Issue**: "no funding account appeared for my orders"

**Root Cause**: The `useFunding` hook requires `labId` to load funding accounts. If your profile is missing `labId`, the funding accounts list will be empty.

```typescript
// lib/hooks/useFunding.ts:67-71
if (!labId) {
  setFundingAccounts([])  // Empty!
  setFundingAccountsLoading(false)
  return
}
```

## Step-by-Step Instructions

### Step 1: Get Firebase Admin Service Account Key

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **momentum-a60c5**
3. Click the gear icon (⚙️) → **Project Settings**
4. Navigate to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** in the confirmation dialog
7. Save the downloaded JSON file

### Step 2: Place the Key File

**Option A**: Place in project root (recommended for quick testing)
```bash
# Move the downloaded file to your project root
mv ~/Downloads/momentum-a60c5-firebase-adminsdk-*.json ./momentum-a60c5-firebase-adminsdk-7fwnw-5a5a10f3e1.json
```

**Option B**: Set environment variable (recommended for security)
```bash
# Keep the key file outside your project
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/to/service-account-key.json"
```

### Step 3: Run the Script

```bash
# Install tsx if you don't have it
npm install -g tsx

# Run the validation script
npx tsx scripts/validate-profiles.ts
```

### Step 4: Review the Output

The script will show detailed progress:

```
Starting profile validation...

Found 12 profiles

Checking profile: abc123
  Name: John Doe
  Email: john@example.com
  ✓ Has labId: lab_xyz789

Checking profile: def456
  Name: Jane Smith
  Email: jane@example.com
  ⚠️  Missing labId, has legacy lab field: Henderson Lab
  ✓ Found lab ID: lab_xyz789
  ✓ Updated profile with fixes

...

============================================================
Validation Complete
============================================================
Total profiles: 12
Valid profiles: 8
Fixed profiles: 4
Errors: 0
```

### Step 5: Have Users Refresh Their Sessions

After running the script, users need to log out and back in to refresh their profile data:

1. Click "Sign Out"
2. Sign back in
3. Funding accounts should now appear in order dialogs
4. Day-to-day tasks should now work

## Troubleshooting

### Error: "Failed to initialize Firebase Admin SDK"

**Cause**: Can't find service account key file

**Solution**:
```bash
# Check if file exists
ls -la momentum-a60c5-firebase-adminsdk-7fwnw-5a5a10f3e1.json

# OR set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
echo $GOOGLE_APPLICATION_CREDENTIALS  # Verify it's set
```

### Error: "Permission denied"

**Cause**: Service account doesn't have Firestore permissions

**Solution**:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Verify the service account has "Firebase Admin SDK Administrator" role
3. If not, go to Google Cloud Console → IAM & Admin → IAM
4. Add "Cloud Datastore User" role to the service account

### Error: "Lab not found"

**Cause**: Profile has legacy `lab` field but lab doesn't exist in `labs` collection

**Solution**:
1. Manually create the lab in your database
2. OR manually update the profile's `labId` field

**Example**:
```typescript
// In Firebase Console → Firestore
// Create new document in 'labs' collection:
{
  id: "lab_123",
  name: "Henderson Lab",
  instituteId: "inst_456",
  // ... other fields
}

// Then run validation script again
```

### Script Output Shows Errors

Review the errors at the end:
```
Errors:
  - profile_abc: Missing labId entirely
  - profile_def: Lab not found: Unknown Lab
  - profile_ghi: User document not found: user_123
```

**Action**: Fix these manually in Firebase Console

## Security Note

⚠️ **DO NOT COMMIT THE SERVICE ACCOUNT KEY TO GIT**

The `.gitignore` already excludes these files:
```
momentum-a60c5-firebase-adminsdk-*.json
*-firebase-adminsdk-*.json
```

After running the script, you can delete the key file:
```bash
rm momentum-a60c5-firebase-adminsdk-7fwnw-5a5a10f3e1.json
```

## What Happens Next

After running the validation script:

1. **Immediate**: All profiles in Firestore are updated with missing fields
2. **User Action Required**: Users must log out and back in
3. **Result**:
   - Funding accounts appear in order creation dialogs
   - Day-to-day tasks can be created
   - All profile-dependent features work correctly

## Verification

After users log back in, verify the fix:

1. **Check Profile Data**:
   - Open browser console (F12)
   - Type: `localStorage.getItem('currentUserProfile')`
   - Should see `"labId": "lab_xyz789"`

2. **Check Funding Accounts**:
   - Click "Orders" → "New Order"
   - "Funding Account" dropdown should have options
   - If empty, check console for errors

3. **Check Day-to-Day Tasks**:
   - Click "Day to Day" → "+ Add Task"
   - Should create task without "Profile missing labId" error

## Alternative: Manual Fix

If you can't run the script, you can manually fix profiles:

1. Open Firebase Console → Firestore → `personProfiles`
2. For each profile missing `labId`:
   - Click "Edit"
   - Add field: `labId` = (copy from labs collection)
   - Save
3. Also check `users` collection:
   - Verify `user.profileId` matches the profile document ID
   - Fix any mismatches

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify Firebase permissions
3. Check that labs/organisations/institutes exist in Firestore
4. Review the script output for specific profile IDs with issues
