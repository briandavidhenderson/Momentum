"use client"

import { useAppContext } from "@/lib/AppContext"
import { EquipmentStatusPanel } from "@/components/EquipmentStatusPanel"

export function EquipmentManagement() {
  const {
    equipment,
    inventory,
    orders,
    masterProjects,
    currentUserProfile,
    handleEquipmentUpdate,
    handleInventoryUpdate,
    handleCreateOrder,
    handleCreateDayToDayTask
  } = useAppContext()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Equipment Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage lab equipment status, bookings, and maintenance
        </p>
      </div>

      {/* Equipment Status Panel */}
      <EquipmentStatusPanel
        equipment={equipment || []}
        inventory={inventory || []}
        orders={orders || []}
        masterProjects={masterProjects || []}
        currentUserProfile={currentUserProfile}
        onEquipmentUpdate={handleEquipmentUpdate}
        onInventoryUpdate={handleInventoryUpdate}
        onOrderCreate={handleCreateOrder}
        onTaskCreate={handleCreateDayToDayTask}
      />
    </div>
  )
}
