"use client"

import { useState, useMemo, useEffect } from "react"
import { Order } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
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
import { Badge } from "@/components/ui/badge"
import { AlertCircle, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/constants"
import { notifyLowBudget, notifyBudgetExhausted, shouldSendLowBudgetNotification } from "@/lib/notificationUtils"
import { logger } from "@/lib/logger"
import { getBudgetHealthClass } from "@/lib/equipmentConfig"
import { VisibilitySelector } from "@/components/ui/VisibilitySelector"
import { VisibilitySettings } from "@/lib/types/visibility.types"

interface OrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (orderData: Partial<Omit<Order, 'id' | 'createdBy' | 'orderedBy'>>) => void
  order?: Order | null
  mode?: "create" | "edit" | "view"
}

export function OrderFormDialog({ open, onOpenChange, onSave, order, mode = "create" }: OrderFormDialogProps) {
  const {
    currentUserProfile,
    fundingAccounts,
    fundingAccountsLoading,
    fundingAllocations,
    deliverables
  } = useAppContext()

  const [formData, setFormData] = useState<Partial<Order>>({
    productName: '',
    catNum: '',
    supplier: '',
    priceExVAT: 0,
    currency: 'EUR',
    status: 'to-order',
    accountId: '',
    fundingAllocationId: '',
    linkedDeliverableId: '',
  })

  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    visibility: 'lab',
    sharedWithUsers: [],
    sharedWithGroups: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form with order data if available
  useEffect(() => {
    if (open && order) {
      setFormData({
        productName: order.productName,
        catNum: order.catNum,
        supplier: order.supplier,
        priceExVAT: order.priceExVAT,
        currency: order.currency,
        status: order.status,
        accountId: order.accountId,
        fundingAllocationId: order.fundingAllocationId,
        linkedDeliverableId: order.linkedDeliverableId,
        quantity: order.quantity,
        url: order.url,
        notes: order.notes,
        priority: order.priority,
      })
      setVisibilitySettings({
        visibility: order.visibility || 'lab',
        sharedWithUsers: order.sharedWithUsers || [],
        sharedWithGroups: order.sharedWithGroups || []
      })
    } else if (open && !order) {
      // Reset for new order
      setFormData({
        productName: '',
        catNum: '',
        supplier: '',
        priceExVAT: 0,
        currency: 'EUR',
        status: 'to-order',
        accountId: '',
        fundingAllocationId: '',
        linkedDeliverableId: '',
        quantity: 1,
      })
      setVisibilitySettings({
        visibility: 'lab',
        sharedWithUsers: [],
        sharedWithGroups: []
      })
    }
  }, [open, order])

  const isReadOnly = mode === "view"

  // Filter allocations based on selected account
  const availableAllocations = useMemo(() => {
    if (!formData.accountId) return []
    return fundingAllocations.filter(a => a.fundingAccountId === formData.accountId)
  }, [formData.accountId, fundingAllocations])

  // Filter deliverables based on selected account's project
  const availableDeliverables = useMemo(() => {
    if (!formData.accountId) return []
    const account = fundingAccounts.find(a => a.id === formData.accountId)
    if (!account?.masterProjectId) return []
    // Find deliverables for this project
    // Note: Deliverables are linked to workpackages, so we'd need to find workpackages for the project first
    // For now, we'll just show all deliverables (simplified) or filter if we had project context
    return deliverables
  }, [formData.accountId, fundingAccounts, deliverables])

  const selectedAccount = useMemo(() =>
    fundingAccounts.find(a => a.id === formData.accountId),
    [formData.accountId, fundingAccounts]
  )

  const selectedAllocation = useMemo(() =>
    fundingAllocations.find(a => a.id === formData.fundingAllocationId),
    [formData.fundingAllocationId, fundingAllocations]
  )

  const selectedDeliverable = useMemo(() =>
    deliverables.find(d => d.id === formData.linkedDeliverableId),
    [formData.linkedDeliverableId, deliverables]
  )

  // Calculate if we have enough budget
  const hasSufficientFunds = useMemo(() => {
    if (!selectedAllocation || !formData.priceExVAT) return true
    const remaining = selectedAllocation.remainingBudget || 0
    return remaining >= formData.priceExVAT
  }, [selectedAllocation, formData.priceExVAT])

  // Calculate budget warning level
  const budgetWarningLevel = useMemo(() => {
    if (!selectedAllocation) return null
    const remaining = selectedAllocation.remainingBudget || 0
    const allocated = selectedAllocation.allocatedAmount || 0
    if (allocated === 0) return null
    const percentRemaining = (remaining / allocated) * 100
    return getBudgetHealthClass(percentRemaining)
  }, [selectedAllocation])

  const handleSave = async () => {
    if (!onSave) return

    if (!formData.productName || !formData.catNum) {
      setError('Please fill in product name and catalog number')
      return
    }

    // Account is now optional
    // if (!formData.accountId) {
    //   setError('Please select a funding account')
    //   return
    // }

    if (!hasSufficientFunds) {
      if (!confirm('The selected allocation has insufficient funds. Do you want to proceed anyway?')) {
        return
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      // Build order data with all cached fields
      const orderData: Partial<Order> = {
        ...formData,
        accountName: selectedAccount?.funderName || '',
        funderId: selectedAccount?.funderId || '',
        funderName: selectedAccount?.funderName || '',
        masterProjectId: selectedAccount?.masterProjectId || '',
        masterProjectName: selectedAccount?.masterProjectName || '',
        // Visibility
        visibility: visibilitySettings.visibility,
        sharedWithUsers: visibilitySettings.sharedWithUsers,
        sharedWithGroups: visibilitySettings.sharedWithGroups,
      }

      if (selectedAllocation) {
        orderData.allocationName = selectedAllocation.type === "PERSON"
          ? selectedAllocation.personName
          : selectedAllocation.projectName
      }

      await onSave(orderData)

      // PHASE 4: Trigger low budget notifications
      if (selectedAllocation && currentUserProfile && formData.priceExVAT) {
        try {
          // Calculate new remaining budget after this order
          const newRemainingBudget = (selectedAllocation.remainingBudget || 0) - formData.priceExVAT
          const allocatedAmount = selectedAllocation.allocatedAmount || 1
          const percentRemaining = (newRemainingBudget / allocatedAmount) * 100

          // Check if budget is exhausted
          if (newRemainingBudget <= 0) {
            await notifyBudgetExhausted(selectedAllocation, currentUserProfile)
          }
          // Check if budget is low and should send notification
          else {
            const warningThreshold = selectedAllocation.lowBalanceWarningThreshold || 25
            if (percentRemaining < warningThreshold && shouldSendLowBudgetNotification(selectedAllocation)) {
              await notifyLowBudget(selectedAllocation, currentUserProfile, percentRemaining)
            }
          }
        } catch (error) {
          logger.error('Error sending budget notification', error)
          // Don't block the UI on notification failure
        }
      }

      // Reset form
      setFormData({
        productName: '',
        catNum: '',
        supplier: '',
        priceExVAT: 0,
        currency: 'EUR',
        status: 'to-order',
        accountId: '',
        fundingAllocationId: '',
        linkedDeliverableId: '',
      })
      setVisibilitySettings({
        visibility: 'lab',
        sharedWithUsers: [],
        sharedWithGroups: []
      })

      onOpenChange(false)
    } catch (err) {
      console.error('Failed to create order:', err)
      setError(err instanceof Error ? err.message : 'Failed to create order. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Order" : mode === "edit" ? "Edit Order" : "Order Details"}</DialogTitle>
          <DialogDescription>
            {mode === "view" ? "View order details" : "Add or update order details"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading funding data...</div>
          ) : (
            <>
              {/* Funding Account Selection */}
              <div className="grid gap-2">
                <Label htmlFor="accountId">
                  Funding Account
                  <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                </Label>
                <select
                  id="accountId"
                  value={formData.accountId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountId: e.target.value,
                    fundingAllocationId: '' // Reset allocation when account changes
                  })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isReadOnly || fundingAccountsLoading}
                >
                  <option value="">
                    {fundingAccountsLoading ? "Loading accounts..." : "Select funding account..."}
                  </option>
                  {fundingAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.funderName} - {account.masterProjectName}
                    </option>
                  ))}
                </select>
                {!fundingAccountsLoading && fundingAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No funding accounts found. You may need to ask a lab admin to create one.
                  </p>
                )}
              </div>

              {/* Funding Allocation Selection (Optional) */}
              {formData.accountId && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="fundingAllocationId">
                      Funding Allocation
                      <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                    </Label>
                    <select
                      id="fundingAllocationId"
                      value={formData.fundingAllocationId || ''}
                      onChange={(e) => setFormData({ ...formData, fundingAllocationId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isReadOnly}
                    >
                      <option value="">No specific allocation</option>
                      {availableAllocations.map((allocation) => (
                        <option key={allocation.id} value={allocation.id}>
                          {allocation.type === "PERSON" ? allocation.personName : allocation.projectName} - {formatCurrency(allocation.remainingBudget || 0, allocation.currency)} remaining
                        </option>
                      ))}
                    </select>

                    {/* Budget Warning */}
                    {selectedAllocation && (
                      <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${budgetWarningLevel === 'critical' ? 'bg-red-50 border border-red-200' :
                        budgetWarningLevel === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-green-50 border border-green-200'
                        }`}>
                        <DollarSign className={`h-4 w-4 mt-0.5 ${budgetWarningLevel === 'critical' ? 'text-red-600' :
                          budgetWarningLevel === 'warning' ? 'text-yellow-600' :
                            'text-green-600'
                          }`} />
                        <div className="flex-1">
                          <div className="font-medium">
                            {formatCurrency(selectedAllocation.remainingBudget || 0, selectedAllocation.currency)} remaining
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(selectedAllocation.currentSpent, selectedAllocation.currency)} spent, {formatCurrency(selectedAllocation.currentCommitted, selectedAllocation.currency)} committed
                            {selectedAllocation.allocatedAmount && ` of ${formatCurrency(selectedAllocation.allocatedAmount, selectedAllocation.currency)} allocated`}
                          </div>
                          {!hasSufficientFunds && (
                            <div className="flex items-center gap-1 text-red-600 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">Insufficient funds for this order</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deliverable Selection (Optional) */}
                  {availableDeliverables.length > 0 && (
                    <div className="grid gap-2">
                      <Label htmlFor="linkedDeliverableId">
                        Link to Deliverable
                        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                      </Label>
                      <select
                        id="linkedDeliverableId"
                        value={formData.linkedDeliverableId || ''}
                        onChange={(e) => setFormData({ ...formData, linkedDeliverableId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={isReadOnly}
                      >
                        <option value="">No linked deliverable</option>
                        {availableDeliverables.map((deliverable) => (
                          <option key={deliverable.id} value={deliverable.id}>
                            {deliverable.name} ({deliverable.status})
                          </option>
                        ))}
                      </select>
                      {selectedDeliverable && (
                        <div className="text-xs text-muted-foreground">
                          This order will be linked to the deliverable for tracking purposes
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Product Name */}
              <div className="grid gap-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={formData.productName || ''}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="Product name"
                  required
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>

              {/* Price and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priceExVAT">Price (Ex VAT) *</Label>
                  <Input
                    id="priceExVAT"
                    type="number"
                    step="0.01"
                    value={formData.priceExVAT || ''}
                    onChange={(e) => setFormData({ ...formData, priceExVAT: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={formData.currency || 'EUR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isReadOnly}
                  >
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <VisibilitySelector
                  value={visibilitySettings}
                  onChange={setVisibilitySettings}
                  labId={currentUserProfile?.labId || ""}
                  disabled={isReadOnly}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {error && (
            <div className="flex-1 text-sm text-red-600 mr-4">
              {error}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              className="bg-brand-500 hover:bg-brand-600"
              disabled={isSaving || loading}
            >
              {isSaving ? 'Saving...' : mode === "create" ? 'Create Order' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
