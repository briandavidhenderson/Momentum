# Equipment Booking System Integration Plan

## Overview

This document outlines the design and implementation strategy for an Equipment Booking System that seamlessly integrates with Momentum's existing Equipment, Calendar, Inventory, and Task management systems.

### Objectives

- **Resource Optimization**: Prevent equipment scheduling conflicts and maximize utilization
- **Seamless Integration**: Work harmoniously with existing equipment, calendar, inventory, and task collections
- **Maintenance Awareness**: Automatically block booking slots during scheduled maintenance
- **Supply Tracking**: Link bookings to inventory consumption for better supply management
- **Task Coordination**: Connect bookings with project tasks and day-to-day activities
- **User Experience**: Provide intuitive booking interface with conflict detection and notifications

---

## 1. Database Schema

### 1.1 New Collection: `equipmentBookings`

```typescript
/**
 * EquipmentBooking - Represents a reservation for equipment usage
 * Collection: equipmentBookings
 */
export interface EquipmentBooking {
  id: string

  // Equipment Reference
  equipmentId: string              // Links to equipment/{equipmentId}
  equipmentName: string            // Denormalized for quick display

  // Booking Details
  title: string                    // e.g., "RNA extraction for Project X"
  description?: string             // Additional details about the booking

  // Time Window
  startTime: Date                  // Booking start (ISO timestamp)
  endTime: Date                    // Booking end (ISO timestamp)
  allDay?: boolean                 // True for all-day bookings

  // User & Lab
  bookedBy: string                 // PersonProfile ID who made the booking
  bookedByName: string             // Denormalized for display
  labId: string                    // Lab ID for multi-tenancy

  // Status Management
  status: BookingStatus            // "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"

  // Recurrence (Optional)
  recurrence?: RecurrenceRule      // Reuse CalendarEvent recurrence logic
  parentBookingId?: string         // For recurring bookings, link to parent
  isRecurring: boolean             // Quick check flag

  // Calendar Integration
  calendarEventId?: string         // Links to events/{eventId} if synced to calendar
  autoCreateCalendarEvent: boolean // Should this create a calendar event?

  // Task Integration
  linkedTaskId?: string            // Links to dayToDayTasks/{taskId}
  linkedProjectTaskId?: string     // Links to ProjectTask
  linkedDeliverableId?: string     // Links to Deliverable

  // Inventory Integration
  expectedSupplyUsage?: Array<{
    inventoryItemId: string
    inventoryItemName: string
    estimatedQuantity: number      // How much will be consumed
  }>
  actualSupplyUsage?: Array<{      // Filled in after booking completion
    inventoryItemId: string
    actualQuantity: number
    recordedAt: Date
    recordedBy: string
  }>

  // Conflict Detection
  conflictsWith?: string[]         // IDs of bookings this conflicts with
  overrideConflict?: boolean       // Admin override for conflicts
  conflictReason?: string          // Why conflict was overridden

  // Notifications & Reminders
  reminders?: Array<{
    minutesBefore: number          // e.g., 60 for 1 hour before
    method: "email" | "push"
    sent: boolean
  }>

  // Metadata
  notes?: string                   // Additional notes
  tags?: string[]                  // Categorization tags
  attachments?: string[]           // URLs to relevant files

  // Timestamps
  createdAt: Date
  updatedAt?: Date
  createdBy: string                // User ID
  lastModifiedBy?: string          // User ID

  // Checkout/Checkin (Optional - for physical tracking)
  checkedOutAt?: Date
  checkedOutBy?: string
  checkedInAt?: Date
  checkedInBy?: string

  // Maintenance Blocking
  isMaintenanceBlock?: boolean     // True for maintenance-blocked time slots
  maintenanceDueDate?: Date        // When maintenance is due
}

/**
 * Booking Status States
 */
export type BookingStatus =
  | "pending"      // Awaiting approval (if approval required)
  | "confirmed"    // Approved and scheduled
  | "in_progress"  // Currently being used
  | "completed"    // Finished successfully
  | "cancelled"    // Cancelled by user or admin
  | "no_show"      // User didn't show up

/**
 * EquipmentBookingSettings - Per-equipment booking configuration
 * Stored as a field in EquipmentDevice
 */
export interface EquipmentBookingSettings {
  bookingEnabled: boolean          // Allow bookings for this equipment
  requireApproval: boolean         // Does booking need admin/PI approval?
  approverIds: string[]            // PersonProfile IDs who can approve
  maxBookingDuration: number       // Max hours per booking (0 = unlimited)
  minBookingDuration: number       // Min hours per booking (0 = no minimum)
  advanceBookingDays: number       // How many days ahead can users book?
  bufferTimeBefore: number         // Required minutes before booking starts
  bufferTimeAfter: number          // Required minutes after booking ends
  allowRecurring: boolean          // Can users create recurring bookings?
  autoBlockMaintenance: boolean    // Auto-block slots when maintenance due?
}
```

---

## 2. Integration with Existing Collections

### 2.1 Equipment Collection Updates

**Add to `EquipmentDevice` interface:**

```typescript
export interface EquipmentDevice {
  // ... existing fields ...

  // NEW: Booking settings
  bookingSettings?: EquipmentBookingSettings

  // NEW: Current booking status
  currentBookingId?: string        // If equipment is currently booked
  currentBookingUserId?: string    // Who is using it now
  currentBookingEndTime?: Date     // When current booking ends

  // NEW: Availability tracking
  totalBookedHours?: number        // Lifetime total booked hours
  lastBookedDate?: Date            // Last time equipment was booked
  averageBookingDuration?: number  // Average booking length in hours
  utilizationRate?: number         // Percentage of time booked (last 30 days)
}
```

**Usage:**
- Query equipment availability before creating booking
- Auto-update `currentBookingId` when booking starts
- Calculate utilization metrics for equipment management

---

### 2.2 Calendar Integration

**Strategy:** Bidirectional sync with calendar events

**When booking is created:**
1. If `autoCreateCalendarEvent = true`, create a `CalendarEvent`:
   ```typescript
   {
     title: booking.title,
     start: booking.startTime,
     end: booking.endTime,
     type: "other", // or "equipment_booking"
     description: `Equipment: ${booking.equipmentName}`,
     relatedIds: {
       equipmentBookingId: booking.id
     },
     attendees: [{
       personId: booking.bookedBy,
       response: "accepted"
     }],
     labId: booking.labId,
     createdBy: booking.createdBy
   }
   ```

2. Store `calendarEventId` in booking for reverse lookup

**Sync Rules:**
- ✅ Booking update → Update calendar event
- ✅ Calendar event deleted → Cancel booking (with user confirmation)
- ✅ Calendar event time changed → Update booking (with conflict check)
- ❌ Don't sync external calendar events → bookings (avoid circular imports)

---

### 2.3 Inventory Integration

**Supply Consumption Tracking:**

1. **Before Booking:**
   - User estimates supply usage when creating booking
   - System checks if sufficient inventory available
   - Optionally reserve supplies (soft lock)

2. **After Booking:**
   - User records actual supply consumption
   - System auto-updates `InventoryItem.currentQuantity`
   - Links consumption to booking for audit trail

**Implementation:**

```typescript
// Service method
async recordSupplyUsage(
  bookingId: string,
  usage: Array<{ inventoryItemId: string; quantity: number }>,
  recordedBy: string
) {
  const batch = db.batch()

  // Update booking
  const bookingRef = db.collection('equipmentBookings').doc(bookingId)
  batch.update(bookingRef, {
    actualSupplyUsage: usage.map(u => ({
      ...u,
      recordedAt: new Date(),
      recordedBy
    }))
  })

  // Decrement inventory
  for (const item of usage) {
    const inventoryRef = db.collection('inventory').doc(item.inventoryItemId)
    batch.update(inventoryRef, {
      currentQuantity: FieldValue.increment(-item.quantity)
    })
  }

  await batch.commit()
}
```

**Benefits:**
- Accurate consumption tracking per booking
- Better reorder predictions based on usage patterns
- Equipment-specific burn rate calculations

---

### 2.4 Task Integration

**Linking Strategy:**

#### DayToDayTask Integration:
```typescript
// When creating a booking from a task
const booking: EquipmentBooking = {
  // ... booking fields ...
  linkedTaskId: task.id,
  title: `${task.title} - Equipment Usage`,
}

// Update task with booking reference
await updateDoc(doc(db, 'dayToDayTasks', task.id), {
  linkedEquipmentBookingId: booking.id,
  metadata: {
    ...task.metadata,
    equipmentBookingTime: booking.startTime
  }
})
```

#### ProjectTask Integration:
```typescript
// Link booking to deliverable → task
const booking: EquipmentBooking = {
  // ... booking fields ...
  linkedProjectTaskId: projectTask.id,
  linkedDeliverableId: deliverable.id,
}
```

**Use Cases:**
- Task requires equipment → Create booking directly from task
- Booking completion → Auto-update task progress
- Equipment availability → Show in task planning view

---

## 3. Service Layer Design

### 3.1 Core Booking Service

**File:** `lib/services/equipmentBookingService.ts`

```typescript
export class EquipmentBookingService {
  /**
   * Create a new equipment booking with conflict detection
   */
  async createBooking(
    booking: Omit<EquipmentBooking, 'id' | 'createdAt' | 'updatedAt'>,
    options?: {
      checkConflicts?: boolean
      autoApprove?: boolean
      createCalendarEvent?: boolean
    }
  ): Promise<string> {
    // 1. Validate equipment exists and is bookable
    const equipment = await this.getEquipment(booking.equipmentId)
    if (!equipment.bookingSettings?.bookingEnabled) {
      throw new Error('Equipment is not available for booking')
    }

    // 2. Check for conflicts
    if (options?.checkConflicts !== false) {
      const conflicts = await this.checkConflicts(
        booking.equipmentId,
        booking.startTime,
        booking.endTime,
        booking.isRecurring
      )

      if (conflicts.length > 0 && !booking.overrideConflict) {
        throw new ConflictError('Booking conflicts with existing reservations', conflicts)
      }
    }

    // 3. Check maintenance schedule
    const maintenanceBlocks = await this.getMaintenanceBlocks(
      booking.equipmentId,
      booking.startTime,
      booking.endTime
    )

    if (maintenanceBlocks.length > 0) {
      throw new Error('Equipment has scheduled maintenance during this time')
    }

    // 4. Validate inventory if supply usage specified
    if (booking.expectedSupplyUsage) {
      await this.validateSupplyAvailability(booking.expectedSupplyUsage)
    }

    // 5. Create booking
    const bookingRef = doc(collection(db, 'equipmentBookings'))
    const newBooking: EquipmentBooking = {
      ...booking,
      id: bookingRef.id,
      status: options?.autoApprove ? 'confirmed' : 'pending',
      createdAt: new Date(),
      createdBy: booking.bookedBy
    }

    await setDoc(bookingRef, newBooking)

    // 6. Create calendar event if requested
    if (options?.createCalendarEvent !== false && booking.autoCreateCalendarEvent) {
      const eventId = await this.createCalendarEvent(newBooking)
      await updateDoc(bookingRef, { calendarEventId: eventId })
    }

    // 7. Send notifications
    await this.sendBookingNotification(newBooking, 'created')

    return bookingRef.id
  }

  /**
   * Check for booking conflicts
   */
  async checkConflicts(
    equipmentId: string,
    startTime: Date,
    endTime: Date,
    isRecurring: boolean = false
  ): Promise<EquipmentBooking[]> {
    // Query overlapping bookings
    const q = query(
      collection(db, 'equipmentBookings'),
      where('equipmentId', '==', equipmentId),
      where('status', 'in', ['confirmed', 'in_progress', 'pending']),
      where('endTime', '>', startTime),
      where('startTime', '<', endTime)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentBooking))
  }

  /**
   * Get maintenance blocks for equipment
   */
  async getMaintenanceBlocks(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<EquipmentBooking[]> {
    const equipment = await this.getEquipment(equipmentId)

    // Calculate next maintenance date
    const nextMaintenance = calculateNextMaintenanceDate(
      equipment.lastMaintained,
      equipment.maintenanceDays
    )

    // Check if maintenance falls within booking window
    if (nextMaintenance >= startTime && nextMaintenance <= endTime) {
      // Return virtual maintenance block
      return [{
        id: `maintenance-${equipmentId}`,
        equipmentId,
        equipmentName: equipment.name,
        title: `Scheduled Maintenance - ${equipment.name}`,
        startTime: nextMaintenance,
        endTime: addHours(nextMaintenance, 4), // Assume 4-hour maintenance
        isMaintenanceBlock: true,
        status: 'confirmed',
        bookedBy: 'system',
        bookedByName: 'System',
        labId: equipment.labId || '',
        createdAt: new Date(),
        createdBy: 'system',
        autoCreateCalendarEvent: false,
        isRecurring: false
      }]
    }

    return []
  }

  /**
   * Get equipment availability for a time range
   */
  async getAvailability(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: Date; end: Date; type: 'available' | 'booked' | 'maintenance' }>> {
    // Get all bookings in range
    const bookings = await this.getBookingsInRange(equipmentId, startDate, endDate)

    // Get maintenance blocks
    const maintenance = await this.getMaintenanceBlocks(equipmentId, startDate, endDate)

    // Merge and sort all time blocks
    const allBlocks = [
      ...bookings.map(b => ({ start: b.startTime, end: b.endTime, type: 'booked' as const })),
      ...maintenance.map(m => ({ start: m.startTime, end: m.endTime, type: 'maintenance' as const }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime())

    // Calculate available slots (gaps between bookings)
    const availableSlots: Array<{ start: Date; end: Date; type: 'available' }> = []
    let currentTime = startDate

    for (const block of allBlocks) {
      if (currentTime < block.start) {
        availableSlots.push({
          start: currentTime,
          end: block.start,
          type: 'available'
        })
      }
      currentTime = block.end > currentTime ? block.end : currentTime
    }

    // Add final slot if there's time remaining
    if (currentTime < endDate) {
      availableSlots.push({
        start: currentTime,
        end: endDate,
        type: 'available'
      })
    }

    return [...availableSlots, ...allBlocks]
  }

  /**
   * Check in/out equipment
   */
  async checkOut(bookingId: string, userId: string): Promise<void> {
    const bookingRef = doc(db, 'equipmentBookings', bookingId)
    const booking = await getDoc(bookingRef)

    if (!booking.exists()) {
      throw new Error('Booking not found')
    }

    await updateDoc(bookingRef, {
      status: 'in_progress',
      checkedOutAt: new Date(),
      checkedOutBy: userId
    })

    // Update equipment current booking
    await updateDoc(doc(db, 'equipment', booking.data().equipmentId), {
      currentBookingId: bookingId,
      currentBookingUserId: userId,
      currentBookingEndTime: booking.data().endTime
    })
  }

  async checkIn(
    bookingId: string,
    userId: string,
    supplyUsage?: Array<{ inventoryItemId: string; quantity: number }>
  ): Promise<void> {
    const bookingRef = doc(db, 'equipmentBookings', bookingId)
    const booking = await getDoc(bookingRef)

    if (!booking.exists()) {
      throw new Error('Booking not found')
    }

    // Record supply usage if provided
    if (supplyUsage && supplyUsage.length > 0) {
      await this.recordSupplyUsage(bookingId, supplyUsage, userId)
    }

    await updateDoc(bookingRef, {
      status: 'completed',
      checkedInAt: new Date(),
      checkedInBy: userId
    })

    // Clear equipment current booking
    await updateDoc(doc(db, 'equipment', booking.data().equipmentId), {
      currentBookingId: null,
      currentBookingUserId: null,
      currentBookingEndTime: null
    })
  }
}
```

---

## 4. UI Components

### 4.1 Equipment Booking Calendar View

**Component:** `components/equipment/EquipmentBookingCalendar.tsx`

**Features:**
- Week/Month view of all equipment bookings
- Color-coded by equipment type or user
- Click time slot to create booking
- Drag to resize booking duration
- Show maintenance blocks in distinct color
- Filter by equipment, user, or lab

**Integration:**
```typescript
<EquipmentBookingCalendar
  equipmentId={selectedEquipment?.id}
  labId={currentUserProfile.labId}
  onBookingCreate={(booking) => handleCreateBooking(booking)}
  onBookingClick={(booking) => setSelectedBooking(booking)}
  showMaintenanceBlocks={true}
  allowConflicts={currentUserProfile.isAdministrator}
/>
```

---

### 4.2 Quick Booking Dialog

**Component:** `components/equipment/QuickBookingDialog.tsx`

**Features:**
- Equipment selector with availability indicator
- Date/time picker with conflict highlighting
- Optional task linking
- Supply usage estimation
- Recurring booking options
- Auto-create calendar event toggle

**Form Fields:**
```typescript
interface BookingFormData {
  equipmentId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  isRecurring: boolean
  recurrencePattern?: RecurrenceRule
  linkedTaskId?: string
  expectedSupplyUsage?: Array<{ inventoryItemId: string; quantity: number }>
  autoCreateCalendarEvent: boolean
  reminders?: Array<{ minutesBefore: number; method: 'email' | 'push' }>
}
```

---

### 4.3 Equipment Availability Timeline

**Component:** `components/equipment/EquipmentAvailabilityTimeline.tsx`

**Features:**
- Horizontal timeline showing next 7-14 days
- Color-coded blocks: available (green), booked (blue), maintenance (orange)
- Hover to see booking details
- Click available slot to quick-book

---

### 4.4 My Bookings View

**Component:** `components/equipment/MyBookingsView.tsx`

**Features:**
- List/Grid view of user's bookings
- Filter by status (upcoming, in-progress, completed)
- Quick actions: Cancel, Modify, Check-in/out
- Link to related tasks and projects
- Record supply usage

---

## 5. Firestore Security Rules

**File:** `firestore.rules`

```javascript
// ============================================================================
// EQUIPMENT BOOKINGS
// ============================================================================
match /equipmentBookings/{bookingId} {
  // All authenticated users can read bookings in their lab
  allow read: if isAuthenticated() && (
    resource.data.labId == getUserLab() ||
    isAdmin()
  );

  // Users can create bookings for their lab
  allow create: if isAuthenticated() && (
    request.resource.data.bookedBy == getUserProfileId() &&
    request.resource.data.labId == getUserLab() &&
    request.resource.data.createdBy == request.auth.uid
  );

  // Users can update their own bookings
  // Admins and equipment managers can update any
  allow update: if isAuthenticated() && (
    resource.data.bookedBy == getUserProfileId() ||
    isAdmin() ||
    isEquipmentManager(resource.data.equipmentId)
  );

  // Only booking owner, admin, or equipment manager can delete
  allow delete: if isAuthenticated() && (
    resource.data.bookedBy == getUserProfileId() ||
    isAdmin() ||
    isEquipmentManager(resource.data.equipmentId)
  );
}

// Helper: Check if user is equipment manager
function isEquipmentManager(equipmentId) {
  let equipment = get(/databases/$(database)/documents/equipment/$(equipmentId));
  let profileId = getUserProfileId();
  return equipment.data.managerId == profileId ||
         profileId in equipment.data.managerIds;
}
```

---

## 6. Conflict Detection & Resolution

### 6.1 Conflict Types

1. **Overlapping Bookings**: Two bookings for same equipment at overlapping times
2. **Maintenance Conflicts**: Booking during scheduled maintenance
3. **Insufficient Supplies**: Not enough inventory for estimated usage
4. **Buffer Time Violations**: Booking doesn't respect required buffer time

### 6.2 Conflict Resolution Strategies

**Automatic:**
- Check all conflicts before creating booking
- Suggest alternative time slots
- Auto-adjust to nearest available slot

**Manual Override:**
- Admin can override conflicts with reason
- Store override in `overrideConflict` and `conflictReason` fields
- Log all overrides in audit trail

**Soft Conflicts vs Hard Conflicts:**
- **Hard**: Cannot be overridden (maintenance, equipment broken)
- **Soft**: Can be overridden by admin (double-booking with approval)

---

## 7. Notifications & Reminders

### 7.1 Notification Events

```typescript
type BookingNotificationEvent =
  | 'booking_created'       // New booking created
  | 'booking_confirmed'     // Booking approved
  | 'booking_cancelled'     // Booking cancelled
  | 'booking_modified'      // Booking time/details changed
  | 'booking_starting_soon' // Reminder X minutes before
  | 'booking_no_show'       // User didn't check in
  | 'booking_overdue'       // User didn't check out
  | 'conflict_detected'     // Conflict with another booking
  | 'maintenance_due'       // Maintenance approaching during booking
```

### 7.2 Implementation

**Service:** `lib/services/bookingNotificationService.ts`

```typescript
export async function sendBookingNotification(
  booking: EquipmentBooking,
  event: BookingNotificationEvent,
  recipientIds?: string[]
) {
  const notification: Notification = {
    id: generateId(),
    userId: booking.bookedBy,
    type: 'booking',
    title: getNotificationTitle(event, booking),
    message: getNotificationMessage(event, booking),
    link: `/equipment/bookings/${booking.id}`,
    read: false,
    createdAt: new Date(),
    metadata: {
      bookingId: booking.id,
      equipmentId: booking.equipmentId,
      event
    }
  }

  // Send to booking creator
  await createNotification(notification)

  // Send to additional recipients if specified
  if (recipientIds) {
    for (const recipientId of recipientIds) {
      await createNotification({ ...notification, userId: recipientId })
    }
  }

  // Send email if user has email notifications enabled
  if (await userHasEmailEnabled(booking.bookedBy)) {
    await sendEmail({
      to: await getUserEmail(booking.bookedBy),
      subject: notification.title,
      body: notification.message
    })
  }
}
```

---

## 8. Best Practices & Implementation Steps

### 8.1 Phase 1: Foundation (Week 1-2)

1. **Database Schema**
   - [ ] Create `equipmentBookings` collection
   - [ ] Add `bookingSettings` to `EquipmentDevice`
   - [ ] Update Firestore security rules
   - [ ] Create TypeScript interfaces

2. **Core Service**
   - [ ] Implement `EquipmentBookingService`
   - [ ] Add conflict detection logic
   - [ ] Add maintenance block calculation
   - [ ] Write unit tests

3. **Basic UI**
   - [ ] Create `QuickBookingDialog` component
   - [ ] Add "Book Equipment" button to equipment management
   - [ ] Implement basic booking list view

### 8.2 Phase 2: Integration (Week 3-4)

4. **Calendar Integration**
   - [ ] Auto-create calendar events from bookings
   - [ ] Sync booking updates to calendar
   - [ ] Handle calendar event deletions

5. **Inventory Integration**
   - [ ] Add supply usage estimation to booking form
   - [ ] Implement supply consumption recording
   - [ ] Add inventory checks before booking

6. **Task Integration**
   - [ ] Add "Book Equipment" action to tasks
   - [ ] Link bookings to deliverables
   - [ ] Show equipment availability in task planning

### 8.3 Phase 3: Advanced Features (Week 5-6)

7. **Availability View**
   - [ ] Build `EquipmentBookingCalendar` component
   - [ ] Add `EquipmentAvailabilityTimeline`
   - [ ] Implement drag-to-book functionality

8. **Notifications**
   - [ ] Set up booking notifications
   - [ ] Add reminder system
   - [ ] Implement conflict alerts

9. **Analytics**
   - [ ] Calculate equipment utilization rates
   - [ ] Track average booking duration
   - [ ] Generate usage reports

### 8.4 Phase 4: Polish (Week 7-8)

10. **UX Enhancements**
    - [ ] Add booking templates for common uses
    - [ ] Implement quick-rebook functionality
    - [ ] Add booking history view

11. **Admin Features**
    - [ ] Booking approval workflow
    - [ ] Conflict override interface
    - [ ] Equipment manager dashboard

12. **Testing & Documentation**
    - [ ] End-to-end testing
    - [ ] User documentation
    - [ ] Training materials

---

## 9. Advanced Features (Future)

### 9.1 Smart Scheduling

```typescript
/**
 * AI-powered booking suggestions
 */
async function suggestOptimalBookingTime(
  equipmentId: string,
  duration: number,
  preferredTimeRange: { start: Date; end: Date }
): Promise<Array<{ start: Date; end: Date; score: number }>> {
  // Analyze historical patterns
  // Consider user's typical working hours
  // Avoid peak usage times
  // Maximize equipment utilization
  // Return sorted suggestions by score
}
```

### 9.2 Equipment Chains

```typescript
/**
 * Book multiple equipment in sequence
 * e.g., Centrifuge → Spectrophotometer → Plate Reader
 */
interface EquipmentChain {
  id: string
  name: string
  steps: Array<{
    equipmentId: string
    duration: number
    bufferAfter: number
  }>
}
```

### 9.3 Group Bookings

```typescript
/**
 * Book equipment for a team
 */
interface GroupBooking extends EquipmentBooking {
  isGroup: boolean
  participants: string[]        // PersonProfile IDs
  coordinator: string           // Who manages the booking
}
```

### 9.4 Booking Templates

```typescript
/**
 * Reusable booking templates
 */
interface BookingTemplate {
  id: string
  name: string
  description: string
  equipmentId: string
  defaultDuration: number
  expectedSupplies: Array<{
    inventoryItemId: string
    quantity: number
  }>
  defaultReminders: Array<{
    minutesBefore: number
    method: 'email' | 'push'
  }>
  createdBy: string
  isPublic: boolean             // Available to all lab members
}
```

---

## 10. Example Workflows

### 10.1 Simple Booking

```typescript
// User books equipment for tomorrow
const bookingService = new EquipmentBookingService()

const bookingId = await bookingService.createBooking({
  equipmentId: 'eq-123',
  equipmentName: 'PCR Machine',
  title: 'DNA amplification for Project Alpha',
  startTime: addDays(new Date(), 1, 9, 0),  // Tomorrow at 9 AM
  endTime: addDays(new Date(), 1, 11, 0),   // Tomorrow at 11 AM
  bookedBy: currentUserProfile.id,
  bookedByName: currentUserProfile.name,
  labId: currentUserProfile.labId,
  autoCreateCalendarEvent: true,
  expectedSupplyUsage: [
    { inventoryItemId: 'inv-456', inventoryItemName: 'PCR Mix', estimatedQuantity: 10 }
  ],
  reminders: [
    { minutesBefore: 60, method: 'email', sent: false }
  ]
}, {
  checkConflicts: true,
  createCalendarEvent: true,
  autoApprove: true
})
```

### 10.2 Recurring Weekly Booking

```typescript
// User books equipment every Monday for 4 weeks
const bookingId = await bookingService.createBooking({
  equipmentId: 'eq-123',
  equipmentName: 'Microscope',
  title: 'Weekly cell imaging',
  startTime: nextMonday(new Date(), 14, 0),   // Next Monday at 2 PM
  endTime: nextMonday(new Date(), 16, 0),     // Next Monday at 4 PM
  bookedBy: currentUserProfile.id,
  bookedByName: currentUserProfile.name,
  labId: currentUserProfile.labId,
  isRecurring: true,
  recurrence: {
    frequency: 'weekly',
    interval: 1,
    byWeekday: ['monday'],
    occurrenceCount: 4
  },
  autoCreateCalendarEvent: true
})
```

### 10.3 Booking with Task Link

```typescript
// Create booking from a task
const taskBookingId = await bookingService.createBookingFromTask(
  taskId: 'task-789',
  equipmentId: 'eq-123',
  startTime: new Date('2025-12-01T10:00:00'),
  endTime: new Date('2025-12-01T12:00:00')
)

// Task is automatically linked to booking
// Booking completion updates task progress
```

---

## 11. Monitoring & Analytics

### 11.1 Key Metrics

```typescript
interface EquipmentBookingMetrics {
  // Utilization
  utilizationRate: number          // % of time booked vs available
  averageBookingDuration: number   // Hours
  totalBookedHours: number

  // User Behavior
  noShowRate: number               // % of bookings where user didn't check in
  averageAdvanceBooking: number    // Days between booking creation and start
  cancellationRate: number         // % of bookings cancelled

  // Conflicts
  conflictCount: number
  conflictResolutionTime: number   // Average minutes to resolve

  // Supply Usage
  averageSupplyConsumption: Map<string, number>  // Per inventory item
  supplyUsageAccuracy: number      // Estimated vs actual variance
}
```

### 11.2 Dashboard Queries

```typescript
// Get equipment utilization for last 30 days
async function getEquipmentUtilization(equipmentId: string): Promise<number> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const bookings = await getDocs(
    query(
      collection(db, 'equipmentBookings'),
      where('equipmentId', '==', equipmentId),
      where('startTime', '>=', thirtyDaysAgo),
      where('status', 'in', ['confirmed', 'completed', 'in_progress'])
    )
  )

  const totalBookedMinutes = bookings.docs.reduce((sum, doc) => {
    const booking = doc.data() as EquipmentBooking
    return sum + differenceInMinutes(booking.endTime, booking.startTime)
  }, 0)

  const totalMinutesInPeriod = 30 * 24 * 60
  return (totalBookedMinutes / totalMinutesInPeriod) * 100
}
```

---

## 12. Migration Strategy

### 12.1 For Existing Equipment

```typescript
/**
 * Migration script to add booking settings to existing equipment
 */
async function migrateEquipmentForBooking() {
  const equipmentSnapshot = await getDocs(collection(db, 'equipment'))

  const batch = writeBatch(db)

  for (const doc of equipmentSnapshot.docs) {
    const defaultSettings: EquipmentBookingSettings = {
      bookingEnabled: true,
      requireApproval: false,
      approverIds: [],
      maxBookingDuration: 8,           // 8 hours default max
      minBookingDuration: 0.5,         // 30 minutes default min
      advanceBookingDays: 14,          // Can book 2 weeks ahead
      bufferTimeBefore: 0,
      bufferTimeAfter: 15,             // 15 min buffer after booking
      allowRecurring: true,
      autoBlockMaintenance: true
    }

    batch.update(doc.ref, {
      bookingSettings: defaultSettings,
      currentBookingId: null,
      totalBookedHours: 0,
      utilizationRate: 0
    })
  }

  await batch.commit()
  console.log(`Migrated ${equipmentSnapshot.docs.length} equipment items`)
}
```

---

## Summary

This equipment booking system design provides:

✅ **Comprehensive booking management** with conflict detection
✅ **Seamless integration** with equipment, calendar, inventory, and tasks
✅ **Flexible scheduling** with recurring bookings and maintenance awareness
✅ **Supply tracking** for better inventory management
✅ **User-friendly** booking interface with availability visualization
✅ **Robust security** with Firestore rules
✅ **Smart notifications** for reminders and conflicts
✅ **Analytics** for equipment utilization optimization

**Next Steps:**
1. Review and approve this design
2. Start with Phase 1 implementation (Foundation)
3. Iterate based on user feedback
4. Expand with advanced features as needed

