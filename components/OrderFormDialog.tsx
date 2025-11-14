"use client"

import { useState, useEffect, useMemo } from "react"
import { Order, FundingAccount, FundingAllocation } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
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

interface OrderFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (orderData: Partial<Omit<Order, 'id' | 'createdBy' | 'orderedBy'>>) => void
}

export function OrderFormDialog({ open, onClose, onSave }: OrderFormDialogProps) {
  const { currentUserProfile } = useAuth()
  const [fundingAccounts, setFundingAccounts] = useState<FundingAccount[]>([])
  const [fundingAllocations, setFundingAllocations] = useState<FundingAllocation[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState<Partial<Order>>({
    productName: '',
    catNum: '',
    supplier: '',
    priceExVAT: 0,
    currency: 'EUR',
    status: 'to-order',
    accountId: '',
    fundingAllocationId: '',
  })

  // Load funding accounts and allocations
  useEffect(() => {
    if (!open || !currentUserProfile?.labId) return

    const loadFundingData = async () => {
      setLoading(true)
      try {
        const labId = currentUserProfile.labId

        // Fix Bug #6: Correct collection name is "accounts" not "fundingAccounts"
        const accountsSnapshot = await getDocs(
          query(collection(db, "accounts"), where("labId", "==", labId))
        )
        const accounts = accountsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FundingAccount[]
        setFundingAccounts(accounts)

        // Load funding allocations
        const allocationsSnapshot = await getDocs(
          query(collection(db, "fundingAllocations"), where("labId", "==", labId))
        )
        const allocs = allocationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FundingAllocation[]
        setFundingAllocations(allocs)
      } catch (error) {
        console.error("Error loading funding data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFundingData()
  }, [open, currentUserProfile])

  // Get selected account and allocation
  const selectedAccount = useMemo(
    () => fundingAccounts.find((a) => a.id === formData.accountId),
    [fundingAccounts, formData.accountId]
  )

  const selectedAllocation = useMemo(
    () => fundingAllocations.find((a) => a.id === formData.fundingAllocationId),
    [fundingAllocations, formData.fundingAllocationId]
  )

  // Filter allocations for selected account
  const availableAllocations = useMemo(() => {
    if (!formData.accountId) return []
    return fundingAllocations.filter(
      (a) => a.fundingAccountId === formData.accountId && a.status === "active"
    )
  }, [fundingAllocations, formData.accountId])

  // Check if allocation has sufficient funds
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
    if (percentRemaining < 10) return "critical"
    if (percentRemaining < 25) return "warning"
    return "ok"
  }, [selectedAllocation])

  const handleSave = () => {
    if (!formData.productName || !formData.catNum) {
      alert('Please fill in product name and catalog number')
      return
    }

    if (!formData.accountId) {
      alert('Please select a funding account')
      return
    }

    if (!hasSufficientFunds) {
      if (!confirm('The selected allocation has insufficient funds. Do you want to proceed anyway?')) {
        return
      }
    }

    // Build order data with all cached fields
    const orderData: Partial<Order> = {
      ...formData,
      accountName: selectedAccount?.funderName || '',
      funderId: selectedAccount?.funderId || '',
      funderName: selectedAccount?.funderName || '',
      masterProjectId: selectedAccount?.masterProjectId || '',
      masterProjectName: selectedAccount?.masterProjectName || '',
    }

    if (selectedAllocation) {
      orderData.allocationName = selectedAllocation.type === "PERSON"
        ? selectedAllocation.personName
        : selectedAllocation.projectName
    }

    onSave(orderData)
    onClose()

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
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading funding data...</div>
          ) : (
            <>
              {/* Funding Account Selection */}
              <div className="grid gap-2">
                <Label htmlFor="accountId">Funding Account *</Label>
                <select
                  id="accountId"
                  value={formData.accountId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountId: e.target.value,
                    fundingAllocationId: '' // Reset allocation when account changes
                  })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select funding account...</option>
                  {fundingAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.funderName} - {account.masterProjectName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Funding Allocation Selection (Optional) */}
              {formData.accountId && (
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
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      budgetWarningLevel === 'critical' ? 'bg-red-50 border border-red-200' :
                      budgetWarningLevel === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <DollarSign className={`h-4 w-4 mt-0.5 ${
                        budgetWarningLevel === 'critical' ? 'text-red-600' :
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
                  <Label htmlFor="priceExVAT">Price (Ex VAT) *</Label>
                  <Input
                    id="priceExVAT"
                    type="number"
                    step="0.01"
                    value={formData.priceExVAT || ''}
                    onChange={(e) => setFormData({ ...formData, priceExVAT: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={formData.currency || 'EUR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </>
          )}
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
