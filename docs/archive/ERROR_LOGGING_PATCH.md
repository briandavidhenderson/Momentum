# Error Logging Patch

## Quick Fix: Add Console Logging

To identify what's causing the runtime errors, add detailed logging to your error handlers.

---

## 1. Enhanced Error Logging Utility

Create a new utility for better error messages:

```typescript
// lib/errorLogger.ts
export function logError(context: string, error: any) {
  console.group(`❌ Error: ${context}`)
  console.error("Message:", error.message)
  console.error("Code:", error.code)
  console.error("Name:", error.name)
  console.error("Full error:", error)

  if (error.code === "permission-denied") {
    console.error("💡 Tip: Check Firestore rules and user permissions")
  }

  if (error.name === "ValidationError") {
    console.error("💡 Validation errors:", error.errors)
  }

  console.groupEnd()

  // Return user-friendly message
  if (error.code === "permission-denied") {
    return "Permission denied. Please check your access rights."
  }
  if (error.name === "ValidationError") {
    return `Validation error: ${error.message}`
  }
  return error.message || "An error occurred. Please try again."
}
```

---

## 2. Update Error Handlers in app/page.tsx

### For Poll Creation:

```typescript
// Find the poll creation handler and update it:
const handleCreatePoll = async (pollData) => {
  try {
    console.log("Creating poll with data:", pollData)

    // Ensure required fields:
    if (!currentUserProfile?.lab) {
      throw new Error("User must be in a lab to create polls")
    }

    const pollToCreate = {
      ...pollData,
      labId: currentUserProfile.lab,
      createdBy: currentUser?.uid,
    }

    console.log("Poll with all fields:", pollToCreate)

    await createLabPoll(pollToCreate)
    console.log("✅ Poll created successfully")

  } catch (error) {
    console.error("❌ Poll creation failed:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      name: error.name
    })

    // Show specific error:
    alert(`Failed to create poll: ${error.message}`)
  }
}
```

### For Equipment Updates:

```typescript
const handleUpdateEquipment = async (equipmentId, updates) => {
  try {
    console.log("Updating equipment:", equipmentId)
    console.log("Updates:", updates)
    console.log("User lab:", currentUserProfile?.lab)

    // Ensure labId is present:
    const updatesWithLab = {
      ...updates,
      labId: currentUserProfile?.lab,
    }

    await updateEquipment(equipmentId, updatesWithLab)
    console.log("✅ Equipment updated successfully")

  } catch (error) {
    console.error("❌ Equipment update failed:", error)
    console.error("Equipment ID:", equipmentId)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      name: error.name
    })

    // Check specific errors:
    if (error.code === "permission-denied") {
      alert("Permission denied. You may not have access to this equipment.")
    } else {
      alert(`Failed to update equipment: ${error.message}`)
    }
  }
}
```

### For Project Creation:

```typescript
const handleCreateProject = async (projectData) => {
  try {
    console.log("Creating project with data:", projectData)

    // Validate required fields:
    if (!currentUser?.uid) {
      throw new Error("User must be authenticated")
    }

    if (!currentUserProfile?.lab) {
      console.warn("User has no lab - project won't be lab-scoped")
    }

    // Ensure dates are Date objects:
    const projectToCreate = {
      ...projectData,
      start: projectData.start instanceof Date ? projectData.start : new Date(projectData.start),
      end: projectData.end instanceof Date ? projectData.end : new Date(projectData.end),
      createdBy: currentUser.uid,
      labId: currentUserProfile?.lab || null,
    }

    console.log("Project with all fields:", projectToCreate)

    const projectId = await createProject(projectToCreate)
    console.log("✅ Project created successfully:", projectId)

  } catch (error) {
    console.error("❌ Project creation failed:", error)
    console.error("Project data:", projectData)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    })

    // Show detailed error:
    if (error.name === "ValidationError") {
      const errors = error.errors?.map(e => `${e.path}: ${e.message}`).join(", ")
      alert(`Validation failed: ${errors}`)
    } else {
      alert(`Error saving project: ${error.message}`)
    }
  }
}
```

### For ELN Experiment Creation:

```typescript
const handleCreateExperiment = async (experimentData, imageFile) => {
  try {
    console.log("Creating experiment:", experimentData)
    console.log("Image file:", imageFile?.name, imageFile?.size, "bytes")

    // Check file size (10MB limit):
    if (imageFile && imageFile.size > 10 * 1024 * 1024) {
      throw new Error("Image file too large (max 10MB)")
    }

    // Check file type:
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (imageFile && !allowedTypes.includes(imageFile.type)) {
      throw new Error(`Invalid file type: ${imageFile.type}`)
    }

    // Create experiment first:
    const experimentId = await createELNExperiment({
      ...experimentData,
      createdBy: currentUser?.uid,
      labId: currentUserProfile?.lab,
    })
    console.log("✅ Experiment created:", experimentId)

    // Upload image if provided:
    if (imageFile) {
      console.log("Uploading image...")
      const storageRef = ref(storage, `experiments/${experimentId}/${imageFile.name}`)

      await uploadBytes(storageRef, imageFile)
      const imageUrl = await getDownloadURL(storageRef)

      console.log("✅ Image uploaded:", imageUrl)

      // Update experiment with image URL:
      await updateELNExperiment(experimentId, {
        pages: [{
          id: generateId(),
          title: "Page 1",
          imageUrl,
          voiceNotes: [],
          stickyNotes: [],
          createdAt: new Date().toISOString()
        }]
      })

      console.log("✅ Experiment updated with image")
    }

  } catch (error) {
    console.error("❌ Experiment creation failed:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      name: error.name
    })

    // Check specific storage errors:
    if (error.code === "storage/unauthorized") {
      alert("Permission denied for image upload. Check storage rules.")
    } else if (error.code === "storage/quota-exceeded") {
      alert("Storage quota exceeded. Please contact administrator.")
    } else {
      alert(`Error creating experiment: ${error.message}`)
    }
  }
}
```

---

## 3. Add Global Error Handler

Add this to your `app/page.tsx` to catch all unhandled errors:

```typescript
useEffect(() => {
  // Global error handler
  const handleError = (event: ErrorEvent) => {
    console.error("❌ Unhandled error:", event.error)
    console.error("Message:", event.message)
    console.error("Filename:", event.filename)
    console.error("Line:", event.lineno)
  }

  window.addEventListener("error", handleError)

  // Unhandled promise rejection handler
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("❌ Unhandled promise rejection:", event.reason)
  }

  window.addEventListener("unhandledrejection", handleRejection)

  return () => {
    window.removeEventListener("error", handleError)
    window.removeEventListener("unhandledrejection", handleRejection)
  }
}, [])
```

---

## 4. Add State Debugging

Add this to see what's in your state:

```typescript
useEffect(() => {
  console.group("📊 App State")
  console.log("Current User:", currentUser?.uid, currentUser?.email)
  console.log("Current Profile:", currentUserProfile?.id, {
    firstName: currentUserProfile?.firstName,
    lastName: currentUserProfile?.lastName,
    lab: currentUserProfile?.lab,
  })
  console.log("Projects:", projects.length)
  console.log("People:", people.length)
  console.log("Events:", events.length)
  console.log("Orders:", orders.length)
  console.log("Inventory:", inventory.length)
  console.log("Equipment:", equipment.length)
  console.groupEnd()
}, [currentUser, currentUserProfile, projects, people, events, orders, inventory, equipment])
```

---

## 5. Test Each Operation

Create a test suite to verify operations work:

```typescript
// Add to app/page.tsx or create a new test component:
const runTests = async () => {
  console.log("🧪 Running tests...")

  // Test 1: Check authentication
  console.log("Test 1: Auth -", currentUser ? "✅" : "❌")

  // Test 2: Check profile
  console.log("Test 2: Profile -", currentUserProfile ? "✅" : "❌")

  // Test 3: Check lab
  console.log("Test 3: Lab -", currentUserProfile?.lab ? "✅" : "❌")

  // Test 4: Try creating a test document
  try {
    const testRef = await addDoc(collection(db, "test"), {
      test: true,
      createdBy: currentUser?.uid,
      createdAt: serverTimestamp()
    })
    console.log("Test 4: Firestore write - ✅", testRef.id)

    // Clean up
    await deleteDoc(testRef)
  } catch (error) {
    console.log("Test 4: Firestore write - ❌", error.message)
  }

  console.log("🧪 Tests complete")
}

// Add a button to run tests:
<button onClick={runTests}>Run Tests</button>
```

---

## Summary

After applying these changes:

1. **Check browser console** for detailed error logs
2. **Look for specific error codes** (permission-denied, validation errors, etc.)
3. **Verify required fields** are present (createdBy, labId, etc.)
4. **Test each operation** individually
5. **Share the console output** for further debugging

The detailed logging will help identify exactly what's failing and why!
