"use client"

import { useState, useEffect } from "react"
import { Deliverable, ImportanceLevel, PersonProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Target, Trash2 } from "lucide-react"

interface DeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverable: Deliverable | null
  workpackageId: string
  onSave: (deliverableData: Partial<Deliverable>) => void
  onDelete?: () => void
  mode: "create" | "edit" | "view"
  availableOwners?: PersonProfile[]
}

export function DeliverableDialog({
  open,
  onOpenChange,
  deliverable,
  workpackageId,
  onSave,
  onDelete,
  mode,
  availableOwners = [],
}: DeliverableDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [importance, setImportance] = useState<ImportanceLevel>("medium")
  const [status, setStatus] = useState<Deliverable["status"]>("not-started")
  const [progress, setProgress] = useState(0)
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined)
  const [tags, setTags] = useState<string>("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (deliverable && open) {
      setName(deliverable.name)
      setDescription(deliverable.description || "")
      setNotes(deliverable.notes || "")
      setStartDate(
        deliverable.startDate
          ? new Date(deliverable.startDate).toISOString().split("T")[0]
          : ""
      )
      setDueDate(
        deliverable.dueDate
          ? new Date(deliverable.dueDate).toISOString().split("T")[0]
          : ""
      )
      setImportance(deliverable.importance)
      setStatus(deliverable.status)
      setProgress(deliverable.progress)
      setOwnerId(deliverable.ownerId)
      setTags(deliverable.tags?.join(", ") || "")
    } else if (!deliverable && open) {
      // Reset for new deliverable
      setName("")
      setDescription("")
      setNotes("")
      setStartDate(new Date().toISOString().split("T")[0])
      setDueDate("")
      setImportance("medium")
      setStatus("not-started")
      setProgress(0)
      setOwnerId(undefined)
      setTags("")
      setError(null)
    }
  }, [deliverable, open])

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a deliverable name")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const deliverableData: Partial<Deliverable> = {
        name: name.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        importance,
        status,
        progress,
        ownerId,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
          : undefined,
      }

      if (!deliverable) {
        // Creating new deliverable
        deliverableData.workpackageId = workpackageId
        deliverableData.projectTaskIds = []
        deliverableData.linkedOrderIds = []
        deliverableData.linkedDayToDayTaskIds = []
        deliverableData.linkedELNExperimentIds = []
        deliverableData.linkedDocumentUrls = []
        deliverableData.blockers = []
        deliverableData.reviewHistory = []
        deliverableData.metrics = []
      }

      await onSave(deliverableData)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save deliverable:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save deliverable. Please try again."
      )
    } finally {
      setIsSaving(false)
    }
  }

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

  const isReadOnly = mode === "view"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              <DialogTitle>
                {mode === "create"
                  ? "Create New Deliverable"
                  : mode === "edit"
                  ? "Edit Deliverable"
                  : "View Deliverable"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {mode === "create"
                ? "Add a new deliverable to this workpackage. Deliverables are concrete outcomes or milestones."
                : mode === "edit"
                ? "Update the deliverable details below."
                : "Viewing deliverable details."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Deliverable Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Draft paper, Dataset collected, Protocol developed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this deliverable..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={isReadOnly}
              />
            </div>

            {/* Status and Importance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value: Deliverable["status"]) =>
                    setStatus(value)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="importance">Importance</Label>
                <Select
                  value={importance}
                  onValueChange={(value: ImportanceLevel) =>
                    setImportance(value)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="importance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  disabled={isReadOnly}
                  className="flex-1"
                />
                <span className="font-semibold text-lg w-12 text-right">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Owner */}
            {availableOwners.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={ownerId || ""}
                  onValueChange={(value) => setOwnerId(value || undefined)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="owner">
                    <SelectValue placeholder="Select owner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No owner</SelectItem>
                    {availableOwners.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., paper, experiment, analysis"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isReadOnly}
              />
              <p className="text-xs text-gray-500">
                Enter tags separated by commas
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes, context, or requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div>
              {mode === "edit" && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {mode === "view" ? "Close" : "Cancel"}
              </Button>
              {mode !== "view" && (
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : mode === "create" ? "Create" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deliverable? This action
              cannot be undone. All linked project tasks, orders, and other
              associations will be preserved but disconnected from this
              deliverable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
