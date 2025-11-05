# Equipment & Inventory - Phase 3 & 4 Implementation

**Date:** 2025-11-04
**Status:** ✅ Core Implementation Complete

---

## ✅ What Was Implemented

### Phase 3: Smart Reordering System

#### 1. Updated Type Definitions

**File:** [lib/types.ts](lib/types.ts)

**Changes:**
- ✅ Added `chargeToAccountId` and `chargeToProjectId` to `EquipmentSupply`
- ✅ Created `ReorderSuggestion` interface with full cost breakdown
- ✅ Created `EquipmentTaskType` enum for task categorization

**New Types:**
```typescript
export interface ReorderSuggestion {
  inventoryItemId: string
  itemName: string
  catNum: string
  currentQty: number
  minQty: number
  totalBurnRate: number
  weeksTillEmpty: number
  suggestedOrderQty: number // 4 weeks supply
  priority: 'urgent' | 'high' | 'medium' | 'low'
  affectedEquipment: Array<{ id: string; name: string }>
  affectedProjects: Array<{ id: string; name: string }>
  estimatedCost: number
  chargeToAccounts: Array<{
    accountId: string
    accountName: string
    projectId: string
    projectName: string
    percentage: number
    amount: number
  }>
}

export enum EquipmentTaskType {
  MAINTENANCE = "equipment_maintenance",
  REORDER = "equipment_reorder",
  SUPPLY_CHECK = "equipment_supply_check",
  CALIBRATION = "equipment_calibration",
}
```

#### 2. Created Equipment Utility Functions

**File:** [lib/equipmentUtils.ts](lib/equipmentUtils.ts) - NEW (~300 lines)

**Functions Implemented:**

**`calculateReorderSuggestions()`**
- Analyzes inventory levels across all equipment
- Calculates total burn rates from all devices using each item
- Determines priority based on weeks remaining
- Suggests order quantity (4 weeks supply)
- Calculates cost split across projects based on burn rate percentage
- Returns sorted list of suggestions (urgent first)

**Algorithm:**
```typescript
// For each inventory item:
1. Find all equipment that uses this item
2. Sum burn rates across all equipment
3. Calculate: weeksTillEmpty = currentQty / totalBurnRate
4. If weeksTillEmpty < 4 weeks:
   - Determine priority (urgent/high/medium/low)
   - Suggest order quantity = totalBurnRate * 4
   - Calculate cost = pricePerUnit * suggestedQty
   - Split cost across projects based on burn rate %
5. Sort by priority and weeks remaining
```

**`calculateMaintenanceHealth()`**
- Calculates equipment health percentage (0-100%)
- Based on days since last maintenance vs maintenance interval
- Returns 0% if overdue, 100% if just maintained

**`calculateSuppliesHealth()`**
- Calculates overall supplies health for equipment
- Returns worst supply percentage (most critical)
- Based on weeks remaining for each supply

**`generateEquipmentTasks()`**
- Generates day-to-day tasks for maintenance and reordering
- Only creates tasks if none exist already (no duplicates)
- Maintenance tasks created when health < threshold
- Reorder tasks created for urgent/high priority items
- Tasks include metadata (health %, weeks remaining, cost)

**`recordMaintenanceCompletion()`**
- Updates equipment lastMaintained date
- Resets maintenance health to 100%

#### 3. Created Reorder Suggestions Panel

**File:** [components/ReorderSuggestionsPanel.tsx](components/ReorderSuggestionsPanel.tsx) - NEW (~280 lines)

**Features:**
- ✅ Visual priority indicators (icons and colors)
- ✅ Stock level progress bars
- ✅ Key metrics display (weeks remaining, burn rate, cost)
- ✅ Equipment usage chips
- ✅ Expandable details section
- ✅ Project cost breakdown with percentages
- ✅ One-click order creation
- ✅ Add to todo list
- ✅ Dismiss suggestions
- ✅ Responsive card-based layout

**Priority Visual System:**
- 🔴 Urgent: Red (< 1 week remaining)
- 🟠 High: Orange (1-2 weeks)
- 🟡 Medium: Yellow (2-3 weeks)
- 🔵 Low: Blue (3-4 weeks)

**UI Components:**
```
┌─────────────────────────────────────────────────┐
│ 🔴 Taq Polymerase             [URGENT]          │
│    CAT# EP0402                                   │
│                                                  │
│    Current Stock: 2 / 10 units                  │
│    [███░░░░░░░░░░░░░░░░░░] 20%                  │
│                                                  │
│    0.8w remaining | 2.5/wk burn | 10 units | £455│
│                                                  │
│    Used by: PCR-1, PCR-2, Thermocycler         │
│                                                  │
│    [Create Order] [Add to Todo] [Details] [×]   │
└─────────────────────────────────────────────────┘
```

**Expanded Details:**
- Cost split by project with percentages
- Affected projects list
- Account charging breakdown

---

### Phase 4: Day-to-Day Integration

#### 1. Extended DayToDayTask Interface

**File:** [lib/dayToDayTypes.ts](lib/dayToDayTypes.ts)

**Changes:**
- ✅ Added equipment-related fields to task interface
- ✅ Added task type enum for categorization
- ✅ Added metadata object for equipment-specific data

**New Fields:**
```typescript
export interface DayToDayTask {
  // ... existing fields

  // Equipment-related fields
  equipmentId?: string
  equipmentSupplyId?: string
  inventoryItemId?: string
  taskType?: EquipmentTaskType
  metadata?: {
    maintenanceHealth?: number
    weeksRemaining?: number
    suggestedQty?: number
    estimatedCost?: number
  }
}
```

#### 2. Automatic Task Generation

**Function:** `generateEquipmentTasks()` in [lib/equipmentUtils.ts](lib/equipmentUtils.ts)

**Maintenance Tasks:**
- ✅ Created when equipment health < threshold
- ✅ Priority based on health (< 25% = urgent, < 60% = high)
- ✅ Due date calculated from last maintenance + interval
- ✅ Includes health percentage in description
- ✅ Links to equipment ID for quick access
- ✅ No duplicates (checks existing tasks)

**Reorder Tasks:**
- ✅ Created for urgent and high priority suggestions
- ✅ Priority matches suggestion priority
- ✅ Due date based on weeks remaining
- ✅ Includes suggested quantity and cost
- ✅ Lists affected equipment in description
- ✅ Links to inventory item
- ✅ No duplicates (checks existing tasks)

**Task Creation Example:**
```typescript
// Maintenance Task
{
  id: "equip-maint-PCR1-1234567890",
  title: "Perform maintenance on PCR Machine 1",
  description: "Maintenance health at 30%. Last maintained: 2025-09-15. Due: 2025-11-01",
  status: "todo",
  importance: "high",
  dueDate: Date(2025-11-01),
  equipmentId: "pcr-machine-1",
  taskType: EquipmentTaskType.MAINTENANCE,
  metadata: { maintenanceHealth: 30 }
}

// Reorder Task
{
  id: "equip-reorder-TAQ123-1234567890",
  title: "Reorder Taq Polymerase",
  description: "0.8 weeks remaining. Order 10 units (£455.00). Used by: PCR-1, PCR-2",
  status: "todo",
  importance: "urgent",
  dueDate: Date(2025-11-10),
  inventoryItemId: "taq-polymerase-123",
  taskType: EquipmentTaskType.REORDER,
  metadata: {
    weeksRemaining: 0.8,
    suggestedQty: 10,
    estimatedCost: 455.00
  }
}
```

---

## 🎯 How It Works (User Workflows)

### Workflow 1: Automatic Reorder Suggestion

```
1. User opens Equipment Status Panel
   ↓
2. System calculates reorder suggestions:
   - Checks all inventory items
   - For each item, sums burn rates from all equipment
   - Identifies items with < 4 weeks remaining
   ↓
3. ReorderSuggestionsPanel displays urgent items:
   - Red card for Taq Polymerase (0.8 weeks left)
   - Shows: 2/10 units, £455 cost, 10 unit order
   - Cost split: Cancer Project (60%), Diabetes Project (40%)
   ↓
4. User clicks "Create Order"
   ↓
5. Order created with:
   - Product: Taq Polymerase
   - Quantity: 10
   - Split across 2 projects based on burn rates
   ↓
6. Stock updated when order received
   ↓
7. Reorder suggestion automatically disappears
```

### Workflow 2: Automatic Maintenance Task

```
1. Background: Equipment health calculation runs
   - PCR Machine 1 last maintained 50 days ago
   - Maintenance interval: 45 days
   - Health: 30% (below 60% threshold)
   ↓
2. System generates maintenance task:
   - Title: "Perform maintenance on PCR Machine 1"
   - Priority: High (health < 60%)
   - Due: 2025-11-01 (already overdue)
   ↓
3. User sees task in Day-to-Day Board "Todo" column
   ↓
4. User clicks task → Equipment details shown
   ↓
5. User performs maintenance, clicks "Complete"
   ↓
6. System updates:
   - Equipment lastMaintained date → today
   - Health resets to 100%
   - Task marked complete
   ↓
7. Task moves to "Done" column
```

### Workflow 3: One-Click Reordering from Suggestion

```
1. User sees suggestion: "Primers - 1.2 weeks remaining"
   ↓
2. Clicks "Details" to expand
   - Sees cost breakdown:
     * Project A: £180 (60%)
     * Project B: £120 (40%)
   - Sees equipment using primers:
     * PCR-1, PCR-2, Sequencer
   ↓
3. Clicks "Create Order"
   ↓
4. System automatically:
   - Creates order for suggested quantity (8 units)
   - Links to appropriate accounts
   - Sets status to "to-order"
   - Adds to Orders panel
   ↓
5. Lab manager reviews and places order
   ↓
6. When received:
   - Order moves to "received" column
   - After 7 days, inventory auto-updated
   - Suggestion disappears
```

---

## 📊 Integration Points

### 1. Equipment Status Panel
**Location:** [components/EquipmentStatusPanel.tsx](components/EquipmentStatusPanel.tsx)

**Additions Needed:**
- Import `calculateReorderSuggestions` from equipmentUtils
- Import `ReorderSuggestionsPanel` component
- Calculate suggestions on mount/update
- Render `<ReorderSuggestionsPanel>` above equipment list
- Wire up onCreateOrder callback

### 2. Orders & Inventory Panel
**Location:** [app/page.tsx](app/page.tsx) - Orders & Inventory section

**Additions Needed:**
- Import `calculateReorderSuggestions` and `ReorderSuggestionsPanel`
- Add "Suggestions" tab alongside Orders and Inventory
- Calculate suggestions from current inventory and equipment
- Show suggestion count badge on tab
- Wire up order creation from suggestions

### 3. Day-to-Day Board
**Location:** [components/DayToDayBoard.tsx](components/DayToDayBoard.tsx)

**Additions Needed:**
- Import `generateEquipmentTasks` from equipmentUtils
- Call function on mount/daily (check for new tasks)
- Add task type badges to task cards
- Add equipment-specific action buttons:
  - "Record Maintenance" for maintenance tasks
  - "Create Order" for reorder tasks
- Wire up equipment navigation from tasks

---

## 🚀 Next Steps

### Immediate (To Complete Phase 3 & 4):

1. **Integrate ReorderSuggestionsPanel into EquipmentStatusPanel**
   - Add above equipment device list
   - Calculate suggestions from inventory + equipment
   - Wire up order creation

2. **Add Suggestions tab to Orders & Inventory**
   - New tab in main dashboard
   - Show count badge
   - Link to order creation

3. **Integrate with Day-to-Day Board**
   - Generate tasks on mount
   - Add equipment task badges
   - Add action buttons for maintenance/reorder

4. **Test Complete Workflows**
   - Create test data with low inventory
   - Verify suggestions generated correctly
   - Test order creation from suggestions
   - Test task creation and completion

### Future Enhancements (Phase 5):

5. **Bulk Upload Component** (CSV/Excel import)
6. **Mobile Responsive Cards** (replace tables)
7. **Burn Rate Visualization** (charts/graphs)
8. **Historical Tracking** (consumption trends)

---

## 📝 Code Examples

### Using calculateReorderSuggestions:

```typescript
import { calculateReorderSuggestions } from "@/lib/equipmentUtils"

function MyComponent() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([])

  useEffect(() => {
    const sug = calculateReorderSuggestions(
      inventory,
      equipment,
      masterProjects
    )
    setSuggestions(sug)
  }, [inventory, equipment, masterProjects])

  return <ReorderSuggestionsPanel suggestions={suggestions} ... />
}
```

### Using generateEquipmentTasks:

```typescript
import { generateEquipmentTasks } from "@/lib/equipmentUtils"

function DayToDayBoard() {
  useEffect(() => {
    const newTasks = generateEquipmentTasks(
      equipment,
      reorderSuggestions,
      currentUserProfile,
      existingTasks
    )

    // Add new tasks to task list
    newTasks.forEach(task => {
      createDayToDayTask(task)
    })
  }, [equipment, inventory])
}
```

### Handling Task Completion:

```typescript
function TaskCard({ task }) {
  if (task.taskType === EquipmentTaskType.MAINTENANCE) {
    return (
      <Button onClick={() => {
        // Record maintenance
        const updated = recordMaintenanceCompletion(equipment)
        updateEquipment(updated)

        // Mark task complete
        updateDayToDayTask(task.id, { status: 'done' })
      }}>
        Mark Maintenance Complete
      </Button>
    )
  }

  if (task.taskType === EquipmentTaskType.REORDER) {
    return (
      <Button onClick={() => {
        // Create order from task metadata
        const order = {
          productName: task.title.replace('Reorder ', ''),
          quantity: task.metadata.suggestedQty,
          estimatedCost: task.metadata.estimatedCost,
          ...
        }
        createOrder(order)
        updateDayToDayTask(task.id, { status: 'done' })
      }}>
        Create Order Now
      </Button>
    )
  }
}
```

---

## ✅ Deliverables

**Files Created:**
1. [lib/equipmentUtils.ts](lib/equipmentUtils.ts) - Utility functions (~300 lines)
2. [components/ReorderSuggestionsPanel.tsx](components/ReorderSuggestionsPanel.tsx) - UI component (~280 lines)

**Files Modified:**
1. [lib/types.ts](lib/types.ts) - Added ReorderSuggestion, EquipmentTaskType, updated EquipmentSupply
2. [lib/dayToDayTypes.ts](lib/dayToDayTypes.ts) - Extended DayToDayTask interface

**Total:** ~600 lines of new code

**Status:** ✅ **Core implementation complete - Ready for integration**

---

**Next Session:** Integrate these components into existing panels and test complete workflows!
