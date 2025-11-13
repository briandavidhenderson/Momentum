"use client"

import { useState, useEffect } from "react"
import { Order, OrderStatus } from "@/lib/types"
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

interface OrderEditDialogProps {
  order: Order | null
  open: boolean
  onClose: () => void
  onSave: (orderId: string, updates: Partial<Order>) => void
}

export function OrderEditDialog({ order, open, onClose, onSave }: OrderEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Order>>({})

  useEffect(() => {
    if (order) {
      setFormData({
        productName: order.productName,
        catNum: order.catNum,
        supplier: order.supplier,
        priceExVAT: order.priceExVAT,
        currency: order.currency,
        status: order.status,
        expectedDeliveryDate: order.expectedDeliveryDate,
        orderedDate: order.orderedDate,
        receivedDate: order.receivedDate,
      })
    }
  }, [order])

  if (!order) return null

  const handleSave = () => {
    onSave(order.id, formData)
    onClose()
  }

  const handleDateChange = (field: 'expectedDeliveryDate' | 'orderedDate' | 'receivedDate', dateString: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: dateString ? new Date(dateString) : undefined,
    }))
  }

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update order details and status
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Name */}
          <div className="grid gap-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={formData.productName || ''}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="Product name"
            />
          </div>

          {/* Catalog Number */}
          <div className="grid gap-2">
            <Label htmlFor="catNum">Catalog Number</Label>
            <Input
              id="catNum"
              value={formData.catNum || ''}
              onChange={(e) => setFormData({ ...formData, catNum: e.target.value })}
              placeholder="Catalog number"
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

          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status || 'to-order'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="to-order">To Order</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* Expected Delivery Date */}
          <div className="grid gap-2">
            <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
            <Input
              id="expectedDeliveryDate"
              type="date"
              value={formatDateForInput(formData.expectedDeliveryDate)}
              onChange={(e) => handleDateChange('expectedDeliveryDate', e.target.value)}
            />
          </div>

          {/* Ordered Date */}
          {formData.status !== 'to-order' && (
            <div className="grid gap-2">
              <Label htmlFor="orderedDate">Ordered Date</Label>
              <Input
                id="orderedDate"
                type="date"
                value={formatDateForInput(formData.orderedDate)}
                onChange={(e) => handleDateChange('orderedDate', e.target.value)}
              />
            </div>
          )}

          {/* Received Date */}
          {formData.status === 'received' && (
            <div className="grid gap-2">
              <Label htmlFor="receivedDate">Received Date</Label>
              <Input
                id="receivedDate"
                type="date"
                value={formatDateForInput(formData.receivedDate)}
                onChange={(e) => handleDateChange('receivedDate', e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
