"use client"

import { useState, useEffect } from "react"
import { useAppContext } from "@/lib/AppContext"
import { EquipmentStatusPanel } from "@/components/EquipmentStatusPanel"
import { MyBookingsView } from "@/components/equipment/MyBookingsView"
import { EquipmentAvailabilityTimeline } from "@/components/equipment/EquipmentAvailabilityTimeline"
import { QuickBookingDialog } from "@/components/equipment/QuickBookingDialog"
import { EnableBookingButton } from "@/components/admin/EnableBookingButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { EquipmentDevice } from "@/lib/types/equipment.types"

export function EquipmentManagement() {
  const {
    equipment,
    inventory,
    orders,
    projects,
    currentUserProfile,
    allProfiles,
    handleCreateEquipment,
    handleUpdateEquipment,
    handleCreateOrder,
    handleCreateDayToDayTask,
    userBookings,
    selectedEquipmentForBooking,
    setSelectedEquipmentForBooking,
    refreshBookings,
  } = useAppContext()

  const toast = useToast()

  // State for managing booking dialog and tabs
  const [activeTab, setActiveTab] = useState<"status" | "bookings" | "availability">("status")
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [bookingDefaults, setBookingDefaults] = useState<{
    startTime?: Date
    endTime?: Date
  } | null>(null)
  // For availability timeline - track which equipment to show
  const [selectedEquipmentForTimeline, setSelectedEquipmentForTimeline] = useState<EquipmentDevice | null>(null)

  // Set initial equipment for timeline when equipment loads
  useEffect(() => {
    if (!selectedEquipmentForTimeline && equipment && equipment.length > 0) {
      setSelectedEquipmentForTimeline(equipment[0])
      setSelectedEquipmentForBooking(equipment[0])
    }
  }, [equipment, selectedEquipmentForTimeline, setSelectedEquipmentForBooking])

  // Legacy compatibility: onInventoryUpdate expects array but we now update items individually
  const handleInventoryUpdate = (_updatedInventory: any[]) => {
    // This is a no-op for now as inventory updates are handled via Firestore subscriptions
    // Individual items should be updated using handleUpdateInventoryItem instead
  }

  // Handler to open booking dialog
  const handleBookEquipment = (device: EquipmentDevice) => {
    setSelectedEquipmentForBooking(device)
    setBookingDefaults(null) // Clear any previous defaults
    setShowBookingDialog(true)
  }

  // Handler for booking creation success
  const handleBookingCreated = async () => {
    try {
      setShowBookingDialog(false)
      setBookingDefaults(null)
      setSelectedEquipmentForBooking(null)
      await refreshBookings()
      toast.success("Booking created successfully!")
      // Switch to bookings tab to show the newly created booking
      setActiveTab("bookings")
    } catch (error) {
      toast.error("Failed to refresh bookings")
    }
  }

  // Handler to close booking dialog
  const handleCloseBookingDialog = () => {
    setShowBookingDialog(false)
    setBookingDefaults(null)
    setSelectedEquipmentForBooking(null)
  }

  // Handler for slot click in availability timeline
  const handleSlotClick = (startTime: Date, endTime: Date) => {
    setBookingDefaults({
      startTime,
      endTime,
    })
    // Keep the currently selected equipment for timeline
    setShowBookingDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Equipment Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage lab equipment status, bookings, and maintenance
        </p>
      </div>

      {/* Admin: Enable Booking Migration */}
      <EnableBookingButton />

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="status">Equipment Status</TabsTrigger>
          <TabsTrigger value="bookings">
            My Bookings {userBookings && userBookings.length > 0 && `(${userBookings.length})`}
          </TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        {/* Tab 1: Equipment Status */}
        <TabsContent value="status">
          <EquipmentStatusPanel
            equipment={equipment || []}
            inventory={inventory || []}
            orders={orders || []}
            masterProjects={projects || []}
            currentUserProfile={currentUserProfile}
            allProfiles={allProfiles || []}
            onEquipmentCreate={handleCreateEquipment}
            onEquipmentUpdate={handleUpdateEquipment}
            onInventoryUpdate={handleInventoryUpdate}
            onOrderCreate={handleCreateOrder}
            onTaskCreate={handleCreateDayToDayTask}
            onBookEquipment={handleBookEquipment}
          />
        </TabsContent>

        {/* Tab 2: My Bookings */}
        <TabsContent value="bookings">
          <MyBookingsView />
        </TabsContent>

        {/* Tab 3: Availability Timeline */}
        <TabsContent value="availability">
          <div className="space-y-4">
            {/* Equipment Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Equipment:</label>
              <select
                className="px-3 py-2 border border-border rounded-md bg-background"
                value={selectedEquipmentForTimeline?.id || ""}
                onChange={(e) => {
                  const selected = equipment?.find((eq) => eq.id === e.target.value)
                  setSelectedEquipmentForTimeline(selected || null)
                  // Also set as selected for booking dialog
                  if (selected) {
                    setSelectedEquipmentForBooking(selected)
                  }
                }}
              >
                {equipment && equipment.length > 0 ? (
                  equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.type})
                    </option>
                  ))
                ) : (
                  <option value="">No equipment available</option>
                )}
              </select>
            </div>

            {/* Timeline */}
            {selectedEquipmentForTimeline ? (
              <EquipmentAvailabilityTimeline
                equipment={selectedEquipmentForTimeline}
                onSlotClick={handleSlotClick}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please select equipment to view availability
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Booking Dialog */}
      <QuickBookingDialog
        open={showBookingDialog}
        onClose={handleCloseBookingDialog}
        equipment={selectedEquipmentForBooking}
        allEquipment={equipment || []}
        defaultStartTime={bookingDefaults?.startTime}
        defaultEndTime={bookingDefaults?.endTime}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  )
}
