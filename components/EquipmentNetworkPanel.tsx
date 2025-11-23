"use client"

import React from "react"
import { AdvancedNetworkView } from "@/components/AdvancedNetworkView"
import { EquipmentDevice, InventoryItem, Order, MasterProject, PersonProfile } from "@/lib/types"

interface EquipmentNetworkPanelProps {
  equipment: EquipmentDevice[]
  inventory: InventoryItem[]
  orders: Order[]
  masterProjects: MasterProject[]
  currentUserProfile: PersonProfile | null
  allProfiles: PersonProfile[] // For notification recipients
  onEquipmentUpdate: (equipmentId: string, updates: Partial<EquipmentDevice>) => void
  onInventoryUpdate: (inventory: InventoryItem[]) => void
  onOrderCreate: (order: Omit<Order, "id">) => void
  onInventoryCreate: (item: Omit<InventoryItem, "id">) => void
}

export function EquipmentNetworkPanel({
  equipment = [],
  inventory = [],
  orders = [],
  masterProjects = [],
  currentUserProfile,
  allProfiles,
  onEquipmentUpdate,
  onInventoryUpdate,
  onOrderCreate,
  onInventoryCreate,
}: EquipmentNetworkPanelProps) {
  // The AdvancedNetworkView handles its own data fetching (profiles) and visualization.
  // The props passed here (equipment, inventory, etc.) are currently unused by the new view
  // but are kept to maintain the component interface for the parent dashboard.

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <AdvancedNetworkView />
      </div>
    </div>
  )
}
