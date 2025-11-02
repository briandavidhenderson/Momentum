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
import { Task, Person, Project } from "@/lib/types"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Partial<Task>) => void
  task?: Task
  projects: Project[]
  people: Person[]
}

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  task,
  projects,
  people,
}: TaskDialogProps) {
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [projectId, setProjectId] = useState("")
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (task) {
      setName(task.name)
      setStartDate(new Date(task.start).toISOString().split("T")[0])
      setEndDate(new Date(task.end).toISOString().split("T")[0])
      // Set primary owner
      setAssignedTo(task.primaryOwner || "")
      setProjectId(task.workpackageId)
      setProgress(task.progress)
    } else {
      setName("")
      setStartDate(new Date().toISOString().split("T")[0])
      const endDateDefault = new Date()
      endDateDefault.setDate(endDateDefault.getDate() + 3)
      setEndDate(endDateDefault.toISOString().split("T")[0])
      setAssignedTo("")
      setProjectId(projects[0]?.id || "")
      setProgress(0)
    }
  }, [task, open, projects])

  const handleSave = () => {
    if (!name || !startDate || !endDate || !projectId) return

    onSave({
      id: task?.id,
      name,
      start: new Date(startDate),
      end: new Date(endDate),
      primaryOwner: assignedTo || undefined,
      helpers: task?.helpers || [],
      workpackageId: projectId,
      progress,
      deliverables: task?.deliverables || [],
      importance: task?.importance || "medium",
      notes: task?.notes || "",
      isExpanded: task?.isExpanded || false,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update your task details below."
              : "Add a new task to your project."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="taskName">Task Name</Label>
            <Input
              id="taskName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter task name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project">Project</Label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="taskStart">Start Date</Label>
              <Input
                id="taskStart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskEnd">End Date</Label>
              <Input
                id="taskEnd"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="taskAssignedTo">Primary Owner</Label>
            <select
              id="taskAssignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="progress">Progress ({progress}%)</Label>
            <input
              id="progress"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {task ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


