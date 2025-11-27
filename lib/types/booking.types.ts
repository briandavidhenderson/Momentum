/**
 * Equipment Booking System Types
 *
 * Types for managing equipment reservations, conflicts, and integrations
 * with calendar, inventory, and task systems.
 */

import { RecurrenceRule } from './calendar.types'

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
  status: BookingStatus            // Current booking status

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
  linkedProjectId?: string         // Links to MasterProject
  linkedProjectName?: string       // Denormalized project name

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

import { Timestamp } from 'firebase/firestore'

/**
 * Firestore representation of EquipmentBooking
 * Dates stored as Firestore Timestamps
 *
 * Note: EquipmentBookingSettings is defined in equipment.types.ts
 */
export interface FirestoreEquipmentBooking extends Omit<EquipmentBooking,
  'startTime' | 'endTime' | 'createdAt' | 'updatedAt' | 'checkedOutAt' | 'checkedInAt' | 'maintenanceDueDate' |
  'actualSupplyUsage' | 'expectedSupplyUsage'
> {
  startTime: Timestamp  // Firestore Timestamp
  endTime: Timestamp    // Firestore Timestamp
  createdAt: Timestamp  // Firestore Timestamp
  updatedAt?: Timestamp // Firestore Timestamp
  checkedOutAt?: Timestamp  // Firestore Timestamp
  checkedInAt?: Timestamp   // Firestore Timestamp
  maintenanceDueDate?: Timestamp  // Firestore Timestamp

  expectedSupplyUsage?: Array<{
    inventoryItemId: string
    inventoryItemName: string
    estimatedQuantity: number
  }>

  actualSupplyUsage?: Array<{
    inventoryItemId: string
    actualQuantity: number
    recordedAt: Timestamp  // Firestore Timestamp
    recordedBy: string
  }>
}

/**
 * Booking notification events
 */
export type BookingNotificationEvent =
  | 'booking_created'       // New booking created
  | 'booking_confirmed'     // Booking approved
  | 'booking_cancelled'     // Booking cancelled
  | 'booking_modified'      // Booking time/details changed
  | 'booking_starting_soon' // Reminder X minutes before
  | 'booking_no_show'       // User didn't check in
  | 'booking_overdue'       // User didn't check out
  | 'conflict_detected'     // Conflict with another booking
  | 'maintenance_due'       // Maintenance approaching during booking

/**
 * Availability slot type
 */
export interface AvailabilitySlot {
  start: Date
  end: Date
  type: 'available' | 'booked' | 'maintenance'
  bookingId?: string  // If type is 'booked', reference to the booking
  bookedByName?: string // Name of the person who booked it
}

/**
 * Booking form data for UI
 */
export interface BookingFormData {
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

/**
 * Equipment utilization metrics
 */
export interface EquipmentBookingMetrics {
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

/**
 * Booking template for reusable patterns
 */
export interface BookingTemplate {
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
