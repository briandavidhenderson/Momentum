"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EquipmentDevice, EquipmentSupply, InventoryItem } from "@/lib/types"

interface EquipmentEditorDialogProps {
  device: EquipmentDevice
  inventory: InventoryItem[]
  onClose: () => void
  onSave: (device: EquipmentDevice) => void
  onAddSupply: (supply: EquipmentSupply) => void
}

/**
 * Shared dialog for creating and editing equipment devices
 * Used by EquipmentStatusPanel and EquipmentNetworkPanel
 *
 * Features:
 * - Edit device details (name, make, model, serial number)
 * - Upload device image (base64 encoded)
 * - Configure maintenance schedule
 * - Manage supplies (add, edit, remove)
 * - View SOPs (Standard Operating Procedures)
 *
 * Note: Supply management uses legacy inline editing
 * TODO: Migrate to use AddSupplyDialog for new supply additions
 */
export function EquipmentEditorDialog({
  device,
  inventory,
  onClose,
  onSave,
  onAddSupply,
}: EquipmentEditorDialogProps) {
  const [formData, setFormData] = useState({
    name: device.name,
    make: device.make || "",
    model: device.model || "",
    serialNumber: device.serialNumber || "",
    imageUrl: device.imageUrl || "",
    type: device.type,
    maintenanceDays: device.maintenanceDays,
    lastMaintained: device.lastMaintained,
    threshold: device.threshold,
  })
  const [supplies, setSupplies] = useState<EquipmentSupply[]>(device.supplies)
  const [newSupply, setNewSupply] = useState({
    name: "",
    price: "",
    qty: "",
    minQty: "",
    burnPerWeek: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(device.imageUrl || null)

  // Update form data when device changes
  useEffect(() => {
    setFormData({
      name: device.name,
      make: device.make || "",
      model: device.model || "",
      serialNumber: device.serialNumber || "",
      imageUrl: device.imageUrl || "",
      type: device.type,
      maintenanceDays: device.maintenanceDays,
      lastMaintained: device.lastMaintained,
      threshold: device.threshold,
    })
    setSupplies(device.supplies)
    setImagePreview(device.imageUrl || null)
  }, [device])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Convert image to base64 for storage (or you can upload to Firebase Storage)
  const handleImageSave = async (): Promise<string | undefined> => {
    if (imageFile) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(imageFile)
      })
    }
    return imagePreview || undefined
  }

  const handleSave = async () => {
    // Handle image upload
    let finalImageUrl = formData.imageUrl
    if (imageFile) {
      const base64Image = await handleImageSave()
      if (base64Image) {
        finalImageUrl = base64Image
      }
    }

    const updatedDevice: EquipmentDevice = {
      ...device,
      name: formData.name,
      make: formData.make,
      model: formData.model,
      serialNumber: formData.serialNumber || "",
      imageUrl: finalImageUrl || "",
      type: formData.type,
      maintenanceDays: formData.maintenanceDays,
      lastMaintained: formData.lastMaintained,
      threshold: formData.threshold,
      supplies,
      sops: device.sops || [],
      updatedAt: new Date().toISOString(),
    }
    onSave(updatedDevice)
  }

  // DEPRECATED: Inline supply editor removed - use inventory-first approach
  // Supplies should be added via AddSupplyDialog which creates InventoryItem first
  const handleAddSupplyRow = () => {
    console.warn('Inline supply editor is deprecated. Please use "Add Supply" button in main equipment panel.')
    // This functionality has been removed in favor of inventory-first approach
    // where supplies are created from the inventory panel, then linked to devices
  }

  const handleRemoveSupply = (index: number) => {
    setSupplies(supplies.filter((_, i) => i !== index))
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Device</DialogTitle>
        <DialogDescription>
          Update device details, maintenance schedule, and supply management.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Device Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., PCR Thermocycler"
          />
        </div>
        <div>
          <Label>Make *</Label>
          <Input
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            placeholder="e.g., Applied Biosystems"
          />
        </div>
        <div>
          <Label>Model *</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="e.g., Veriti 96-Well"
          />
        </div>
        <div>
          <Label>Serial Number (Optional)</Label>
          <Input
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            placeholder="Device serial number"
          />
        </div>
        <div>
          <Label>Type</Label>
          <Input
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., PCR Machine"
          />
        </div>
        <div>
          <Label>Device Image (Optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="cursor-pointer"
          />
          {imagePreview && (
            <div className="mt-2">
              <Image
                src={imagePreview}
                alt="Preview"
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded border"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImagePreview(null)
                  setImageFile(null)
                  setFormData({ ...formData, imageUrl: "" })
                }}
                className="mt-1 text-xs"
              >
                Remove Image
              </Button>
            </div>
          )}
        </div>
        <div>
          <Label>Maintenance Interval (days)</Label>
          <Input
            type="number"
            min={1}
            value={formData.maintenanceDays}
            onChange={(e) =>
              setFormData({ ...formData, maintenanceDays: parseInt(e.target.value) || 90 })
            }
          />
        </div>
        <div>
          <Label>Last Maintained</Label>
          <Input
            type="date"
            value={formData.lastMaintained}
            onChange={(e) => setFormData({ ...formData, lastMaintained: e.target.value })}
          />
        </div>
        <div>
          <Label>Maintenance Threshold % (To-Do)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={formData.threshold}
            onChange={(e) =>
              setFormData({ ...formData, threshold: parseInt(e.target.value) || 20 })
            }
          />
        </div>
      </div>

      <h4 className="font-semibold mb-3">Reagents & Consumables</h4>
      {/* DEPRECATED: Inline supply editor removed
          Use the "Add Supply" button in the main equipment panel instead.
          Supplies are now managed through the inventory-first approach:
          1. Create/select inventory item in Orders & Inventory tab
          2. Link to equipment device via "Add Supply" dialog
      */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> To add supplies to this device, close this dialog and use the "Add Supply" button
          in the main equipment panel. Supplies are now linked from the inventory system.
        </p>
      </div>

      <h4 className="font-semibold mb-3 mt-6">Standard Operating Procedures (SOPs)</h4>
      <div className="border border-border rounded-lg p-4 mb-4 bg-gray-50">
        <p className="text-sm text-muted-foreground mb-3">
          SOPs are version-controlled documents that describe how to use this device. Each SOP
          includes version history.
        </p>
        {device.sops && device.sops.length > 0 ? (
          <div className="space-y-3">
            {device.sops.map((sop) => (
              <div key={sop.id} className="border border-border rounded p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-semibold">{sop.title}</h5>
                    <p className="text-xs text-muted-foreground">
                      Version {sop.version} • Updated{" "}
                      {new Date(sop.updatedAt || sop.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {sop.content}
                </div>
                {sop.history && sop.history.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Version History ({sop.history.length})
                    </summary>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {sop.history.map((version, idx) => (
                        <div key={idx} className="border-l-2 pl-2">
                          <strong>v{version.version}</strong> -{" "}
                          {new Date(version.updatedAt).toLocaleDateString()}
                          {version.changeNotes && <div className="text-xs">{version.changeNotes}</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No SOPs yet. Add SOPs will be available in a future update.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
          Save
        </Button>
      </div>
    </DialogContent>
  )
}
