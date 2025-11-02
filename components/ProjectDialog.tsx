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
import { Project, Person, ImportanceLevel } from "@/lib/types"

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (project: Partial<Project>) => void
  project?: Project
  people: Person[]
}

const projectColors = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
]

export function ProjectDialog({
  open,
  onOpenChange,
  onSave,
  project,
  people,
}: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [color, setColor] = useState(projectColors[0])
  const [importance, setImportance] = useState<ImportanceLevel>("medium")

  useEffect(() => {
    if (project) {
      setName(project.name)
      setStartDate(new Date(project.start).toISOString().split("T")[0])
      setEndDate(new Date(project.end).toISOString().split("T")[0])
      setColor(project.color)
      setImportance(project.importance)
    } else {
      setName("")
      setStartDate(new Date().toISOString().split("T")[0])
      const endDateDefault = new Date()
      endDateDefault.setDate(endDateDefault.getDate() + 7)
      setEndDate(endDateDefault.toISOString().split("T")[0])
      setColor(projectColors[0])
      setImportance("medium")
    }
  }, [project, open])

  const handleSave = () => {
    if (!name || !startDate || !endDate) return

    onSave({
      id: project?.id,
      name,
      start: new Date(startDate),
      end: new Date(endDate),
      color,
      importance,
      progress: project?.progress || 0,
      tasks: project?.tasks || [],
      isExpanded: project?.isExpanded !== false,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Update your project details below."
              : "Add a new project to your Gantt chart."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="importance">Importance Level</Label>
            <select
              id="importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Project Color</Label>
            <div className="flex gap-2">
              {projectColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? "border-gray-900 ring-2 ring-offset-2" : "border-gray-300"
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
            {project ? "Save Changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

