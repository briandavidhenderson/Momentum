"use client"

import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { Project, Task, Person, Workpackage, Subtask, Deliverable } from "@/lib/types"
import { useMemo, useState, useCallback } from "react"
import type { MouseEvent } from "react"
import { useDroppable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GanttChartProps {
  projects: Project[]
  workpackages: Workpackage[]
  people: Person[]
  onDateChange?: (task: GanttTask) => void
  onTaskClick?: (task: Task) => void
  onPersonDropOnBar?: (taskOrProjectId: string, personId: string, isProject: boolean) => void
  onToggleExpand?: (id: string, isProject: boolean) => void
  onContextAction?: (action: GanttContextAction) => void
}

type GanttContextTargetType = "project" | "workpackage" | "regular-project" | "task" | "subtask" | "deliverable"

interface GanttContextAction {
  action: "add-child" | "add-dependency" | "mark-complete" | "open-details"
  targetId: string
  targetType: GanttContextTargetType
}

// Droppable bar wrapper component
function DroppableBar({ 
  id, 
  isProject, 
  children,
  onPersonDrop 
}: { 
  id: string
  isProject: boolean
  children: React.ReactNode
  onPersonDrop: (taskOrProjectId: string, personId: string, isProject: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `gantt-bar-${id}`,
    data: { type: "gantt-bar", id, isProject },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "relative",
        outline: isOver ? "3px solid #3b82f6" : "none",
        outlineOffset: "2px",
        borderRadius: "8px",
      }}
    >
      {children}
    </div>
  )
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
            level = task.project ? 2 : 0
            break
          case "workpackage":
            level = 1
            break
          case "regular-project":
            level = 2
            break
          case "task":
            level = task.project && taskMeta.get(task.project)?.type === "regular-project" ? 3 : 2
            break
          case "subtask":
            level = 4
            break
          case "deliverable":
            level = 5
            isExpanded = false
            break
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
  workpackages,
  people, 
  onDateChange, 
  onTaskClick,
  onPersonDropOnBar,
  onToggleExpand,
  onContextAction,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    taskId: string
  } | null>(null)
  
  // Calculate column width based on view mode
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

    const getInvolvedPeople = (tasks?: Task[] | Subtask[]) => {
      const involvedPeopleIds = new Set<string>()
      tasks?.forEach((task) => {
        if ("primaryOwner" in task && task.primaryOwner) involvedPeopleIds.add(task.primaryOwner)
        if ("ownerId" in task && task.ownerId) involvedPeopleIds.add(task.ownerId)
        const helpers = "helpers" in task ? task.helpers : undefined
        helpers?.forEach((helper) => involvedPeopleIds.add(helper))
      })
      return Array.from(involvedPeopleIds)
        .map((id) => people.find((person) => person.id === id))
        .filter((person): person is Person => person !== undefined)
    }

    const getColorsFromPeople = (involvedPeople: Person[], defaultColor: string) => {
      let color = defaultColor
      let backgroundColor = defaultColor
      const initials = involvedPeople.length > 0 ? involvedPeople.map((p) => p.name.charAt(0).toUpperCase()).join("") : ""

      if (involvedPeople.length === 1) {
        color = involvedPeople[0].color
        backgroundColor = color
      } else if (involvedPeople.length > 1) {
        color = involvedPeople[0].color
        const gradientStops = involvedPeople
          .map((person, index) => {
            const start = (index / involvedPeople.length) * 100
            const end = ((index + 1) / involvedPeople.length) * 100
            return `${person.color} ${start}%, ${person.color} ${end}%`
          })
          .join(", ")
        backgroundColor = `linear-gradient(90deg, ${gradientStops})`
      }

      return { color, backgroundColor, initials }
    }

    const pushDeliverables = (parentId: string, deliverables: Deliverable[] | undefined, colors: { color: string; backgroundColor: string }, parentMeta: { type: GanttContextTargetType; reference: any }) => {
      if (!deliverables?.length) return
      deliverables.forEach((deliverable) => {
        const dueDate = deliverable.dueDate ? new Date(deliverable.dueDate) : undefined
        const milestoneDate = dueDate ?? new Date(parentMeta.reference.end ?? parentMeta.reference.endDate ?? new Date())
        addTask(
          {
            id: deliverable.id,
            name: `📋 ${deliverable.name}`,
            start: milestoneDate,
            end: milestoneDate,
            progress: deliverable.progress,
            type: "milestone",
            project: parentId,
            styles: {
              progressColor: colors.color,
              progressSelectedColor: colors.color,
              backgroundColor: colors.backgroundColor,
              backgroundSelectedColor: colors.backgroundColor,
            },
          },
          { type: "deliverable", reference: deliverable }
        )
      })
    }

    const pushSubtasks = (task: Task, parentId: string, colors: { color: string; backgroundColor: string }) => {
      if (!task.subtasks || task.subtasks.length === 0 || task.isExpanded === false) return
      task.subtasks.forEach((subtask) => {
        const subAssignees = getInvolvedPeople([subtask])
        const subColors = getColorsFromPeople(subAssignees, colors.color)
        addTask(
          {
            id: subtask.id,
            name: subAssignees.length ? `${subtask.name} [${subAssignees.map((p) => p.name.charAt(0).toUpperCase()).join("")}]` : subtask.name,
            start: new Date(subtask.start),
            end: new Date(subtask.end),
            progress: subtask.progress,
            type: "task",
            project: parentId,
            hideChildren: subtask.isExpanded === false,
            dependencies: subtask.dependencies,
            styles: {
              progressColor: subColors.color,
              progressSelectedColor: subColors.color,
              backgroundColor: subColors.backgroundColor,
              backgroundSelectedColor: subColors.backgroundColor,
            },
          },
          { type: "subtask", reference: subtask }
        )

        pushDeliverables(subtask.id, subtask.deliverables, subColors, { type: "subtask", reference: subtask })
      })
    }

    projects.forEach((project) => {
      const projectWorkpackages = workpackages.filter((wp) => wp.profileProjectId === project.id)
      const allProjectTasks: Task[] = []
      projectWorkpackages.forEach((wp) => {
        if (wp.tasks) allProjectTasks.push(...wp.tasks)
      })
      if (project.tasks) allProjectTasks.push(...project.tasks)

      const projectInvolved = getInvolvedPeople(allProjectTasks)
      const projectColors = getColorsFromPeople(projectInvolved, project.color)

      addTask(
        {
          id: project.id,
          name: projectColors.initials ? `${project.name} [${projectColors.initials}]` : project.name,
          start: new Date(project.start),
          end: new Date(project.end),
          progress: project.progress,
          type: "project",
          hideChildren: project.isExpanded === false,
          styles: {
            progressColor: projectColors.color,
            progressSelectedColor: projectColors.color,
            backgroundColor: projectColors.backgroundColor,
            backgroundSelectedColor: projectColors.backgroundColor,
          },
        },
        { type: "project", reference: project }
      )

      if (project.isExpanded === false) {
        return
      }

      projectWorkpackages.forEach((workpackage) => {
        const wpInvolved = getInvolvedPeople(workpackage.tasks)
        const wpColors = getColorsFromPeople(wpInvolved, project.color)

        addTask(
          {
            id: workpackage.id,
            name: wpColors.initials ? `WP: ${workpackage.name} [${wpColors.initials}]` : `WP: ${workpackage.name}`,
            start: new Date(workpackage.start),
            end: new Date(workpackage.end),
            progress: workpackage.progress,
            type: "task",
            project: project.id,
            hideChildren: workpackage.isExpanded === false,
            styles: {
              progressColor: wpColors.color,
              progressSelectedColor: wpColors.color,
              backgroundColor: wpColors.backgroundColor,
              backgroundSelectedColor: wpColors.backgroundColor,
            },
          },
          { type: "workpackage", reference: workpackage }
        )

        if (workpackage.isExpanded === false) {
          return
        }

        // Nested regular projects inside workpackage
        workpackage.regularProjects?.forEach((regularProject) => {
          const regularTasks = regularProject.tasks ?? []
          const regularInvolved = getInvolvedPeople(regularTasks)
          const regularColors = getColorsFromPeople(regularInvolved, project.color)

          addTask(
            {
              id: regularProject.id,
              name: regularColors.initials ? `${regularProject.name} [${regularColors.initials}]` : regularProject.name,
              start: new Date(regularProject.start),
              end: new Date(regularProject.end),
              progress: regularProject.progress,
              type: "project",
              project: workpackage.id,
              hideChildren: regularProject.isExpanded === false,
              styles: {
                progressColor: regularColors.color,
                progressSelectedColor: regularColors.color,
                backgroundColor: regularColors.backgroundColor,
                backgroundSelectedColor: regularColors.backgroundColor,
              },
            },
            { type: "regular-project", reference: regularProject }
          )

          const parentId = regularProject.id
          const parentExpanded = regularProject.isExpanded !== false

          if (parentExpanded) {
            regularTasks.forEach((task) => {
              const taskAssignees = getInvolvedPeople([task])
              const taskColors = getColorsFromPeople(taskAssignees, regularColors.color)
              addTask(
                {
                  id: task.id,
                  name: taskColors.initials ? `${task.name} [${taskColors.initials}]` : task.name,
                  start: new Date(task.start),
                  end: new Date(task.end),
                  progress: task.progress,
                  type: "task",
                  project: parentId,
                  hideChildren: task.isExpanded === false,
                  dependencies: task.dependencies,
                  styles: {
                    progressColor: taskColors.color,
                    progressSelectedColor: taskColors.color,
                    backgroundColor: taskColors.backgroundColor,
                    backgroundSelectedColor: taskColors.backgroundColor,
                  },
                },
                { type: "task", reference: task }
              )

              pushSubtasks(task, task.id, taskColors)
              pushDeliverables(task.id, task.deliverables, taskColors, { type: "task", reference: task })
            })
          }
        })

        workpackage.tasks?.forEach((task) => {
          const taskAssignees = getInvolvedPeople([task])
          const taskColors = getColorsFromPeople(taskAssignees, project.color)
          addTask(
            {
              id: task.id,
              name: taskColors.initials ? `${task.name} [${taskColors.initials}]` : task.name,
              start: new Date(task.start),
              end: new Date(task.end),
              progress: task.progress,
              type: "task",
              project: workpackage.id,
              hideChildren: task.isExpanded === false,
              dependencies: task.dependencies,
              styles: {
                progressColor: taskColors.color,
                progressSelectedColor: taskColors.color,
                backgroundColor: taskColors.backgroundColor,
                backgroundSelectedColor: taskColors.backgroundColor,
              },
            },
            { type: "task", reference: task }
          )

          pushSubtasks(task, task.id, taskColors)
          pushDeliverables(task.id, task.deliverables, taskColors, { type: "task", reference: task })
        })
      })

      // Standalone tasks for backwards compatibility
      project.tasks?.forEach((task) => {
        const taskAssignees = getInvolvedPeople([task])
        const taskColors = getColorsFromPeople(taskAssignees, project.color)
        addTask(
          {
            id: task.id,
            name: taskColors.initials ? `${task.name} [${taskColors.initials}]` : task.name,
            start: new Date(task.start),
            end: new Date(task.end),
            progress: task.progress,
            type: "task",
            project: project.id,
            hideChildren: task.isExpanded === false,
            dependencies: task.dependencies,
            styles: {
              progressColor: taskColors.color,
              progressSelectedColor: taskColors.color,
              backgroundColor: taskColors.backgroundColor,
              backgroundSelectedColor: taskColors.backgroundColor,
            },
          },
          { type: "task", reference: task }
        )

        pushSubtasks(task, task.id, taskColors)
        pushDeliverables(task.id, task.deliverables, taskColors, { type: "task", reference: task })
      })
    })

    return { ganttTasks, metaMap }
  }, [projects, workpackages, people])

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
      {/* View Mode Controls */}
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
          }
        }}
        listCellWidth="250px"
        columnWidth={columnWidth}
        TaskListHeader={CustomTaskListHeader}
        TaskListTable={(props) => (
          <CustomTaskListTable 
            {...props} 
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
