"use client"

import { useState, useEffect } from "react"
import { Deliverable, Task } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Trash2 } from "lucide-react"

interface DeliverablesWidgetProps {
  task: Task
  onUpdate: (deliverables: Deliverable[]) => void
  onClose: () => void
  position: { x: number; y: number }
}

export function DeliverablesWidget({
  task,
  onUpdate,
  onClose,
  position,
}: DeliverablesWidgetProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(task.deliverables || [])
  const [newDeliverableName, setNewDeliverableName] = useState("")

  useEffect(() => {
    setDeliverables(task.deliverables || [])
  }, [task])

  const handleProgressChange = (id: string, newProgress: number) => {
    const updated = deliverables.map((d) =>
      d.id === id ? { ...d, progress: Math.max(0, Math.min(100, newProgress)) } : d
    )
    setDeliverables(updated)
    onUpdate(updated)
  }

  const handleAddDeliverable = () => {
    if (!newDeliverableName.trim()) return
    const newDeliverable: Deliverable = {
      id: `deliverable-${Date.now()}`,
      name: newDeliverableName,
      progress: 0,
    }
    const updated = [...deliverables, newDeliverable]
    setDeliverables(updated)
    onUpdate(updated)
    setNewDeliverableName("")
  }

  const handleDeleteDeliverable = (id: string) => {
    const updated = deliverables.filter((d) => d.id !== id)
    setDeliverables(updated)
    onUpdate(updated)
  }

  const handleMouseDown = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    
    const updateProgress = (clientX: number) => {
      const x = clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      handleProgressChange(id, percentage)
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateProgress(e.clientX)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    
    updateProgress(e.clientX)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Widget */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-brand-500 p-5 min-w-[400px] max-w-[500px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Deliverables</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{task.name}</p>

        {/* Deliverables List */}
        <div className="space-y-4 mb-4">
          {deliverables.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              No deliverables yet. Add one below.
            </p>
          ) : (
            deliverables.map((deliverable) => (
              <div key={deliverable.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {deliverable.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(deliverable.progress)}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDeliverable(deliverable.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div
                  className="w-full h-8 bg-gray-200 rounded-lg cursor-pointer relative overflow-hidden"
                  onMouseDown={(e) => handleMouseDown(deliverable.id, e)}
                >
                  <div
                    className="h-full bg-brand-500 transition-all duration-150 flex items-center justify-center"
                    style={{ width: `${deliverable.progress}%` }}
                  >
                    {deliverable.progress > 10 && (
                      <span className="text-xs font-bold text-white">
                        {Math.round(deliverable.progress)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Deliverable */}
        <div className="pt-4 border-t border-border space-y-2">
          <label className="text-sm font-medium text-foreground">Add Deliverable</label>
          <div className="flex gap-2">
            <Input
              value={newDeliverableName}
              onChange={(e) => setNewDeliverableName(e.target.value)}
              placeholder="Enter deliverable name..."
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddDeliverable()
              }}
            />
            <Button
              onClick={handleAddDeliverable}
              className="bg-brand-500 hover:bg-brand-600 text-white"
              disabled={!newDeliverableName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

