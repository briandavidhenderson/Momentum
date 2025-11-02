"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface DataClearDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DataClearDialog({ open, onClose, onConfirm }: DataClearDialogProps) {
  const [confirmText, setConfirmText] = useState("")

  const handleConfirm = () => {
    if (confirmText.toLowerCase() === "clear all") {
      // Clear all localStorage data
      localStorage.removeItem("lab-users")
      localStorage.removeItem("lab-current-user")
      localStorage.removeItem("lab-profiles")
      localStorage.removeItem("gantt-projects")
      localStorage.removeItem("gantt-workpackages")
      localStorage.removeItem("gantt-orders")
      localStorage.removeItem("gantt-inventory")
      
      onConfirm()
      onClose()
      setConfirmText("")
      
      // Reload the page to reset state
      window.location.reload()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Clear All Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete ALL data including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>All user accounts</li>
              <li>All custom profiles</li>
              <li>All projects, workpackages, and tasks</li>
              <li>All orders and inventory</li>
            </ul>
            <p className="mt-4 font-semibold">This action cannot be undone!</p>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">clear all</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background"
            placeholder="clear all"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmText.toLowerCase() !== "clear all"}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Clear All Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

