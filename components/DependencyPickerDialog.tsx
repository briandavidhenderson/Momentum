"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Link2, AlertCircle } from "lucide-react"
import type { Task, Subtask, MasterProject, Workpackage } from "@/lib/types"

interface DependencyPickerDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (dependencyIds: string[]) => void
  currentItem: Task | Subtask
  currentItemType: "task" | "subtask"
  projects: MasterProject[]
  workpackagesMap: Map<string, Workpackage>
  currentWorkpackageId?: string
}

interface TaskOption {
  id: string
  name: string
  projectName: string
  workpackageName: string
  type: "task" | "subtask"
  isCurrentItem: boolean
  wouldCreateCycle: boolean
}

export function DependencyPickerDialog({
  open,
  onClose,
  onConfirm,
  currentItem,
  currentItemType,
  projects,
  workpackagesMap,
  currentWorkpackageId,
}: DependencyPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    currentItem.dependencies || []
  )

  // Build list of all available tasks and subtasks
  const availableTasks = useMemo((): TaskOption[] => {
    const tasks: TaskOption[] = []

    projects.forEach(project => {
      project.workpackageIds.forEach(wpId => {
        const workpackage = workpackagesMap.get(wpId)
        if (!workpackage) return

        // Add tasks
        workpackage.tasks?.forEach(task => {
          const isCurrentItem = task.id === currentItem.id && currentItemType === "task"
          const wouldCreateCycle = checkForCycle(task.id, currentItem, currentItemType, workpackagesMap)

          tasks.push({
            id: task.id,
            name: task.name,
            projectName: project.name,
            workpackageName: workpackage.name,
            type: "task",
            isCurrentItem,
            wouldCreateCycle,
          })

          // Add subtasks
          task.subtasks?.forEach((subtask: Subtask) => {
            const isCurrentSubtask = subtask.id === currentItem.id && currentItemType === "subtask"
            const wouldCreateSubtaskCycle = checkForCycle(subtask.id, currentItem, currentItemType, workpackagesMap)

            tasks.push({
              id: subtask.id,
              name: `${task.name} → ${subtask.name}`,
              projectName: project.name,
              workpackageName: workpackage.name,
              type: "subtask",
              isCurrentItem: isCurrentSubtask,
              wouldCreateCycle: wouldCreateSubtaskCycle,
            })
          })
        })
      })
    })

    return tasks
  }, [projects, workpackagesMap, currentItem, currentItemType])

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    return availableTasks.filter(task => {
      const searchLower = searchTerm.toLowerCase()
      return (
        task.name.toLowerCase().includes(searchLower) ||
        task.projectName.toLowerCase().includes(searchLower) ||
        task.workpackageName.toLowerCase().includes(searchLower)
      )
    })
  }, [availableTasks, searchTerm])

  const handleToggleDependency = (taskId: string) => {
    setSelectedDependencies(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedDependencies)
    onClose()
  }

  const handleCancel = () => {
    setSelectedDependencies(currentItem.dependencies || [])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Manage Dependencies
          </DialogTitle>
          <DialogDescription>
            Select tasks that must be completed before{" "}
            <span className="font-semibold">{currentItem.name}</span> can start.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map(task => {
                const isSelected = selectedDependencies.includes(task.id)
                const isDisabled = task.isCurrentItem || task.wouldCreateCycle

                return (
                  <div
                    key={task.id}
                    className={`p-3 flex items-start gap-3 hover:bg-accent transition-colors ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    onClick={() => !isDisabled && handleToggleDependency(task.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => !isDisabled && handleToggleDependency(task.id)}
                      className="mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate flex-1 min-w-0">
                          {task.name}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          {task.type === "subtask" && (
                            <Badge variant="outline" className="text-xs">
                              Subtask
                            </Badge>
                          )}
                          {task.isCurrentItem && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {task.wouldCreateCycle && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Cycle
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.projectName} / {task.workpackageName}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedDependencies.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedDependencies.length} {selectedDependencies.length === 1 ? "dependency" : "dependencies"} selected
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Save Dependencies
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Check if adding a dependency would create a cycle
 * This prevents circular dependencies which would create logical impossibilities
 */
function checkForCycle(
  potentialDependencyId: string,
  currentItem: Task | Subtask,
  currentItemType: "task" | "subtask",
  workpackagesMap: Map<string, Workpackage>
): boolean {
  // If the potential dependency already depends on the current item (directly or indirectly),
  // adding it would create a cycle

  const visited = new Set<string>()
  const queue: string[] = [currentItem.id]

  while (queue.length > 0) {
    const itemId = queue.shift()!

    if (itemId === potentialDependencyId) {
      return true // Cycle detected
    }

    if (visited.has(itemId)) continue
    visited.add(itemId)

    // Find this item and check its dependencies
    for (const workpackage of workpackagesMap.values()) {
      for (const task of workpackage.tasks || []) {
        if (task.id === itemId) {
          task.dependencies?.forEach(depId => queue.push(depId))
        }

        for (const subtask of task.subtasks || []) {
          if (subtask.id === itemId) {
            subtask.dependencies?.forEach(depId => queue.push(depId))
          }
        }
      }
    }
  }

  return false
}
