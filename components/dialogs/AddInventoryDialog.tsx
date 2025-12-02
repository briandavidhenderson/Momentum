"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { InventoryLevel, InventoryItem } from "@/lib/types"
import { createInventoryItem } from "@/lib/services/inventoryService"
import { useAuth } from "@/lib/hooks/useAuth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { VisibilitySelector } from "@/components/ui/VisibilitySelector"
import { VisibilitySettings } from "@/lib/types/visibility.types"

// Comprehensive Laboratory Supply Categories
const LAB_CATEGORIES = {
  "Chemicals & Reagents": [
    "Acids & Bases",
    "Buffers",
    "Solvents",
    "Salts",
    "Standards & References",
    "Stains & Dyes",
    "Enzymes",
    "Antibodies",
    "Indicators",
    "Other Chemicals"
  ],
  "Consumables": [
    "Pipette Tips",
    "Microcentrifuge Tubes",
    "Falcon Tubes",
    "Culture Plates",
    "PCR Plates",
    "Gloves",
    "Filters",
    "Syringes & Needles",
    "Petri Dishes",
    "Cuvettes",
    "Slides & Coverslips",
    "Weighing Boats & Papers",
    "Other Consumables"
  ],
  "Cell Culture": [
    "Media",
    "Sera (FBS, etc.)",
    "Antibiotics & Antimycotics",
    "Growth Factors & Cytokines",
    "Cell Lines",
    "Culture Flasks & Plates",
    "Cryopreservation",
    "Transfection Reagents",
    "Other Cell Culture"
  ],
  "Molecular Biology": [
    "DNA/RNA Extraction Kits",
    "PCR & qPCR Reagents",
    "Primers & Probes",
    "DNA/RNA Ladders & Markers",
    "Polymerases & Enzymes",
    "Restriction Enzymes",
    "Cloning & Ligation",
    "Gel Electrophoresis Supplies",
    "Sequencing Reagents",
    "Other Molecular Biology"
  ],
  "Protein & Biochemistry": [
    "Protein Standards & Markers",
    "Western Blot Reagents",
    "ELISA Kits",
    "Immunohistochemistry",
    "Chromatography Resins",
    "Electrophoresis Buffers & Gels",
    "Protein Assay Kits",
    "Dialysis & Concentration",
    "Other Protein Supplies"
  ],
  "General Lab Supplies": [
    "Glassware (Beakers, Flasks, etc.)",
    "Plasticware",
    "Cleaning Supplies",
    "Safety Equipment",
    "Labels & Markers",
    "Storage Containers",
    "Foil & Wraps",
    "Tape (Lab & Autoclave)",
    "Waste Containers",
    "Other General Supplies"
  ],
  "Analytical Supplies": [
    "Chromatography Columns",
    "HPLC/GC Consumables",
    "Mass Spec Supplies",
    "Detector Consumables",
    "Sample Vials & Caps",
    "Calibration Standards",
    "Syringe Filters",
    "Other Analytical"
  ],
  "Safety & PPE": [
    "Lab Coats",
    "Safety Glasses & Goggles",
    "Nitrile Gloves",
    "Latex Gloves",
    "Cut-Resistant Gloves",
    "Cryogenic Gloves",
    "Face Masks & Respirators",
    "Spill Kits",
    "First Aid Supplies",
    "Other Safety Equipment"
  ],
  "Microbiology": [
    "Agar & Media",
    "Bacterial Strains",
    "Yeast Strains",
    "Inoculation Loops & Spreaders",
    "Anaerobic Supplies",
    "Sterilization Indicators",
    "Culture Tubes",
    "Other Microbiology"
  ],
  "Imaging & Microscopy": [
    "Microscope Slides",
    "Coverslips",
    "Mounting Media",
    "Fluorescent Probes & Dyes",
    "Imaging Reagents",
    "Immersion Oil",
    "Other Imaging Supplies"
  ],
  "Equipment Parts & Maintenance": [
    "Centrifuge Rotors & Buckets",
    "Pipette Parts",
    "O-Rings & Seals",
    "Tubing",
    "Pump Parts",
    "Calibration Weights",
    "Other Parts"
  ],
  "Other": [
    "Uncategorized",
    "Miscellaneous"
  ]
} as const

interface AddInventoryDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (itemId: string) => void
  labId?: string
}

export function AddInventoryDialog({ open, onClose, onSuccess, labId }: AddInventoryDialogProps) {
  const { currentUser, currentUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productName: "",
    catNum: "",
    supplier: "",
    currentQuantity: "",
    priceExVAT: "",
    minQuantity: "",
    inventoryLevel: "medium" as InventoryLevel,
    category: "",
    subcategory: "",
    notes: "",
  })

  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    visibility: 'lab',
    sharedWithUsers: [],
    sharedWithGroups: []
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      // Reset subcategory if category changes
      if (field === "category") {
        return { ...prev, [field]: value, subcategory: "" }
      }
      return { ...prev, [field]: value }
    })
    setError(null)
  }

  // Get available subcategories based on selected category
  const availableSubcategories = formData.category
    ? LAB_CATEGORIES[formData.category as keyof typeof LAB_CATEGORIES] || []
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.productName.trim()) {
      setError("Product name is required")
      return
    }
    if (!formData.catNum.trim()) {
      setError("Catalog number is required")
      return
    }
    if (!formData.currentQuantity || Number(formData.currentQuantity) < 0) {
      setError("Valid quantity is required")
      return
    }
    if (!formData.priceExVAT || Number(formData.priceExVAT) < 0) {
      setError("Valid price is required")
      return
    }

    if (!currentUser?.uid) {
      setError("You must be logged in to add inventory")
      return
    }

    if (!labId && !currentUserProfile?.labId) {
      setError("Lab ID is missing. Please refresh the page or contact support.")
      return
    }

    setLoading(true)

    try {
      const itemData: Omit<InventoryItem, 'id'> & { createdBy: string } = {
        productName: formData.productName.trim(),
        catNum: formData.catNum.trim(),
        supplier: formData.supplier.trim() || undefined,
        currentQuantity: Number(formData.currentQuantity),
        priceExVAT: Number(formData.priceExVAT),
        minQuantity: formData.minQuantity ? Number(formData.minQuantity) : undefined,
        inventoryLevel: formData.inventoryLevel,
        receivedDate: new Date(),
        category: formData.category.trim() || undefined,
        subcategory: formData.subcategory.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        labId: labId || currentUserProfile?.labId,
        createdBy: currentUser.uid,
        // Visibility
        visibility: visibilitySettings.visibility,
        sharedWithUsers: visibilitySettings.sharedWithUsers,
        sharedWithGroups: visibilitySettings.sharedWithGroups,
      }

      const itemId = await createInventoryItem(itemData)

      // Reset form
      setFormData({
        productName: "",
        catNum: "",
        supplier: "",
        currentQuantity: "",
        priceExVAT: "",
        minQuantity: "",
        inventoryLevel: "medium",
        category: "",
        subcategory: "",
        notes: "",
      })
      setVisibilitySettings({
        visibility: 'lab',
        sharedWithUsers: [],
        sharedWithGroups: []
      })

      if (onSuccess) {
        onSuccess(itemId)
      }
      onClose()
    } catch (err) {
      console.error("Error creating inventory item:", err)
      setError(err instanceof Error ? err.message : "Failed to add inventory item")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-500" />
            Add to Inventory
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Product Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => handleChange("productName", e.target.value)}
                  placeholder="e.g., Tris Base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="catNum">
                  Catalog Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="catNum"
                  value={formData.catNum}
                  onChange={(e) => handleChange("catNum", e.target.value)}
                  placeholder="e.g., T1503"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleChange("supplier", e.target.value)}
                placeholder="e.g., Sigma-Aldrich"
              />
            </div>
          </div>

          {/* Quantity & Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Quantity & Pricing</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentQuantity">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="currentQuantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.currentQuantity}
                  onChange={(e) => handleChange("currentQuantity", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceExVAT">
                  Price (ex. VAT) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="priceExVAT"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceExVAT}
                  onChange={(e) => handleChange("priceExVAT", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minQuantity">Min. Quantity</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minQuantity}
                  onChange={(e) => handleChange("minQuantity", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventoryLevel">Stock Level</Label>
              <Select
                value={formData.inventoryLevel}
                onValueChange={(value) => handleChange("inventoryLevel", value)}
              >
                <SelectTrigger id="inventoryLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Empty</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categorization */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Categorization</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange("category", value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.keys(LAB_CATEGORIES).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => handleChange("subcategory", value)}
                  disabled={!formData.category}
                >
                  <SelectTrigger id="subcategory">
                    <SelectValue placeholder={formData.category ? "Select subcategory..." : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <VisibilitySelector
              value={visibilitySettings}
              onChange={setVisibilitySettings}
              labId={labId || currentUserProfile?.labId || ""}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes about this item..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Inventory
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
