"use client"

import { useState } from "react"
import { Order } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface OrderFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (orderData: Partial<Omit<Order, 'id' | 'createdBy' | 'orderedBy'>>) => void
}

export function OrderFormDialog({ open, onClose, onSave }: OrderFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Order>>({
    productName: '',
    catNum: '',
    supplier: '',
    priceExVAT: 0,
    currency: 'GBP',
    status: 'to-order',
  })

  const handleSave = () => {
    if (!formData.productName || !formData.catNum) {
      alert('Please fill in product name and catalog number')
      return
    }

    onSave(formData)
    onClose()

    // Reset form
    setFormData({
      productName: '',
      catNum: '',
      supplier: '',
      priceExVAT: 0,
      currency: 'GBP',
      status: 'to-order',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Add a new order to the system
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Name */}
          <div className="grid gap-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={formData.productName || ''}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="Product name"
              required
            />
          </div>

          {/* Catalog Number */}
          <div className="grid gap-2">
            <Label htmlFor="catNum">Catalog Number *</Label>
            <Input
              id="catNum"
              value={formData.catNum || ''}
              onChange={(e) => setFormData({ ...formData, catNum: e.target.value })}
              placeholder="Catalog number"
              required
            />
          </div>

          {/* Supplier */}
          <div className="grid gap-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name"
            />
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priceExVAT">Price (Ex VAT)</Label>
              <Input
                id="priceExVAT"
                type="number"
                step="0.01"
                value={formData.priceExVAT || ''}
                onChange={(e) => setFormData({ ...formData, priceExVAT: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={formData.currency || 'GBP'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600">
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
