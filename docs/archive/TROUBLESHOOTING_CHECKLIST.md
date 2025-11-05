# Troubleshooting Checklist

## Quick Diagnostics

Run through this checklist to identify and fix common issues.

---

## ✅ Step 1: Check Authentication

**Problem:** Operations fail with no clear error

**Check:**
```javascript
// Open browser console (F12) and run:
console.log("Auth user:", auth.currentUser)
console.log("User ID:", auth.currentUser?.uid)
console.log("User email:", auth.currentUser?.email)
```

**Expected:** Should see user ID and email

**If null or undefined:**
- User is not logged in
- Redirect to login page
- Check if authentication is initialized

---

## ✅ Step 2: Check User Profile

**Problem:** "No team members found" or permission errors

**Check:**
```javascript
// In browser console:
const profileId = currentUser?.uid
const profileRef = doc(db, "personProfiles", profileId)
const profileSnap = await getDoc(profileRef)
console.log("Profile exists:", profileSnap.exists())
console.log("Profile data:", profileSnap.data())
```

**Expected:** Profile should exist with lab, organisation, institute fields

**If missing:**
- Complete profile setup
- Go to Profile Setup page
- Fill in all required fields

---

## ✅ Step 3: Check Lab Assignment

**Problem:** "Failed to create poll" or "No access to equipment"

**Check:**
```javascript
// In browser console:
console.log("Current user lab:", currentUserProfile?.lab)
console.log("Lab ID:", currentUserProfile?.lab)
```

**Expected:** Should show a lab name/ID

**If null or undefined:**
- User is not assigned to a lab
- Complete profile setup
- Assign user to a lab in the profile

---

## ✅ Step 4: Check Firestore Rules

**Problem:** "Permission denied" errors

**Check:**
1. Go to Firebase Console → Firestore Database → Rules
2. Verify rules are deployed
3. Check rule modification date

**Test write permission:**
```javascript
// In browser console:
try {
  const testDoc = await addDoc(collection(db, "test"), {
    test: true,
    createdBy: auth.currentUser.uid
  })
  console.log("✅ Write successful:", testDoc.id)
  await deleteDoc(testDoc)
} catch (error) {
  console.error("❌ Write failed:", error.code, error.message)
}
```

**If permission-denied:**
- Rules may be blocking writes
- Check if `createdBy` field matches user ID
- Verify `labId` field exists for lab-scoped collections

---

## ✅ Step 5: Check Required Fields

**Problem:** Validation errors or silent failures

**For Projects:**
```typescript
Required fields:
- name (string, 1-200 chars)
- start (Date object)
- end (Date object)
- progress (number, 0-100)
- color (string)
- importance ("low" | "medium" | "high" | "critical")
- createdBy (user ID string)
- labId (lab ID string or null)
```

**For Polls:**
```typescript
Required fields:
- question (string)
- options (array of {id, text})
- labId (lab ID string) ← CRITICAL
- createdBy (user ID string)
- createdAt (ISO string)
```

**For Equipment:**
```typescript
Required fields:
- name (string)
- make (string)
- model (string)
- type (string)
- maintenanceDays (number)
- lastMaintained (ISO string)
- threshold (number 0-100)
- supplies (array)
- labId (lab ID string) ← CRITICAL
```

---

## ✅ Step 6: Check Date Formats

**Problem:** "Invalid date" or date-related errors

**Check:**
```javascript
// Dates should be Date objects, not strings:
const project = {
  start: new Date(),  // ✅ Correct
  end: "2024-12-31"   // ❌ Wrong - convert to Date
}

// Convert strings to dates:
const project = {
  start: new Date(formData.start),  // ✅ Correct
  end: new Date(formData.end)        // ✅ Correct
}
```

---

## ✅ Step 7: Check File Uploads (ELN)

**Problem:** "Error saving image" or upload failures

**Check file:**
```javascript
console.log("File name:", file.name)
console.log("File size:", file.size, "bytes")
console.log("File type:", file.type)

// Check size (max 10MB):
if (file.size > 10 * 1024 * 1024) {
  console.error("❌ File too large!")
}

// Check type:
const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
if (!allowed.includes(file.type)) {
  console.error("❌ Invalid file type!")
}
```

**Check storage rules:**
1. Go to Firebase Console → Storage → Rules
2. Verify rules allow uploads
3. Check if path matches rules

---

## ✅ Step 8: Check Browser Console

**Always check console for:**
- Red error messages
- Failed network requests (Network tab)
- Warnings about missing dependencies
- CORS errors
- Firebase initialization errors

**Common errors:**
- `Firebase: Error (auth/network-request-failed)` - Network issue
- `FirebaseError: Missing or insufficient permissions` - Rules issue
- `TypeError: Cannot read property 'x' of undefined` - Data structure issue

---

## ✅ Step 9: Verify Firestore Data

**Check if collections exist:**

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check these collections exist:
   - `users`
   - `personProfiles`
   - `projects`
   - `labs`
   - `institutes`
   - `organisations`

**Check sample document:**
```javascript
// In browser console:
const snapshot = await getDocs(collection(db, "personProfiles"))
console.log("Total profiles:", snapshot.size)
snapshot.forEach(doc => {
  console.log(doc.id, "→", doc.data())
})
```

---

## ✅ Step 10: Check Network Requests

**In browser DevTools:**
1. Open Network tab (F12 → Network)
2. Filter by "Fetch/XHR"
3. Perform the failing operation
4. Look for red (failed) requests
5. Click on failed request
6. Check Response tab for error details

**Common issues:**
- 401 Unauthorized - Not authenticated
- 403 Forbidden - Rules blocking access
- 404 Not Found - Wrong collection/document path
- 500 Server Error - Firebase internal error

---

## Common Fix Patterns

### Fix: "Failed to create poll"

```typescript
// Ensure labId is set:
const pollData = {
  question: "Your question",
  options: [{id: "1", text: "Option 1"}],
  labId: currentUserProfile?.lab || "",  // Add this!
  createdBy: currentUser?.uid || "",     // Add this!
  createdAt: new Date().toISOString(),
  responses: []
}
```

### Fix: "Failed to update equipment"

```typescript
// Ensure equipment belongs to lab:
const updates = {
  ...equipmentData,
  labId: currentUserProfile?.lab || ""  // Ensure this is set
}
```

### Fix: "Error saving project"

```typescript
// Ensure dates are Date objects:
const projectData = {
  ...formData,
  start: new Date(formData.start),
  end: new Date(formData.end),
  createdBy: currentUser?.uid,
  labId: currentUserProfile?.lab || null
}
```

### Fix: "No team members found"

```typescript
// Check if profiles are loading:
useEffect(() => {
  console.log("People count:", people.length)
  console.log("Current lab:", currentUserProfile?.lab)

  // Filter by lab:
  const labMembers = people.filter(p =>
    p.lab === currentUserProfile?.lab
  )
  console.log("Lab members:", labMembers.length)
}, [people, currentUserProfile])
```

---

## Still Having Issues?

1. **Enable detailed logging** (see ERROR_LOGGING_PATCH.md)
2. **Check all console messages**
3. **Verify Firebase rules are deployed**
4. **Check Firestore data structure**
5. **Try creating test documents manually** in Firebase Console

**Share these details for help:**
- Exact error message from console
- User authentication status
- User profile lab assignment
- Firestore rules version
- What operation is failing

---

## Quick Health Check Script

Add this to your app for a quick health check:

```typescript
const healthCheck = async () => {
  const checks = {
    auth: !!auth.currentUser,
    user: !!currentUser,
    profile: !!currentUserProfile,
    lab: !!currentUserProfile?.lab,
    firestoreRead: false,
    firestoreWrite: false
  }

  // Test Firestore read
  try {
    await getDocs(query(collection(db, "personProfiles"), limit(1)))
    checks.firestoreRead = true
  } catch (e) {
    console.error("Firestore read failed:", e)
  }

  // Test Firestore write
  try {
    const testRef = await addDoc(collection(db, "test"), {
      test: true,
      createdBy: currentUser?.uid
    })
    await deleteDoc(testRef)
    checks.firestoreWrite = true
  } catch (e) {
    console.error("Firestore write failed:", e)
  }

  console.table(checks)

  const allGood = Object.values(checks).every(v => v)
  console.log(allGood ? "✅ All checks passed" : "❌ Some checks failed")

  return checks
}

// Run in console:
healthCheck()
```

This will show you exactly what's working and what's not!
