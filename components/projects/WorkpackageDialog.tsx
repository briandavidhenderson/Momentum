"use client"

import { useState, useEffect } from "react"
import { Workpackage, ImportanceLevel, PersonProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Trash2,
  AlertTriangle,
} from "lucide-react"

interface WorkpackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workpackage: Workpackage | null
  projectId: string
  onSave: (workpackageData: Partial<Workpackage>) => void
  onDelete?: () => void
  mode: "create" | "edit" | "view"
  availableLeads?: PersonProfile[]  // Feature #5: For workpackage lead assignment
}

const workpackageStatusValues: Workpackage["status"][] = [
  "planning",
  "active",
  "at-risk",
  "completed",
  "on-hold",
]

const legacyStatusMap: Record<string, Workpackage["status"]> = {
  atRisk: "at-risk",
  onHold: "on-hold",
}

const normalizeWorkpackageStatus = (value?: string | null): Workpackage["status"] => {
  if (!value) return "planning"

  const upgraded = legacyStatusMap[value]
  if (upgraded) return upgraded

  return workpackageStatusValues.includes(value as Workpackage["status"])
    ? (value as Workpackage["status"])
    : "planning"
}

export function WorkpackageDialog({
  open,
  onOpenChange,
  workpackage,
  projectId,
  onSave,
  onDelete,
  mode,
  availableLeads = [],
}: WorkpackageDialogProps) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [importance, setImportance] = useState<ImportanceLevel>("medium")
  const [status, setStatus] = useState<Workpackage["status"]>("planning")
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined)  // Feature #5: Workpackage lead
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)  // Feature #5: Delete confirmation
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDateError, setStartDateError] = useState<string | null>(null)
  const [endDateError, setEndDateError] = useState<string | null>(null)

  useEffect(() => {
    if (workpackage && open) {
      setName(workpackage.name)
      setNotes(workpackage.notes || "")
      setStartDate(new Date(workpackage.start).toISOString().split("T")[0])
      setEndDate(new Date(workpackage.end).toISOString().split("T")[0])
      setImportance(workpackage.importance)
      setStatus(normalizeWorkpackageStatus(workpackage.status))
      setTasks(workpackage.tasks || [])
      setOwnerId(workpackage.ownerId)  // Feature #5: Load workpackage lead
      setStartDateError(null)
      setEndDateError(null)
    } else if (!workpackage && open) {
      // Reset for new workpackage
      setName("")
      setNotes("")
      setStartDate(new Date().toISOString().split("T")[0])
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      setImportance("medium")
      setStatus("planning")
      setOwnerId(undefined)  // Feature #5: Reset lead
      setError(null)
      setStartDateError(null)
      setEndDateError(null)
    }
  }, [workpackage, open])

  const validateDateRange = (startValue: string, endValue: string) => {
    let hasError = false

    if (!startValue) {
      setStartDateError("Start date is required")
      hasError = true
    } else if (isNaN(new Date(startValue).getTime())) {
      setStartDateError("Start date is invalid")
      hasError = true
    } else {
      setStartDateError(null)
    }

    if (!endValue) {
      setEndDateError("End date is required")
      hasError = true
    } else if (isNaN(new Date(endValue).getTime())) {
      setEndDateError("End date is invalid")
      hasError = true
    } else {
      setEndDateError(null)
    }

    if (!hasError) {
      const start = new Date(startValue)
      const end = new Date(endValue)

      if (start > end) {
        setEndDateError("End date must be on or after the start date")
        hasError = true
      }
    }

    return !hasError
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a work package name')
      return
    }

    if (!validateDateRange(startDate, endDate)) {
      setError("Please fix the date errors before saving")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const workpackageData: Partial<Workpackage> = {
        name: name.trim(),
        notes: notes.trim() || undefined,
        start: new Date(startDate),
        end: new Date(endDate),
        importance,
        status: normalizeWorkpackageStatus(status),
        tasks,
        ownerId,  // Feature #5: Save workpackage lead
      }

      if (!workpackage) {
        // Creating new workpackage
        workpackageData.projectId = projectId
        workpackageData.progress = 0
        workpackageData.isExpanded = true
      }

      await onSave(workpackageData)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save work package:', err)
      setError(err instanceof Error ? err.message : 'Failed to save work package. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Feature #5: Handle delete with confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete()
      setShowDeleteConfirm(false)
      onOpenChange(false)
    }
  }

  const importanceOptions: { value: ImportanceLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ]

  const statusOptions = [
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "at-risk", label: "At Risk" },
    { value: "completed", label: "Completed" },
    { value: "on-hold", label: "On Hold" },
  ]

  const isReadOnly = mode === "view"
  const isEditing = mode === "edit"

  const isSubmitDisabled =
    isSaving ||
    !name.trim() ||
    !startDate ||
    !endDate ||
    startDateError !== null ||
    endDateError !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Work Package" : isReadOnly ? "Work Package Details" : "Edit Work Package"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new work package to organize deliverables"
              : isReadOnly
              ? "View work package information"
              : "Update work package information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wp-name">Work Package Name *</Label>
              <Input
                id="wp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Data Collection & Analysis"
                disabled={isReadOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wp-start">Start Date</Label>
                <Input
                  id="wp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const value = e.target.value
                    setStartDate(value)
                    validateDateRange(value, endDate)
                  }}
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD</p>
                {startDateError && (
                  <p className="text-xs text-red-600" role="alert">
                    {startDateError}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wp-end">End Date</Label>
                <Input
                  id="wp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const value = e.target.value
                    setEndDate(value)
                    validateDateRange(startDate, value)
                  }}
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD</p>
                {endDateError && (
                  <p className="text-xs text-red-600" role="alert">
                    {endDateError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wp-importance">Importance</Label>
                <select
                  id="wp-importance"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importanceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="wp-status">Status</Label>
                <select
                  id="wp-status"
                  value={status}
                  onChange={(e) => setStatus(normalizeWorkpackageStatus(e.target.value))}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feature #5: Workpackage Lead Assignment */}
            {availableLeads && availableLeads.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="wp-lead">Work Package Lead</Label>
                <select
                  id="wp-lead"
                  value={ownerId || ""}
                  onChange={(e) => setOwnerId(e.target.value || undefined)}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No lead assigned</option>
                  {availableLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Assign a team member to coordinate and oversee this work package
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="wp-notes">Notes</Label>
              <Textarea
                id="wp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or description for this work package..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>

        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Feature #5: Delete button with confirmation */}
            {isEditing && onDelete && (
              <Button variant="destructive" onClick={handleDeleteClick} disabled={isSaving}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={isSubmitDisabled}>
                {isSaving ? 'Saving...' : mode === "create" ? "Create" : "Save Changes"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Feature #5: Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Work Package?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Work Package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
