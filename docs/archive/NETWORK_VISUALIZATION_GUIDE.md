# Network Visualization Guide

**Date:** 2025-11-04
**Component:** NetworkView.tsx
**Status:** ✅ Enhanced with better error handling

---

## What is the Network Visualization?

The **NetworkView** component creates an interactive **social network graph** showing the organizational hierarchy and relationships in your academic research environment.

### Hierarchy Structure

The visualization displays **4 levels** of organization:

```
Organisation (e.g., "Jedi Academy", "Jedi Council")
    └─ Institute (e.g., "Department of Force Studies")
        └─ Lab (e.g., "Kyber Crystal Research")
            └─ People (e.g., "Luke Skywalker")
```

### Relationships Displayed

1. **Supervision Links** (Orange lines)
   - Shows who reports to whom (manager → employee)
   - Based on `reportsTo` field in person profiles

2. **Collaboration Links** (Pink lines)
   - Shows people working in the same lab
   - Automatically created for all members of a lab

3. **Belongs To Links** (Blue lines)
   - Shows which lab each person belongs to
   - Can be toggled on/off in controls

### Visual Encoding

**Node (Person) Appearance:**
- **Node color** = Employer/Supervisor (each PI gets a unique color)
- **Inner ring** = 1st funding source (CLuB, BCR, Deans, etc.)
- **Outer ring** = 2nd funding source
- **Small dots** = Additional funding sources (3rd, 4th, etc.)
- **Label** = Person's initials (e.g., "LS" for Luke Skywalker)

**Background Colors:**
- **Large rectangles** = Organisations (widest scope)
- **Medium rectangles** = Institutes (within organisations)
- **Convex hulls** = Labs (enclosing lab members)

---

## Required Profile Fields

For a profile to appear in the network visualization, it **must have** these 5 fields:

1. ✅ **firstName** - e.g., "Luke"
2. ✅ **lastName** - e.g., "Skywalker"
3. ✅ **organisation** - e.g., "Jedi Council"
4. ✅ **institute** - e.g., "Jedi Academy"
5. ✅ **lab** - e.g., "Kyber Crystal Research"

**Optional but recommended:**
- **position** - Determines node role (PhD, Postdoc, PI, RA, Manager)
- **reportsTo** - Creates supervision links
- **fundedBy** - Shows funding sources as colored rings

---

## Common Issues and Fixes

### Issue 1: "No Valid Profiles Found"

**Symptom:**
```
⚠️ No Valid Profiles Found
Found [N] total profiles, but none have all required fields.
```

**Cause:** Profiles are missing one or more required fields.

**Solution:**

1. **Check the browser console** (F12) to see which fields are missing:
   ```
   Invalid profile (missing required fields): {
     id: "...",
     hasOrganisation: false,  // ❌ Missing!
     hasInstitute: true,
     hasLab: true,
     hasFirstName: true,
     hasLastName: true
   }
   ```

2. **Complete your profile:**
   - Go to **Profile Setup** page
   - Fill in all required fields:
     - First Name
     - Last Name
     - Organisation (select from dropdown or create new)
     - Institute (select from dropdown or create new)
     - Lab (select from dropdown or create new)
   - Click **Save Profile**

3. **Wait for profiles to load:**
   - The network uses real-time Firestore subscriptions
   - New profiles appear automatically when created
   - Refresh the page if needed (Ctrl+Shift+R)

---

### Issue 2: "Error Loading Network Visualization"

**Symptom:**
```
❌ Error Loading Network Visualization
[Error message]
Check the browser console (F12) for more details.
```

**Cause:** JavaScript error occurred during rendering (usually D3.js issue).

**Solution:**

1. **Check the browser console** for the full error:
   - Press `F12` to open DevTools
   - Go to **Console** tab
   - Look for errors starting with "❌ Error rendering NetworkView:"

2. **Common D3 errors:**

   **TypeError: Cannot read property 'x' of undefined**
   - Cause: Node positions not initialized
   - Fix: Ensure profiles have valid organisation/institute/lab fields

   **d3.forceSimulation is not a function**
   - Cause: D3.js library not loaded
   - Fix: Check that D3 is installed: `npm list d3`
   - Reinstall if needed: `npm install d3 @types/d3`

   **d3.schemeCategory10 is undefined**
   - Cause: D3 color schemes not imported
   - Fix: Already imported at top of file, no action needed

3. **Clear cache and reload:**
   ```bash
   # Hard refresh
   Ctrl + Shift + R  (Windows)
   Cmd + Shift + R   (Mac)
   ```

---

### Issue 3: Network Appears Empty (No Nodes)

**Symptom:** SVG loads but no nodes appear.

**Cause:** Profiles exist but are filtered out by lab scoping.

**Solution:**

1. **Check lab filtering:**
   - If you pass `currentUserProfile` prop, only profiles in your lab are shown
   - Verify your profile has a `lab` field set
   - Verify other profiles are in the same lab

2. **Debug in console:**
   ```javascript
   // Check total profiles
   console.log("All profiles:", allProfiles.length)

   // Check current user's lab
   console.log("My lab:", currentUserProfile?.lab)

   // Check profiles in my lab
   const myLabProfiles = allProfiles.filter(p => p.lab === currentUserProfile?.lab)
   console.log("Profiles in my lab:", myLabProfiles.length)
   ```

3. **Temporary fix (for testing):**
   - Remove lab filtering by not passing `currentUserProfile` prop
   - This will show all profiles regardless of lab

---

### Issue 4: Profiles Load But Network Doesn't Render

**Symptom:** Console shows "Valid profiles: 0" even though profiles exist.

**Cause:** Profiles have fields but they're empty strings or null.

**Solution:**

1. **Check for empty fields:**
   ```javascript
   // In console:
   profiles.forEach(p => {
     if (!p.organisation || p.organisation.trim() === "") {
       console.log("Empty organisation:", p.id, p.email)
     }
     if (!p.institute || p.institute.trim() === "") {
       console.log("Empty institute:", p.id, p.email)
     }
     if (!p.lab || p.lab.trim() === "") {
       console.log("Empty lab:", p.id, p.email)
     }
   })
   ```

2. **Update profiles with proper values:**
   - Go to Profile Setup
   - Ensure you **select from dropdowns** (don't leave blank)
   - Create organisations/institutes/labs if they don't exist

---

### Issue 5: D3.js Library Not Found

**Symptom:**
```
Error: d3 is not defined
or
Cannot read property 'select' of undefined
```

**Cause:** D3.js not installed or not imported.

**Solution:**

1. **Check if D3 is installed:**
   ```bash
   npm list d3
   ```

2. **Install D3 if missing:**
   ```bash
   npm install d3 @types/d3
   ```

3. **Verify import at top of NetworkView.tsx:**
   ```typescript
   import * as d3 from "d3"
   ```

4. **Rebuild the project:**
   ```bash
   npm run build
   ```

---

## Understanding the Visualization

### Layout Algorithm

The network uses **D3 force simulation** with multiple forces:

1. **Force Link** - Pulls connected nodes together
   - Supervision links: 110px apart
   - Collaboration links: 150px apart
   - Belongs-to links: 80px apart

2. **Force Charge** - Repels all nodes from each other
   - Strength: -280 (adjustable in controls)
   - Prevents overlapping

3. **Force Collide** - Prevents nodes from overlapping
   - Radius: 22px for people, 30px for lab nodes

4. **Force X/Y** - Pulls nodes toward institute centers
   - Strength: 0.1 (gentle attraction)
   - Creates clustering effect

### Interactive Features

**Dragging:**
- Click and drag any node to reposition it
- Node stays in place while dragging
- Releases when you let go (returns to natural position)

**Search:**
- Type in search box to highlight matching nodes
- Matching nodes: 100% opacity
- Non-matching nodes: 25% opacity
- Searches both ID and label (initials)

**Edge Layers Toggle:**
- Show/hide different relationship types
- Supervision, Collaboration, Belongs-to
- Useful for simplifying complex networks

**Background Layers:**
- **All Layers** - Show organisations, institutes, and labs
- **Organisations + Institutes** - Hide lab hulls
- **Labs only** - Hide organisation/institute rectangles
- **Off** - Show only nodes and links

---

## Data Flow

### How Profiles Are Loaded

1. **useProfiles() hook** subscribes to Firestore `personProfiles` collection
2. **Real-time updates** - New profiles appear automatically
3. **Lab filtering** (optional) - Filter by current user's lab
4. **Validation** - Check for required fields
5. **D3 rendering** - Create force-directed graph

### Subscription Chain

```
Firestore (personProfiles collection)
    ↓ subscribeToProfiles()
    ↓ useProfiles() hook
    ↓ NetworkView component
    ↓ Filter by lab (optional)
    ↓ Validate required fields
    ↓ D3 force simulation
    ↓ SVG rendering
```

---

## Debugging Checklist

When the network doesn't load, check these in order:

### 1. ✅ Profiles Exist
```javascript
console.log("Total profiles:", profiles.length)
// Expected: > 0
```

### 2. ✅ Profiles Have Required Fields
```javascript
profiles.forEach(p => {
  console.log(p.id, {
    org: p.organisation,
    inst: p.institute,
    lab: p.lab,
    firstName: p.firstName,
    lastName: p.lastName
  })
})
// Expected: All fields should have values
```

### 3. ✅ Lab Filtering (if applicable)
```javascript
console.log("My lab:", currentUserProfile?.lab)
console.log("Profiles in my lab:", profiles.filter(p => p.lab === currentUserProfile?.lab).length)
// Expected: > 0
```

### 4. ✅ D3 Library Loaded
```javascript
console.log("D3 version:", d3.version)
// Expected: "7.x.x"
```

### 5. ✅ SVG Element Exists
```javascript
console.log("SVG ref:", svgRef.current)
// Expected: <svg> element
```

### 6. ✅ No JavaScript Errors
- Check Console for red error messages
- Look for "Error rendering NetworkView"

---

## Profile Setup Instructions

To ensure your profile works with the network visualization:

### Step 1: Complete Profile Information

1. Navigate to **Profile Setup** page
2. Fill in **required fields**:
   - ✅ First Name
   - ✅ Last Name
   - ✅ Email (usually auto-filled)

### Step 2: Select Organizational Hierarchy

3. **Select Organisation** (or create new):
   - Click dropdown
   - Select existing organisation (e.g., "Jedi Council")
   - Or click "+ Create new organisation" and enter name

4. **Select Institute** (or create new):
   - Click dropdown (filtered by your organisation)
   - Select existing institute (e.g., "Jedi Academy")
   - Or click "+ Create new institute" and enter name

5. **Select Lab** (or create new):
   - Click dropdown (filtered by your institute)
   - Select existing lab (e.g., "Kyber Crystal Research")
   - Or click "+ Create new lab" and enter name

### Step 3: Optional Fields (Recommended)

6. **Position**: Select your role
   - Principal Investigator
   - Postdoc
   - PhD Student
   - Research Assistant
   - Technician
   - Manager
   - Other

7. **Reports To**: Select your supervisor
   - Leave blank if you're a PI (no supervisor)
   - Select from dropdown if you report to someone

8. **Funded By**: Select funding sources
   - CLuB, BCR, Deans, etc.
   - Shows as colored rings on your node

### Step 4: Save and Verify

9. Click **Save Profile**
10. Navigate to **Network View**
11. Verify your node appears in the graph

---

## Advanced Configuration

### Adjusting Force Strength

**Default: -280**

- **More negative** (-400) = Nodes repel more, spread out
- **Less negative** (-150) = Nodes attract more, cluster tighter
- **Positive** = Nodes attract (not recommended, creates tangles)

### Custom Colors

Edit the color schemes in NetworkView.tsx:

```typescript
// Funder colors (line 226)
const funderColors: Record<string, string> = {
  "CLuB": "#22c55e",      // Green
  "BCR": "#06b6d4",       // Cyan
  "Deans": "#eab308",     // Yellow
  "Account_4": "#f97316"  // Orange
}

// Role fallback colors (line 233)
const roleFallback: Record<string, string> = {
  PI: "#ff7f50",         // Coral
  Postdoc: "#ffd36a",    // Light yellow
  PhD: "#6ad1ff",        // Light blue
  RA: "#7cffb7",         // Light green
  Manager: "#c39bff",    // Purple
  Other: "#ddd"          // Gray
}
```

---

## Performance Considerations

### Recommended Limits

- **< 50 people** - Smooth performance, all edges visible
- **50-100 people** - Good performance, consider hiding collaboration edges
- **100-200 people** - May lag, hide background layers
- **> 200 people** - Consider pagination or filtering by lab

### Optimization Tips

1. **Hide collaboration links** - Reduces edge count significantly
2. **Turn off backgrounds** - Faster rendering
3. **Filter by lab** - Show only your lab's network
4. **Reduce force strength** - Less computation per frame

---

## Example Profile Structure

```typescript
{
  id: "AGjKJ2eC7MgWWC5oh2Is",
  email: "Luke.Skywalker@gmail.com",
  firstName: "Luke",
  lastName: "Skywalker",
  organisation: "Jedi Council",         // ✅ Required
  institute: "Jedi Academy",            // ✅ Required
  lab: "Kyber Crystal Research",        // ✅ Required
  position: "Jedi Master",              // Optional
  reportsTo: null,                      // Optional (null = PI)
  fundedBy: ["CLuB", "BCR"],           // Optional
  officeLocation: "Coruscant",          // Optional
  phone: "66",                          // Optional
  notes: ""                             // Optional
}
```

**This profile will appear in the network** because it has all 5 required fields.

---

## Summary

**What is it?**
- Interactive social network graph showing organisational hierarchy

**What does it need?**
- Profiles with: firstName, lastName, organisation, institute, lab

**What if it doesn't work?**
1. Check browser console for errors
2. Verify profiles have all required fields
3. Complete profile setup if fields are missing
4. Check lab filtering if applicable

**How to fix profiles?**
- Go to Profile Setup → Fill required fields → Save

**Still broken?**
- Share console error output for debugging

---

## Related Files

- `components/NetworkView.tsx` - Main visualization component
- `lib/useProfiles.ts` - Profile loading hook
- `lib/firestoreService.ts` - Firestore subscriptions
- `lib/types.ts` - PersonProfile type definition

---

**Date:** 2025-11-04
**Status:** ✅ Component Enhanced with Better Error Handling
**Next Steps:** Complete profile setup and test the visualization!
