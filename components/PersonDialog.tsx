"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Person } from "@/lib/types"

interface PersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (person: Partial<Person>) => void
  person?: Person
}

const personColors = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
  "#84cc16", // lime
  "#a855f7", // purple
  "#f43f5e", // rose
  "#22d3ee", // sky
]

export function PersonDialog({
  open,
  onOpenChange,
  onSave,
  person,
}: PersonDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(personColors[0])

  useEffect(() => {
    if (person) {
      setName(person.name)
      setColor(person.color)
    } else {
      setName("")
      setColor(personColors[0])
    }
  }, [person, open])

  const handleSave = () => {
    if (!name) return

    onSave({
      id: person?.id,
      name,
      color,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {person ? "Edit Person" : "Add New Person"}
          </DialogTitle>
          <DialogDescription>
            {person
              ? "Update person details below."
              : "Add a new team member to assign to projects and tasks."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="personName">Name</Label>
            <Input
              id="personName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter person's name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {personColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    color === c 
                      ? "border-brand-500 ring-2 ring-brand-500 ring-offset-2 ring-offset-background scale-110" 
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {person ? "Save Changes" : "Add Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


