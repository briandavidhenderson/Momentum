"use client"

import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { MasterProject, Workpackage, Task, Person, Subtask, Deliverable } from "@/lib/types"
import { useMemo, useState, useCallback } from "react"
import type { MouseEvent } from "react"
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GanttChartProps {
  projects: MasterProject[]
  workpackages?: Workpackage[] // Optional: workpackages loaded separately
  people: Person[]
  onDateChange?: (task: GanttTask) => void
  onTaskClick?: (task: Task) => void
  onPersonDropOnBar?: (taskOrProjectId: string, personId: string, isProject: boolean) => void
  onToggleExpand?: (id: string, isProject: boolean) => void
  onContextAction?: (action: GanttContextAction) => void
}

type GanttContextTargetType = "project" | "workpackage" | "task" | "subtask" | "deliverable"

interface GanttContextAction {
  action: "add-child" | "add-dependency" | "mark-complete" | "open-details"
  targetId: string
  targetType: GanttContextTargetType
}

// Custom Task List Header with expand/collapse column
const CustomTaskListHeader: React.FC<{
  headerHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
}> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
  return (
    <div
      style={{
        height: headerHeight,
        fontFamily: fontFamily,
        fontSize: fontSize,
        width: rowWidth,
        display: "flex",
        alignItems: "center",
        paddingLeft: "10px",
        fontWeight: "bold",
        background: "hsl(var(--brand-500))",
        color: "white",
      }}
    >
      Task Name
    </div>
  )
}

// Custom Task List Table with expand/collapse buttons
const CustomTaskListTable: React.FC<{
  rowHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
  locale: string
  tasks: GanttTask[]
  selectedTaskId: string
  setSelectedTask: (taskId: string) => void
  onToggleExpand?: (id: string, isProject: boolean) => void
  taskMeta: Map<string, { type: GanttContextTargetType; reference: any }>
  childCount: Map<string, number>
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, task: GanttTask) => void
}> = ({
  rowHeight,
  rowWidth,
  tasks,
  fontFamily,
  fontSize,
  selectedTaskId,
  setSelectedTask,
  onToggleExpand,
  taskMeta,
  childCount,
  onContextMenu,
}) => {
  return (
    <div
      style={{
        fontFamily: fontFamily,
        fontSize: fontSize,
      }}
    >
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId
        const meta = taskMeta.get(task.id)
        const type: GanttContextTargetType = meta?.type ?? (task.type === "project" ? "project" : task.type === "milestone" ? "deliverable" : "task")
        const isProject = type === "project" && !task.project
        const isMilestone = type === "deliverable"

        let level = 0
        let isExpanded = meta?.reference?.isExpanded !== false

        switch (type) {
          case "project":
            level = 0
            break
          case "workpackage":
            level = 1
            break
          case "task":
            level = 2
            break
          case "subtask":
            level = 3
            break
          case "deliverable":
            level = 4
            isExpanded = false
            break;
        }

        const hasChildren = (childCount.get(task.id) ?? 0) > 0 && !isMilestone
        const paddingLeft = `${10 + level * 20}px`

        return (
          <div
            key={task.id}
            style={{
              height: rowHeight,
              width: rowWidth,
              display: "flex",
              alignItems: "center",
              paddingLeft: paddingLeft,
              cursor: "pointer",
              fontWeight: isProject ? "bold" : level === 1 ? "600" : "normal",
              background: isSelected ? "hsl(var(--accent))" : "transparent",
              fontSize: isMilestone ? "0.9em" : "1em",
            }}
            onClick={() => setSelectedTask(task.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              onContextMenu?.(event, task)
            }}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand?.(task.id, isProject)
                }}
                style={{
                  marginRight: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {task.name.split("[")[0].trim()}
          </div>
        )
      })}
    </div>
  )
}

export function GanttChart({
  projects,
  workpackages = [],
  people,
  onDateChange,
  onTaskClick,
  onPersonDropOnBar,
  onToggleExpand,
  onContextAction,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    taskId: string
  } | null>(null)
  
  const columnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Hour:
        return 60
      case ViewMode.QuarterDay:
        return 60
      case ViewMode.HalfDay:
        return 60
      case ViewMode.Day:
        return 60
      case ViewMode.Week:
        return 250
      case ViewMode.Month:
        return 300
      case ViewMode.Year:
        return 350
      default:
        return 60
    }
  }, [viewMode])

  const { ganttTasks, metaMap } = useMemo(() => {
    const ganttTasks: GanttTask[] = []
    const metaMap = new Map<string, { type: GanttContextTargetType; reference: any }>()

    const addTask = (task: GanttTask, meta: { type: GanttContextTargetType; reference: any }) => {
      ganttTasks.push(task)
      metaMap.set(task.id, meta)
    }

    projects.forEach((project) => {
      // Ensure dates are Date objects (convert from ISO string if needed)
      const projectStart = typeof project.startDate === 'string' 
        ? new Date(project.startDate)
        : project.startDate
      const projectEnd = typeof project.endDate === 'string'
        ? new Date(project.endDate)
        : project.endDate
      
      addTask(
        {
          id: project.id,
          name: project.name,
          start: projectStart,
          end: projectEnd,
          progress: project.progress,
          type: "project",
          hideChildren: project.isExpanded === false,
        },
        { type: "project", reference: project }
      )

      if (project.isExpanded === false) {
        return
      }

      project.workpackageIds?.forEach((workpackageId) => {
        const workpackage = workpackages.find(wp => wp.id === workpackageId);
        if (!workpackage) return;
        
        // Ensure dates are Date objects (converted from Firestore Timestamps)
        const wpStart = workpackage.start instanceof Date 
          ? workpackage.start 
          : new Date(workpackage.start)
        const wpEnd = workpackage.end instanceof Date 
          ? workpackage.end 
          : new Date(workpackage.end)
        
        addTask(
          {
            id: workpackage.id,
            name: `WP: ${workpackage.name}`,
            start: wpStart,
            end: wpEnd,
            progress: workpackage.progress,
            type: "task",
            project: project.id,
            hideChildren: workpackage.isExpanded === false,
          },
          { type: "workpackage", reference: workpackage }
        )

        if (workpackage.isExpanded === false) {
          return
        }

        workpackage.tasks?.forEach((task) => {
          // Ensure dates are Date objects (converted from Firestore Timestamps)
          const taskStart = task.start instanceof Date 
            ? task.start 
            : new Date(task.start)
          const taskEnd = task.end instanceof Date 
            ? task.end 
            : new Date(task.end)
          
          addTask(
            {
              id: task.id,
              name: task.name,
              start: taskStart,
              end: taskEnd,
              progress: task.progress,
              type: "task",
              project: workpackage.id,
              hideChildren: task.isExpanded === false,
              dependencies: task.dependencies,
            },
            { type: "task", reference: task }
          )

          if (task.isExpanded === false) {
            // Still add deliverables even if task is collapsed
            task.deliverables?.forEach((deliverable) => {
              if (deliverable.dueDate) {
                addTask(
                  {
                    id: deliverable.id,
                    name: deliverable.name,
                    start: new Date(deliverable.dueDate),
                    end: new Date(deliverable.dueDate),
                    progress: deliverable.progress,
                    type: "milestone",
                    project: task.id,
                  },
                  { type: "deliverable", reference: deliverable }
                )
              }
            })
            return
          }

          // Add subtasks
          task.subtasks?.forEach((subtask) => {
            // Ensure dates are Date objects (converted from Firestore Timestamps)
            const subtaskStart = subtask.start instanceof Date 
              ? subtask.start 
              : new Date(subtask.start)
            const subtaskEnd = subtask.end instanceof Date 
              ? subtask.end 
              : new Date(subtask.end)
            
            addTask(
              {
                id: subtask.id,
                name: subtask.name,
                start: subtaskStart,
                end: subtaskEnd,
                progress: subtask.progress,
                type: "task",
                project: task.id,
                hideChildren: subtask.isExpanded === false,
                dependencies: subtask.dependencies,
              },
              { type: "subtask", reference: subtask }
            )

            // Add deliverables from subtasks
            subtask.deliverables?.forEach((deliverable) => {
              if (deliverable.dueDate) {
                addTask(
                  {
                    id: deliverable.id,
                    name: deliverable.name,
                    start: new Date(deliverable.dueDate),
                    end: new Date(deliverable.dueDate),
                    progress: deliverable.progress,
                    type: "milestone",
                    project: subtask.id,
                  },
                  { type: "deliverable", reference: deliverable }
                )
              }
            })
          })

          // Add deliverables from tasks
          task.deliverables?.forEach((deliverable) => {
            if (deliverable.dueDate) {
              addTask(
                {
                  id: deliverable.id,
                  name: deliverable.name,
                  start: new Date(deliverable.dueDate),
                  end: new Date(deliverable.dueDate),
                  progress: deliverable.progress,
                  type: "milestone",
                  project: task.id,
                },
                { type: "deliverable", reference: deliverable }
              )
            }
          })
        })
      })
    })

    return { ganttTasks, metaMap }
  }, [projects, workpackages])

  const childCount = useMemo(() => {
    const map = new Map<string, number>()
    ganttTasks.forEach((task) => {
      if (task.project) {
        map.set(task.project, (map.get(task.project) ?? 0) + 1)
      }
    })
    return map
  }, [ganttTasks])

  const handleRowContextMenu = useCallback((event: MouseEvent<HTMLDivElement>, task: GanttTask) => {
    setContextMenu({ x: event.clientX, y: event.clientY, taskId: task.id })
  }, [])

  const handleContextActionClick = useCallback((action: GanttContextAction["action"]) => {
    if (!contextMenu) return
    const meta = metaMap.get(contextMenu.taskId)
    if (!meta) return

    onContextAction?.({
      action,
      targetId: contextMenu.taskId,
      targetType: meta.type,
    })
    setContextMenu(null)
  }, [contextMenu, metaMap, onContextAction])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Handle clicking on task names in the list to open details
  const handleTaskListClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
    const meta = metaMap.get(taskId)
    if (!meta) return

    // Only call onTaskClick for actual tasks (not projects or workpackages)
    if (meta.type === "task" && onTaskClick) {
      onTaskClick(meta.reference as Task)
    } else if (meta.type === "subtask" && onTaskClick) {
      // For subtasks, find and open the parent task
      const subtask = meta.reference as Subtask
      for (const ganttTask of ganttTasks) {
        const taskMeta = metaMap.get(ganttTask.id)
        if (taskMeta?.type === "task") {
          const parentTask = taskMeta.reference as Task
          if (parentTask.subtasks?.some(st => st.id === subtask.id)) {
            onTaskClick(parentTask)
            return
          }
        }
      }
    }
  }, [metaMap, ganttTasks, onTaskClick])

  if (ganttTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500 text-lg">
          No projects yet. Create your first project to get started!
        </p>
      </div>
    )
  }

  return (
    <div className="gantt-container relative rounded-2xl shadow-sm border border-border p-6 overflow-hidden" style={{ background: "hsl(var(--surface-2))" }} onClick={() => contextMenu && closeContextMenu()}>
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground mr-2">Zoom:</span>
          <div className="flex gap-2">
            <Button
              variant={viewMode === ViewMode.Day ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(ViewMode.Day)}
              className={viewMode === ViewMode.Day ? "bg-brand-500 text-white" : ""}
            >
              Day
            </Button>
            <Button
              variant={viewMode === ViewMode.Week ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(ViewMode.Week)}
              className={viewMode === ViewMode.Week ? "bg-brand-500 text-white" : ""}
            >
              Week
            </Button>
            <Button
              variant={viewMode === ViewMode.Month ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(ViewMode.Month)}
              className={viewMode === ViewMode.Month ? "bg-brand-500 text-white" : ""}
            >
              Month
            </Button>
            <Button
              variant={viewMode === ViewMode.Year ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(ViewMode.Year)}
              className={viewMode === ViewMode.Year ? "bg-brand-500 text-white" : ""}
            >
              Year
            </Button>
          </div>
          <ZoomIn className="h-4 w-4 text-muted-foreground ml-2" />
        </div>
        <div className="text-sm text-muted-foreground">
          {ganttTasks.length} {ganttTasks.length === 1 ? 'item' : 'items'}
        </div>
      </div>
      
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        onDateChange={onDateChange}
        onClick={(task) => {
          const meta = metaMap.get(task.id)
          if (meta?.type === "task" && onTaskClick) {
            onTaskClick(meta.reference as Task)
          } else if (meta?.type === "subtask" && onTaskClick) {
            // For subtasks, find and open the parent task
            const subtask = meta.reference as Subtask
            // Find the parent task by looking for a task that has this subtask
            for (const ganttTask of ganttTasks) {
              const taskMeta = metaMap.get(ganttTask.id)
              if (taskMeta?.type === "task") {
                const parentTask = taskMeta.reference as Task
                if (parentTask.subtasks?.some(st => st.id === subtask.id)) {
                  onTaskClick(parentTask)
                  return
                }
              }
            }
          }
        }}
        listCellWidth="250px"
        columnWidth={columnWidth}
        TaskListHeader={CustomTaskListHeader}
        TaskListTable={(props) => (
          <CustomTaskListTable
            {...props}
            selectedTaskId={selectedTaskId}
            setSelectedTask={handleTaskListClick}
            onToggleExpand={onToggleExpand}
            taskMeta={metaMap}
            childCount={childCount}
            onContextMenu={handleRowContextMenu}
          />
        )}
        barFill={60}
        barCornerRadius={8}
        fontSize="14px"
        fontFamily="Inter, system-ui, sans-serif"
      />

      {contextMenu && (
        <div
          className="absolute z-50 w-48 rounded-lg border border-border bg-card shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent" onClick={() => handleContextActionClick("add-child")}>
            Add child
          </button>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent" onClick={() => handleContextActionClick("add-dependency")}>
            Add dependency
          </button>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent" onClick={() => handleContextActionClick("mark-complete")}>
            Mark complete
          </button>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent" onClick={() => handleContextActionClick("open-details")}>
            Open details
          </button>
          <button className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-accent" onClick={closeContextMenu}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}