"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { DeletionImpact } from "@/lib/projectDeletion"

interface DeletionConfirmationDialogProps {
  open: boolean
  impact: DeletionImpact | null
  onConfirm: () => void
  onCancel: () => void
}

export function DeletionConfirmationDialog({
  open,
  impact,
  onConfirm,
  onCancel,
}: DeletionConfirmationDialogProps) {
  if (!impact) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete {impact.projectName}?</DialogTitle>
              <DialogDescription>
                {impact.projectType === "master" ? "Master Project" : "Regular Project"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This will permanently delete:
          </p>

          <ul className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
            <li className="flex items-center justify-between text-sm">
              <span>Project</span>
              <span className="font-medium">1 {impact.projectType}</span>
            </li>

            {impact.workpackagesCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Workpackages</span>
                <span className="font-medium">{impact.workpackagesCount}</span>
              </li>
            )}

            {impact.tasksCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Tasks</span>
                <span className="font-medium">{impact.tasksCount}</span>
              </li>
            )}

            {impact.subtasksCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Subtasks</span>
                <span className="font-medium">{impact.subtasksCount}</span>
              </li>
            )}

            {impact.deliverablesCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Deliverables</span>
                <span className="font-medium">{impact.deliverablesCount}</span>
              </li>
            )}
          </ul>

          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive font-medium">
              This action cannot be undone. All data will be permanently removed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface WorkpackageDeletionConfirmationDialogProps {
  open: boolean
  workpackageName: string
  tasksCount: number
  subtasksCount: number
  deliverablesCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function WorkpackageDeletionConfirmationDialog({
  open,
  workpackageName,
  tasksCount,
  subtasksCount,
  deliverablesCount,
  onConfirm,
  onCancel,
}: WorkpackageDeletionConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete {workpackageName}?</DialogTitle>
              <DialogDescription>Workpackage</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This will permanently delete:
          </p>

          <ul className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
            <li className="flex items-center justify-between text-sm">
              <span>Workpackage</span>
              <span className="font-medium">1</span>
            </li>

            {tasksCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Tasks</span>
                <span className="font-medium">{tasksCount}</span>
              </li>
            )}

            {subtasksCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Subtasks</span>
                <span className="font-medium">{subtasksCount}</span>
              </li>
            )}

            {deliverablesCount > 0 && (
              <li className="flex items-center justify-between text-sm">
                <span>Deliverables</span>
                <span className="font-medium">{deliverablesCount}</span>
              </li>
            )}
          </ul>

          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive font-medium">
              This action cannot be undone. All data will be permanently removed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Workpackage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



