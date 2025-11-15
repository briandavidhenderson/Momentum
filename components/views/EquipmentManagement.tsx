"use client"

import { useAppContext } from "@/lib/AppContext"
import { EquipmentStatusPanel } from "@/components/EquipmentStatusPanel"
import { EquipmentNetworkPanel } from "@/components/EquipmentNetworkPanel"

export function EquipmentManagement() {
  const {
    equipment,
    inventory,
    orders,
    masterProjects,
    currentUserProfile,
    allProfiles,
    handleCreateEquipment,
    handleUpdateEquipment,
    handleInventoryUpdate,
    handleCreateOrder,
    handleCreateDayToDayTask,
    handleCreateInventoryItem,
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

      {/* Equipment Network Visualization */}
      <EquipmentNetworkPanel
        equipment={equipment || []}
        inventory={inventory || []}
        orders={orders || []}
        masterProjects={masterProjects || []}
        currentUserProfile={currentUserProfile}
        onEquipmentUpdate={handleUpdateEquipment}
        onOrderCreate={handleCreateOrder}
        onInventoryCreate={handleCreateInventoryItem || (() => {})}
      />

      {/* Equipment Status Panel */}
      <EquipmentStatusPanel
        equipment={equipment || []}
        inventory={inventory || []}
        orders={orders || []}
        masterProjects={masterProjects || []}
        currentUserProfile={currentUserProfile}
        allProfiles={allProfiles || []}
        onEquipmentCreate={handleCreateEquipment}
        onEquipmentUpdate={handleUpdateEquipment}
        onInventoryUpdate={handleInventoryUpdate}
        onOrderCreate={handleCreateOrder}
        onTaskCreate={handleCreateDayToDayTask}
      />
    </div>
  )
}
