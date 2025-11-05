# Debugging Guide - Runtime Errors

## Common Runtime Errors and Solutions

### Error: "Failed to create poll. Please try again."

**Likely Causes:**
1. Missing required `labId` field
2. Missing `createdBy` field
3. User not authenticated
4. Firestore rules blocking the write

**How to Debug:**

1. Open browser console (F12)
2. Look for detailed error messages
3. Check the error object:

```javascript
// In app/page.tsx, update the error handler:
catch (error) {
  console.error("Poll creation error details:", error)
  console.error("Error code:", error.code)
  console.error("Error message:", error.message)
  alert("Failed to create poll. Please try again.")
}
```

**Common Fixes:**

```typescript
// Ensure poll has all required fields:
const pollData = {
  question: "Your question",
  options: [{id: "1", text: "Option 1"}],
  labId: currentUserProfile?.lab,  // Must be present!
  createdBy: currentUser?.uid,      // Must be present!
  createdAt: new Date().toISOString(),
  responses: []
}
```

---

### Error: "Failed to update equipment. Please try again."

**Likely Causes:**
1. Missing `labId` field
2. Equipment doesn't belong to user's lab
3. Validation error from Zod schema

**How to Debug:**

```javascript
// Check what's being sent:
console.log("Updating equipment:", equipmentId, updates)
console.log("Current user lab:", currentUserProfile?.lab)

// Catch specific errors:
catch (error) {
  if (error.code === "permission-denied") {
    console.error("Permission denied - check Firestore rules")
  }
  console.error("Full error:", error)
}
```

**Common Fixes:**

```typescript
// Make sure equipment has labId:
const equipmentData = {
  ...existingEquipment,
  ...updates,
  labId: currentUserProfile?.lab,  // Ensure labId is set
}
```

---

### Error: "Error saving project. Please try again."

**Likely Causes:**
1. Missing `createdBy` field
2. Missing `labId` field
3. Date format issues (Date vs string)
4. Validation errors

**How to Debug:**

```javascript
// In components where project is saved:
try {
  console.log("Saving project:", projectData)
  await createProject(projectData)
} catch (error) {
  console.error("Project save error:", error)

  // Check if it's a validation error
  if (error.name === "ValidationError") {
    console.error("Validation errors:", error.errors)
  }
}
```

**Common Fixes:**

```typescript
// Ensure all required fields:
const projectData = {
  name: "Project name",
  start: new Date(),  // Or Date object
  end: new Date(),
  progress: 0,
  color: "#000000",
  importance: "medium",
  createdBy: currentUser?.uid,  // Required!
  labId: currentUserProfile?.lab,  // Required!
  notes: "",
  isExpanded: false
}
```

---

### Error: "Errors creating experiment and saving image"

**Likely Causes:**
1. Storage rules blocking upload
2. File too large
3. Missing `createdBy` field
4. Invalid file format

**How to Debug:**

```javascript
// Check storage upload:
try {
  const storageRef = ref(storage, `experiments/${experimentId}/${file.name}`)
  console.log("Uploading to:", storageRef.fullPath)
  await uploadBytes(storageRef, file)
} catch (error) {
  console.error("Storage upload error:", error)
  console.error("Error code:", error.code)

  if (error.code === "storage/unauthorized") {
    console.error("Check storage.rules - user may not have permission")
  }
}
```

**Common Fixes:**

1. **Check file size:**
```typescript
if (file.size > 10 * 1024 * 1024) {  // 10MB
  alert("File too large. Maximum 10MB.")
  return
}
```

2. **Check file type:**
```typescript
const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
if (!allowedTypes.includes(file.type)) {
  alert("Invalid file type. Please use JPG, PNG, or GIF.")
  return
}
```

---

### Error: "No team members found."

**Likely Causes:**
1. No profiles in Firestore yet
2. Profiles not in user's lab
3. Subscription not set up correctly

**How to Debug:**

```javascript
// Check if profiles are loading:
console.log("People from store:", people)
console.log("Current user profile:", currentUserProfile)
console.log("Current user lab:", currentUserProfile?.lab)

// Check Firestore directly:
const profilesSnapshot = await getDocs(collection(db, "personProfiles"))
console.log("Total profiles in Firestore:", profilesSnapshot.size)
```

**Common Fixes:**

1. **Create some profiles first** (use Profile Setup)
2. **Check lab filtering:**
```typescript
// Make sure profiles have correct labId:
const labProfiles = profiles.filter(p => p.lab === currentUserProfile?.lab)
console.log("Profiles in my lab:", labProfiles.length)
```

---

## General Debugging Steps

### 1. Enable Console Logging

Add this to your `app/page.tsx`:

```typescript
useEffect(() => {
  console.log("=== App State Debug ===")
  console.log("Current User:", currentUser)
  console.log("Current Profile:", currentUserProfile)
  console.log("Projects:", projects.length)
  console.log("People:", people.length)
  console.log("Events:", events.length)
}, [currentUser, currentUserProfile, projects, people, events])
```

### 2. Check Firestore Console

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Check if collections exist and have data
5. Look for any missing fields

### 3. Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### 4. Check Authentication

```typescript
// Add to app/page.tsx:
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out")
    console.log("User ID:", user?.uid)
    console.log("User email:", user?.email)
  })
  return unsubscribe
}, [])
```

### 5. Validate Data Before Sending

```typescript
import { projectSchema } from "@/lib/validationSchemas"

try {
  // Validate before sending to Firestore:
  const validated = projectSchema.parse(projectData)
  await createProject(validated)
} catch (error) {
  if (error.name === "ZodError") {
    console.error("Validation errors:")
    error.errors.forEach(err => {
      console.error(`- ${err.path.join(".")}: ${err.message}`)
    })
  }
}
```

---

## Quick Fix: Add Better Error Messages

### Update Error Handlers in app/page.tsx

Replace generic error messages with detailed logging:

```typescript
// Before:
catch (error) {
  alert("Failed to create poll. Please try again.")
}

// After:
catch (error) {
  console.error("Poll creation failed:", error)

  // Show more helpful message:
  if (error.code === "permission-denied") {
    alert("Permission denied. Check if you're in a lab.")
  } else if (error.name === "ValidationError") {
    alert("Validation failed: " + error.message)
  } else {
    alert(`Failed to create poll: ${error.message}`)
  }
}
```

---

## Common Firestore Rule Issues

### Check if rules are allowing writes:

```javascript
// Test in browser console:
const testWrite = async () => {
  try {
    const docRef = await addDoc(collection(db, "test"), {
      test: "data",
      createdBy: auth.currentUser.uid
    })
    console.log("Write successful:", docRef.id)
  } catch (error) {
    console.error("Write failed:", error.code, error.message)
  }
}
testWrite()
```

---

## Need More Help?

1. **Enable detailed logging** (see above)
2. **Check browser console** for actual error messages
3. **Check Firestore rules** match your data structure
4. **Verify all required fields** are present
5. **Check user authentication** is working

**Share the actual error messages from the console** for more specific help!
