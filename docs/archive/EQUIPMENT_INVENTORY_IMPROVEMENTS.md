# Equipment Status & Inventory System - Issues & Improvements

**Date:** 2025-11-04
**Status:** 🔨 In Progress

---

## 🔍 Current Issues Identified

### 1. Equipment Status Panel

**Critical Issues:**
- ❌ **No link between inventory items and equipment** - Supplies are duplicated between equipment supplies and inventory
- ❌ **Manual supply entry only** - No bulk upload or easy management
- ❌ **Burn rates not synchronized** - Equipment supplies and inventory items track burn rates separately
- ❌ **No auto-reorder workflow** - Low supplies don't automatically create orders or tasks
- ❌ **No project/account charging for equipment supplies** - Can't track which project uses which consumables on each device
- ❌ **Mobile responsiveness poor** - Tables overflow, hard to use on tablets/phones
- ❌ **Supply check stock UI unclear** - Modal doesn't clearly show inventory status

**Usability Issues:**
- ⚠️ Adding supplies is tedious - one at a time with manual form entry
- ⚠️ No way to see total cost of supplies across all equipment
- ⚠️ Can't easily see which equipment shares the same reagents
- ⚠️ Maintenance todos don't integrate with day-to-day board

### 2. Orders & Inventory Panel

**Critical Issues:**
- ❌ **No bulk inventory upload** - Labs have spreadsheets but can't import them
- ❌ **Inventory items not linked to equipment** - Can't see which equipment needs which items
- ❌ **No automatic reorder suggestions** - System knows burn rates but doesn't suggest orders
- ❌ **Project charging is optional** - Should be required with proper project selection
- ❌ **Orders don't auto-populate from low inventory** - Manual order creation each time
- ❌ **No burn rate visualization** - Can't see consumption trends over time
- ❌ **Duplicate entries common** - No validation when adding inventory

**Usability Issues:**
- ⚠️ Orders tab and Inventory tab are separate - hard to see relationship
- ⚠️ Can't create order directly from low inventory item
- ⚠️ No way to mark "who uses what" - can't track consumable assignment
- ⚠️ Price tracking inconsistent between orders and inventory
- ⚠️ No batch operations (mark multiple items as low, bulk reorder, etc.)

### 3. Day-to-Day Integration

**Critical Issues:**
- ❌ **No automatic task creation** - Low supplies/maintenance don't create tasks
- ❌ **No link from tasks back to equipment** - Can't complete maintenance from task board
- ❌ **Reordering isn't a task type** - Should appear on someone's todo list

---

## ✅ Proposed Solutions

### Phase 1: Core Data Model Improvements

#### 1.1 Link Inventory to Equipment
**Change:** Add equipment device IDs to inventory items (already in type definition but not used)

```typescript
interface InventoryItem {
  // ... existing fields
  equipmentDeviceIds?: string[] // ✅ Already defined, needs implementation
  burnRatePerWeek?: number // ✅ Already defined, needs implementation
  currentQuantity?: number // ✅ Already defined, needs implementation
  minQuantity?: number // ✅ Already defined, needs implementation
}
```

**Implementation:**
- Equipment supplies reference inventory items via `inventoryItemId`
- Inventory items track which equipment uses them via `equipmentDeviceIds[]`
- Single source of truth for quantities and burn rates
- Equipment supplies become "consumption profiles" per device

#### 1.2 Unified Burn Rate System
**Change:** Calculate burn rates from actual usage across all equipment

```typescript
// Equipment consumption profile
interface EquipmentSupply {
  id: string
  name: string
  inventoryItemId: string // ✅ Link to inventory
  burnPerWeek: number // Device-specific burn rate
  qty: number // Current quantity for THIS device
  minQty: number // Reorder threshold for THIS device
  price: number // Unit price
  chargeToAccountId?: string // ✅ NEW: Which project pays for this device's consumption
  chargeToProjectId?: string // ✅ NEW: Master project
}

// Inventory item aggregates across all equipment
interface InventoryItem {
  // ... existing
  totalBurnRate: number // Sum of burn rates from all equipment
  weeksTillEmpty: number // Calculated: currentQuantity / totalBurnRate
  nextReorderDate: Date // Calculated: today + (weeks * 7)
  usedByEquipment: Array<{
    deviceId: string
    deviceName: string
    burnPerWeek: number
    chargeToProject: string
  }>
}
```

#### 1.3 Project-Based Charging
**Change:** Make project/account charging required and device-specific

```typescript
interface EquipmentSupplyUsage {
  equipmentId: string
  supplyId: string
  inventoryItemId: string
  projectId: string // ✅ Master project using this equipment
  accountId: string // ✅ Funding account to charge
  burnPerWeek: number // Usage rate for this project on this device
  startDate: string
  endDate?: string // When project stopped using device
}
```

**Benefits:**
- Track which project pays for reagents on shared equipment
- Generate accurate project expense reports
- See total cost per project per device
- Historical tracking of equipment usage by project

---

### Phase 2: Bulk Upload & Import

#### 2.1 CSV/Excel Import Component

**File Format Support:**
```csv
Product Name,Catalog Number,Category,Subcategory,Supplier,Price,Current Qty,Min Qty,Burn Rate,Equipment Devices,Charge To Project
Taq Polymerase,EP0402,Molecular Biology,PCR Reagents,ThermoFisher,45.50,10,3,2,"PCR Machine 1, PCR Machine 2",PRJ-001
...
```

**Component Features:**
- File upload (CSV, XLSX, TSV)
- Column mapping UI (drag columns to match fields)
- Preview table with validation
- Error highlighting (missing required fields, invalid data)
- Bulk validation before import
- Duplicate detection with merge options
- Equipment device name matching (fuzzy search)
- Project name matching with dropdown

**UI Flow:**
```
1. Upload File → 2. Map Columns → 3. Preview & Validate → 4. Confirm Import
```

#### 2.2 Template Generation
**Feature:** Download pre-formatted templates with current equipment/project names

```typescript
function generateInventoryTemplate(): CSV {
  return {
    headers: [
      "Product Name*",
      "Catalog Number*",
      "Category",
      "Subcategory",
      "Supplier",
      "Price (£)",
      "Current Quantity*",
      "Min Quantity*",
      "Burn Rate (per week)",
      "Equipment Devices (comma separated)",
      "Charge To Project",
      "Notes"
    ],
    rows: [
      // Example row
      ["Taq Polymerase", "EP0402", "Molecular Biology", "PCR Reagents", "ThermoFisher", "45.50", "10", "3", "2", "PCR-1, PCR-2", "Cancer Research Grant", ""],
    ],
    // Include lists of current equipment and projects for reference
    metadata: {
      availableEquipment: devices.map(d => d.name),
      availableProjects: masterProjects.map(p => p.name),
    }
  }
}
```

---

### Phase 3: Smart Reordering System

#### 3.1 Automatic Reorder Suggestions

**Algorithm:**
```typescript
interface ReorderSuggestion {
  inventoryItemId: string
  itemName: string
  currentQty: number
  minQty: number
  totalBurnRate: number
  weeksTillEmpty: number
  suggestedOrderQty: number // 4 weeks supply
  priority: 'urgent' | 'high' | 'medium' | 'low'
  affectedEquipment: string[] // Device names
  affectedProjects: string[] // Project names
  estimatedCost: number
  chargeToAccounts: Array<{
    accountId: string
    accountName: string
    percentage: number // Based on burn rate split
    amount: number
  }>
}

function calculateReorderSuggestions(
  inventory: InventoryItem[],
  equipment: EquipmentDevice[]
): ReorderSuggestion[] {
  return inventory
    .map(item => {
      const weeksTillEmpty = item.currentQuantity / item.totalBurnRate
      const devicesUsingItem = equipment.filter(d =>
        d.supplies.some(s => s.inventoryItemId === item.id)
      )

      return {
        inventoryItemId: item.id,
        itemName: item.productName,
        currentQty: item.currentQuantity,
        minQty: item.minQuantity,
        totalBurnRate: item.totalBurnRate,
        weeksTillEmpty,
        suggestedOrderQty: Math.ceil(item.totalBurnRate * 4), // 4 weeks supply
        priority: weeksTillEmpty < 1 ? 'urgent' :
                  weeksTillEmpty < 2 ? 'high' :
                  weeksTillEmpty < 3 ? 'medium' : 'low',
        affectedEquipment: devicesUsingItem.map(d => d.name),
        affectedProjects: [...] // Extract from equipment supplies
        estimatedCost: item.priceExVAT * Math.ceil(item.totalBurnRate * 4),
        chargeToAccounts: calculateAccountSplit(item, devicesUsingItem)
      }
    })
    .filter(s => s.weeksTillEmpty < 4) // Only show items running low
    .sort((a, b) => a.weeksTillEmpty - b.weeksTillEmpty)
}
```

#### 3.2 One-Click Ordering

**UI Component:**
```tsx
<ReorderSuggestionsPanel>
  {suggestions.map(suggestion => (
    <SuggestionCard key={suggestion.inventoryItemId} className={`priority-${suggestion.priority}`}>
      <AlertIcon priority={suggestion.priority} />
      <ItemInfo>
        <h3>{suggestion.itemName}</h3>
        <StockInfo>
          <ProgressBar value={suggestion.currentQty} max={suggestion.minQty * 2} />
          <Text>{suggestion.weeksTillEmpty.toFixed(1)} weeks remaining</Text>
        </StockInfo>
      </ItemInfo>

      <UsageInfo>
        <Label>Used by:</Label>
        <Chips>{suggestion.affectedEquipment.map(name => <Chip>{name}</Chip>)}</Chips>
      </UsageInfo>

      <OrderInfo>
        <Label>Suggested order:</Label>
        <Text>{suggestion.suggestedOrderQty} units (£{suggestion.estimatedCost.toFixed(2)})</Text>
        <AccountSplit accounts={suggestion.chargeToAccounts} />
      </OrderInfo>

      <Actions>
        <Button onClick={() => createOrderFromSuggestion(suggestion)} variant="primary">
          Create Order
        </Button>
        <Button onClick={() => createTaskFromSuggestion(suggestion)} variant="outline">
          Add to Todo
        </Button>
        <Button onClick={() => dismissSuggestion(suggestion)} variant="ghost">
          Dismiss
        </Button>
      </Actions>
    </SuggestionCard>
  ))}
</ReorderSuggestionsPanel>
```

---

### Phase 4: Day-to-Day Integration

#### 4.1 Automatic Task Creation

**Task Types:**
```typescript
enum EquipmentTaskType {
  MAINTENANCE = "equipment_maintenance",
  REORDER = "equipment_reorder",
  SUPPLY_CHECK = "equipment_supply_check",
  CALIBRATION = "equipment_calibration",
}

interface DayToDayTask {
  // ... existing fields
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

**Auto-creation Logic:**
```typescript
// Run daily
function generateEquipmentTasks(
  equipment: EquipmentDevice[],
  inventory: InventoryItem[],
  currentUser: PersonProfile
): DayToDayTask[] {
  const tasks: DayToDayTask[] = []

  // Maintenance tasks
  equipment.forEach(device => {
    const health = calculateMaintenanceHealth(device)
    if (health <= device.threshold) {
      tasks.push({
        id: `maint-${device.id}`,
        title: `Perform maintenance on ${device.name}`,
        description: `Maintenance health at ${health}%. Last maintained: ${device.lastMaintained}`,
        status: 'todo',
        priority: health < 25 ? 'urgent' : 'high',
        dueDate: new Date(device.lastMaintained).getTime() + (device.maintenanceDays * 24 * 60 * 60 * 1000),
        assignedTo: device.maintenanceResponsibleId || currentUser.id,
        equipmentId: device.id,
        taskType: EquipmentTaskType.MAINTENANCE,
        metadata: { maintenanceHealth: health }
      })
    }
  })

  // Reorder tasks
  const suggestions = calculateReorderSuggestions(inventory, equipment)
  suggestions.filter(s => s.priority === 'urgent' || s.priority === 'high').forEach(suggestion => {
    tasks.push({
      id: `reorder-${suggestion.inventoryItemId}`,
      title: `Reorder ${suggestion.itemName}`,
      description: `${suggestion.weeksTillEmpty.toFixed(1)} weeks remaining. Order ${suggestion.suggestedOrderQty} units.`,
      status: 'todo',
      priority: suggestion.priority,
      dueDate: Date.now() + (suggestion.weeksTillEmpty * 7 * 24 * 60 * 60 * 1000),
      assignedTo: getLabManagerId() || currentUser.id,
      inventoryItemId: suggestion.inventoryItemId,
      taskType: EquipmentTaskType.REORDER,
      metadata: {
        weeksRemaining: suggestion.weeksTillEmpty,
        suggestedQty: suggestion.suggestedOrderQty,
        estimatedCost: suggestion.estimatedCost
      }
    })
  })

  return tasks
}
```

#### 4.2 Task Completion Actions

**From Day-to-Day Board:**
```tsx
<TaskCard task={task}>
  {task.taskType === EquipmentTaskType.MAINTENANCE && (
    <MaintenanceActions>
      <Button onClick={() => recordMaintenance(task.equipmentId)}>
        Mark Maintenance Complete
      </Button>
      <Link href={`/equipment/${task.equipmentId}/sops`}>
        View SOPs
      </Link>
    </MaintenanceActions>
  )}

  {task.taskType === EquipmentTaskType.REORDER && (
    <ReorderActions>
      <Button onClick={() => createOrderFromTask(task)}>
        Create Order Now
      </Button>
      <Button onClick={() => viewInventoryItem(task.inventoryItemId)}>
        Check Stock
      </Button>
      <Input
        type="number"
        placeholder="Qty to order"
        defaultValue={task.metadata?.suggestedQty}
      />
    </ReorderActions>
  )}
</TaskCard>
```

---

### Phase 5: Mobile-Responsive Design

#### 5.1 Equipment Panel Responsiveness

**Issues:**
- Wide tables don't fit on mobile
- Too many columns visible at once
- Actions buttons too small on touchscreens

**Solution: Card-based layout for mobile**
```tsx
{/* Desktop: Table */}
<div className="hidden lg:block">
  <table className="equipment-table">
    {/* ... existing table */}
  </table>
</div>

{/* Mobile/Tablet: Cards */}
<div className="lg:hidden space-y-4">
  {devices.map(device => (
    <EquipmentCard key={device.id} device={device}>
      <CardHeader>
        {device.imageUrl && <DeviceImage src={device.imageUrl} />}
        <DeviceInfo>
          <h3>{device.name}</h3>
          <Text className="text-sm text-gray-600">{device.make} {device.model}</Text>
        </DeviceInfo>
        <StatusBadge status={getDeviceStatus(device)} />
      </CardHeader>

      <CardBody>
        <HealthMeters>
          <HealthMeter
            label="Maintenance"
            value={maintenanceHealth(device)}
            threshold={device.threshold}
          />
          <HealthMeter
            label="Supplies"
            value={suppliesHealth(device)}
            threshold={60}
          />
        </HealthMeters>

        <SuppliesList>
          {device.supplies.map(supply => (
            <SupplyRow key={supply.id}>
              <Text>{supply.name}</Text>
              <ProgressBar value={supply.qty} max={supply.minQty * 2} />
              <Text className="text-xs">{weeksRemaining(supply).toFixed(1)}w</Text>
            </SupplyRow>
          ))}
        </SuppliesList>
      </CardBody>

      <CardActions>
        <Button size="sm" onClick={() => editDevice(device)}>Edit</Button>
        <Button size="sm" onClick={() => recordMaintenance(device)}>Maintenance</Button>
        <Button size="sm" onClick={() => viewSOPs(device)}>SOPs</Button>
      </CardActions>
    </EquipmentCard>
  ))}
</div>
```

#### 5.2 Inventory Panel Responsiveness

**Solution: Horizontal scroll with sticky columns**
```tsx
<div className="overflow-x-auto">
  <table className="min-w-[640px]">
    <thead>
      <tr>
        <th className="sticky left-0 bg-white z-10">Product</th>
        <th className="hidden md:table-cell">CAT#</th>
        <th>Level</th>
        <th className="hidden lg:table-cell">Equipment</th>
        <th className="hidden lg:table-cell">Project</th>
        <th className="hidden md:table-cell">Price</th>
        <th className="sticky right-0 bg-white z-10">Actions</th>
      </tr>
    </thead>
    {/* ... */}
  </table>
</div>
```

**Mobile inventory cards:**
```tsx
<div className="lg:hidden">
  {inventory.map(item => (
    <InventoryCard>
      <CardHeader>
        <ItemName>{item.productName}</ItemName>
        <LevelIndicator level={item.inventoryLevel} />
      </CardHeader>
      <CardBody className="text-sm space-y-2">
        <Detail label="CAT#" value={item.catNum} />
        <Detail label="Used by" value={item.equipmentDeviceIds?.join(", ")} />
        <Detail label="Project" value={item.projectName} />
        <ProgressBar value={item.currentQuantity} max={item.minQuantity * 2} />
        <Text>{item.currentQuantity} / {item.minQuantity} units</Text>
      </CardBody>
      <CardActions>
        <Button size="sm">Reorder</Button>
        <Button size="sm">Edit</Button>
      </CardActions>
    </InventoryCard>
  ))}
</div>
```

---

## 🎯 Implementation Priority

### Priority 1 (Critical - Week 1)
1. ✅ Document issues (this file)
2. 🔨 Link inventory items to equipment devices
3. 🔨 Implement unified burn rate calculations
4. 🔨 Add project charging to equipment supplies
5. 🔨 Create bulk CSV/Excel upload component

### Priority 2 (High - Week 2)
6. 🔨 Build reorder suggestion system
7. 🔨 Add one-click order creation from suggestions
8. 🔨 Integrate with day-to-day task board
9. 🔨 Make equipment panel responsive (mobile cards)
10. 🔨 Make inventory panel responsive (mobile cards)

### Priority 3 (Medium - Week 3)
11. 🔨 Add burn rate visualization/charts
12. 🔨 Create equipment supply usage reports per project
13. 🔨 Add batch operations (bulk reorder, bulk update)
14. 🔨 Improve supply check stock UI
15. 🔨 Add inventory item history tracking

---

## 📋 User Workflows (After Improvements)

### Workflow 1: Daily Lab Manager Routine
```
1. Open dashboard → See Day-to-Day Board
2. Auto-generated tasks visible:
   - "Reorder Taq Polymerase (1.2 weeks remaining)" [HIGH]
   - "Maintenance: PCR Machine 1 (health 35%)" [URGENT]
3. Click "Reorder Taq Polymerase" task
4. See suggestion: Order 8 units, £364 total
   - Split: Cancer Project (60%, £218.40), Diabetes Project (40%, £145.60)
5. Click "Create Order" → Order created, charged to both projects
6. Task automatically marked complete
```

### Workflow 2: Adding New Inventory (Bulk)
```
1. Export current inventory list → Get CSV template
2. Lab manager fills Excel with new reagents from supplier catalog
3. Click "Upload Inventory" → Choose file
4. Map columns (drag "Product Name" to "Product Name" field)
5. Preview shows 47 items, 2 errors (missing prices)
6. Fix errors in preview table
7. Select equipment for each reagent type (multi-select)
8. Assign projects for charging
9. Click "Import" → All 47 items added to inventory
10. System automatically calculates burn rates from equipment usage
```

### Workflow 3: Equipment Maintenance
```
1. Equipment panel shows PCR Machine 1 at 30% health (red)
2. Click "Record Maintenance" button
3. Modal opens:
   - Last maintained: 2025-09-15 (50 days ago)
   - Next due: 2025-10-25 (overdue)
   - Checklist from SOP automatically loaded
4. Check off maintenance items
5. Optional: Upload photos, add notes
6. Click "Complete Maintenance"
7. Equipment health resets to 100%
8. Day-to-day task automatically marked complete
9. Maintenance log entry created with timestamp
```

### Workflow 4: Project Expense Tracking
```
1. Click project "Cancer Research Grant"
2. Navigate to "Expenses" tab
3. See breakdown:
   - Equipment consumables: £2,450
     - PCR Machine 1: £1,200 (Taq, primers, tubes)
     - Gel Electrophoresis: £450 (agarose, buffers)
     - Centrifuge: £800 (tubes, reagents)
   - Orders: £1,350
   - Total: £3,800
4. Drill down to PCR Machine 1
5. See weekly burn rates, cost trends chart
6. Export report for grant accounting
```

---

## 🚀 Next Steps

1. **Review this document with lab users** - Get feedback on workflows
2. **Create technical specification** - Detailed API and component specs
3. **Build core linking system** - Priority 1 items
4. **Build bulk upload** - Priority 1 item 5
5. **Test with real lab data** - Import actual spreadsheet
6. **Iterate based on feedback** - Refine UX

---

**Questions for Lab Users:**

1. What format are your current inventory spreadsheets? (Excel, Google Sheets, CSV)
2. What information do you track that's not in the current system?
3. How do you currently handle reagents used by multiple equipment/projects?
4. Who should be assigned maintenance tasks vs reorder tasks?
5. What's the most painful part of current inventory management?
6. How often do you check equipment status? (daily, weekly)
7. Do you need historical tracking of consumption rates?
8. Should the system send email/SMS notifications for urgent tasks?

---

**Status:** 📝 **Document Complete - Ready for Implementation**
