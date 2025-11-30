"use client"

import { useState, useMemo, useCallback, MouseEvent } from "react"
import { z } from "zod"
import Link from "next/link"
import { useAppContext } from "@/lib/AppContext"
import { useGroupContext } from "@/lib/GroupContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { ProjectImportDialog } from "@/components/projects/ProjectImportDialog"
import { DeliverableDialog } from "@/components/DeliverableDialog"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { PersonalTasksWidget } from "@/components/projects/PersonalTasksWidget"
import { TaskCreationDialog } from "@/components/projects/TaskCreationDialog"
import { TaskEditDialog } from "@/components/projects/TaskEditDialog"
import { MasterProject, Workpackage, Deliverable, PersonProfile, ProjectTask, ProfileProject, HydratedWorkpackage } from "@/lib/types"
import {
  Plus,
  FolderKanban,
  Loader2,
  AlertCircle,
  Upload,
  Search,
  Filter,
  DollarSign,
  CalendarDays,
  GanttChart as GanttChartIcon,
  KanbanSquare,
  ListTree,
} from "lucide-react"
import { logger } from "@/lib/logger"
import { calculateProjectHealth, getHealthStatusColor, ProjectHealth } from "@/lib/utils/projectHealth"
import { calculateBudgetsForProjects, getBudgetStatusColor, ProjectBudgetSummary } from "@/lib/utils/budgetCalculation"
import { GanttChart as ProjectGanttChart } from "@/components/GanttChart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GroupSelector } from "@/components/GroupSelector"
import { ProjectKanbanBoard } from "./ProjectKanbanBoard"
import { personProfilesToPeople } from "@/lib/personHelpers"
import { useToast } from "@/lib/toast"
import { PersonalLedger } from "@/components/PersonalLedger"

export function ProjectDashboard() {
  const { toast, error: toastError } = useToast()
  const { currentUser: user, currentUserProfile: profile } = useAuth()
  const {
    projects,
    workpackages: allWorkpackages,
    deliverables,
    orders,
    handleCreateMasterProject,
    handleUpdateMasterProject,
    handleDeleteMasterProject,
    handleUpdateWorkpackage,
    handleCreateDeliverable,
    handleUpdateDeliverable,
    handleDeleteDeliverable,
    handleCreateWorkpackage: createWorkpackage,
    projectsSyncStatus,
    allProfiles,
    people,
    handleUpdateDeliverableTasks,
  } = useAppContext()

  // Get selected group for filtering
  const { selectedGroupId } = useGroupContext()

  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeliverableDialog, setShowDeliverableDialog] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [deliverableMode, setDeliverableMode] = useState<"create" | "edit" | "view">("create")
  const [deliverableParentId, setDeliverableParentId] = useState<string | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showTaskEditDialog, setShowTaskEditDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null)
  const [taskDeliverableId, setTaskDeliverableId] = useState<string>("")
  const [taskWorkpackageId, setTaskWorkpackageId] = useState<string>("")

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [fundingFilter, setFundingFilter] = useState<string>("all")
  const [healthFilter, setHealthFilter] = useState<string>("all")
  const [projectView, setProjectView] = useState<"list" | "kanban" | "gantt" | "calendar" | "ledger">("list")

  // Calculate budget summaries for all projects
  const budgetSummaries = useMemo(() => {
    if (!projects || !orders) return new Map<string, ProjectBudgetSummary>()
    return calculateBudgetsForProjects(projects, orders)
  }, [projects, orders])

  const isProjectFunded = useCallback(
    (project: MasterProject) => !!(project.funderId && project.totalBudget && project.totalBudget > 0),
    []
  )

  // Calculate health for all projects
  const projectHealths = useMemo(() => {
    if (!projects || !allWorkpackages || !deliverables) return new Map<string, ProjectHealth>()

    const healthMap = new Map<string, ProjectHealth>()
    projects.forEach(project => {
      const health = calculateProjectHealth(project, deliverables, allWorkpackages)
      healthMap.set(project.id, health)
    })
    return healthMap
  }, [projects, allWorkpackages, deliverables])

  // Filter and group projects
  const filteredProjects = useMemo(() => {
    if (!projects) return []

    let filtered = [...projects]

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.funderName?.toLowerCase().includes(term) ||
          p.grantName?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Filter by health
    if (healthFilter !== "all") {
      filtered = filtered.filter(p => {
        const health = projectHealths.get(p.id)
        return health?.status === healthFilter
      })
    }

    if (selectedGroupId) {
      filtered = filtered.filter(p =>
        !p.groupIds || p.groupIds.length === 0 || p.groupIds.includes(selectedGroupId)
      )
    }

    // Filter by funding type
    if (fundingFilter === "funded") {
      filtered = filtered.filter(p => (p.type || "unfunded") === "funded")
    } else if (fundingFilter === "unfunded") {
      filtered = filtered.filter(p => (p.type || "unfunded") === "unfunded")
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name))
    return filtered
  }, [projects, searchTerm, statusFilter, healthFilter, fundingFilter, projectHealths, selectedGroupId])

  const fundedProjects = useMemo(() => filteredProjects.filter(isProjectFunded), [filteredProjects, isProjectFunded])
  const unfundedProjects = useMemo(() => filteredProjects.filter(project => !isProjectFunded(project)), [filteredProjects, isProjectFunded])

  const projectLookup = useMemo(
    () => new Map(filteredProjects.map(project => [project.id, project])),
    [filteredProjects]
  )

  const peopleList = useMemo(() => personProfilesToPeople(allProfiles), [allProfiles])

  const renderHealthBadge = (health?: ProjectHealth) => {
    if (!health) return null
    return (
      <Badge className={getHealthStatusColor(health.status)}>
        <span className="capitalize">{health.status.replace("-", " ")}</span>
      </Badge>
    )
  }

  const renderBudgetChip = (budgetSummary?: ProjectBudgetSummary) => {
    if (!budgetSummary || !budgetSummary.totalBudget) return null
    return (
      <Badge className={`${getBudgetStatusColor(budgetSummary.utilizationPercentage)} text-white`}>
        Budget {budgetSummary.utilizationPercentage}%
      </Badge>
    )
  }

  const renderStatusBadge = (status: string) => (
    <Badge variant="secondary" className="capitalize">
      {status.replace("-", " ")}
    </Badge>
  )

  const statusColumns = [
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on-hold", label: "On Hold" },
    { value: "cancelled", label: "Cancelled" },
  ]

  const relevantWorkpackages = useMemo(
    () => allWorkpackages.filter(wp => filteredProjects.some(project => project.workpackageIds.includes(wp.id))),
    [allWorkpackages, filteredProjects]
  )

  const relevantDeliverables = useMemo(
    () => deliverables.filter(deliverable => relevantWorkpackages.some(wp => wp.id === deliverable.workpackageId)),
    [deliverables, relevantWorkpackages]
  )

  interface CalendarViewItem {
    id: string
    date: Date
    label: string
    description?: string
    projectId: string
  }

  const calendarItems = useMemo<CalendarViewItem[]>(() => {
    const items: CalendarViewItem[] = []

    filteredProjects.forEach(project => {
      items.push({
        id: `${project.id}-start`,
        date: new Date(project.startDate),
        label: `${project.name} kickoff`,
        description: "Project start",
        projectId: project.id,
      })

      items.push({
        id: `${project.id}-end`,
        date: new Date(project.endDate),
        label: `${project.name} finish`,
        description: "Project end",
        projectId: project.id,
      })
    })

    relevantWorkpackages.forEach(workpackage => {
      items.push({
        id: `${workpackage.id}-start`,
        date: workpackage.start instanceof Date ? workpackage.start : new Date(workpackage.start),
        label: `${workpackage.name} starts`,
        description: "Workpackage start",
        projectId: workpackage.projectId,
      })
      items.push({
        id: `${workpackage.id}-end`,
        date: workpackage.end instanceof Date ? workpackage.end : new Date(workpackage.end),
        label: `${workpackage.name} ends`,
        description: "Workpackage end",
        projectId: workpackage.projectId,
      })
    })

    relevantDeliverables.forEach(deliverable => {
      if (deliverable.dueDate || deliverable.startDate) {
        const dueDate = deliverable.dueDate || deliverable.startDate
        const deliverableProjectId = relevantWorkpackages.find(wp => wp.id === deliverable.workpackageId)?.projectId
        items.push({
          id: deliverable.id,
          date: new Date(dueDate as string),
          label: `${deliverable.name} due`,
          description: "Deliverable milestone",
          projectId: deliverableProjectId || "",
        })
      }
    })

    return items
      .filter(item => item.projectId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [filteredProjects, relevantDeliverables, relevantWorkpackages])

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

  const projectDialogSchema = z.object({
    name: z.string().trim().min(1, "Project name is required"),
    description: z.string().optional().default(""),
    grantName: z.string().optional().default(""),
    grantNumber: z.string().optional().default(""),
    budget: z.coerce.number().nonnegative().optional().default(0),
    startDate: z
      .string()
      .refine(value => !!value && !Number.isNaN(Date.parse(value)), {
        message: "Please provide a valid start date",
      }),
    endDate: z
      .string()
      .refine(value => !!value && !Number.isNaN(Date.parse(value)), {
        message: "Please provide a valid end date",
      }),
    funderId: z.string().optional().default(""),
    fundedBy: z.array(z.string()).optional().default([]),
    principalInvestigatorId: z.string().optional(),
    status: z.enum(["planning", "active", "completed", "on-hold", "cancelled"]),
    groupIds: z.array(z.string()).optional().default([]),
    visibility: z.string().optional().default("lab"),
    visibleTo: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),
    type: z.enum(["funded", "unfunded"]).optional(),
    legacyTypeLabel: z.string().optional(),
  })

  const handleCardLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = event.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select")
    ) {
      event.preventDefault()
    }
  }

  const renderProjectCard = (project: MasterProject) => {
    const budgetSummary = budgetSummaries.get(project.id)
    const health = projectHealths.get(project.id)

    return (
      <Link
        key={project.id}
        href={`/projects/${project.id}`}
        className="block"
        onClick={handleCardLinkClick}
      >
        <ProjectCard
          project={project}
          workpackages={allWorkpackages as unknown as HydratedWorkpackage[]}
          deliverables={deliverables}
          people={allProfiles}
          budgetSummary={budgetSummary}
          health={health}
          onCreateWorkpackage={async (projectId) => {
            const workpackageId = await createWorkpackage({
              name: "New Work Package",
              projectId,
              start: new Date(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "planning",
              progress: 0,
              deliverableIds: [],
              isExpanded: true,
              importance: "medium",

            })

            if (workpackageId) {
              await handleUpdateMasterProject(projectId, {
                workpackageIds: [...(project.workpackageIds || []), workpackageId],
              })
            }
          }}
          onEditTask={(task) => {
            try {
              if (task && task.id) {
                setSelectedTask(task)
                setShowTaskEditDialog(true)
              }
            } catch (error) {
              logger.error("Error opening task edit dialog", error)
            }
          }}
          onContextAction={(action) => {
            const { action: actionType, targetId, targetType } = action

            if (actionType === "add-child" && targetType === "deliverable") {
              const deliverable = deliverables.find(d => d.id === targetId)
              if (deliverable) {
                setTaskDeliverableId(targetId)
                setTaskWorkpackageId(deliverable.workpackageId)
                setShowTaskDialog(true)
              }
            } else if (actionType === "open-details") {
              if (targetType === "task") {
                // Find task across all workpackages/deliverables
                let foundTask: ProjectTask | undefined
                for (const wp of allWorkpackages) {
                  if (wp.deliverables) {
                    for (const d of wp.deliverables) {
                      if (d.tasks) {
                        const t = d.tasks.find(t => t.id === targetId)
                        if (t) {
                          foundTask = t
                          break
                        }
                      }
                    }
                  }
                  if (foundTask) break
                }

                if (foundTask) {
                  setSelectedTask(foundTask)
                  setShowTaskEditDialog(true)
                }
              } else if (targetType === "deliverable") {
                const deliverable = deliverables.find(d => d.id === targetId)
                if (deliverable) {
                  setSelectedDeliverable(deliverable)
                  setDeliverableMode("edit")
                  setShowDeliverableDialog(true)
                }
              } else if (targetType === "workpackage") {
                const workpackage = allWorkpackages.find(wp => wp.id === targetId)
                if (workpackage) {
                  handleUpdateWorkpackage(workpackage.id, workpackage) // This seems to just trigger update? Maybe open dialog?
                  // The original code was: onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                  // But handleUpdateWorkpackage usually takes updates. 
                  // Maybe it was meant to open a dialog? 
                  // 'handleUpdateWorkpackage' from context updates Firestore.
                  // There is no 'setSelectedWorkpackage' or 'setShowWorkpackageDialog' in ProjectDashboard?
                  // Let's check if there is a workpackage dialog in ProjectDashboard.
                  // There isn't one visible in the file snippet.
                  // So maybe editing workpackage is not fully supported in Dashboard yet?
                  // I will leave it as is or log a warning.
                  logger.warn("Edit workpackage not implemented in Dashboard")
                }
              }
            }
          }}
        />
      </Link>
    )
  }

  const handleCreateTask = useCallback(async (taskData: Partial<ProjectTask> & { deliverableId: string }) => {
    try {
      // Find the deliverable to get current tasks
      let targetDeliverable: any = null
      for (const wp of allWorkpackages) {
        if (wp.deliverables) {
          const found = wp.deliverables.find(d => d.id === taskData.deliverableId)
          if (found) {
            targetDeliverable = found
            break
          }
        }
      }

      if (!targetDeliverable) {
        throw new Error("Deliverable not found")
      }

      const newTask: ProjectTask = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `task-${Date.now()}`,
        name: taskData.name || "New Task",
        start: taskData.start || new Date(),
        end: taskData.end || new Date(),
        progress: taskData.progress || 0,
        status: taskData.status || "not-started",
        deliverableId: taskData.deliverableId,
        primaryOwner: taskData.primaryOwner,
        helpers: taskData.helpers,
        importance: taskData.importance || "medium",
        notes: taskData.notes,
        todos: [],
        dependencies: []
      }

      const currentTasks = Array.isArray(targetDeliverable.tasks) ? targetDeliverable.tasks : []
      const nextTasks = [...currentTasks, newTask]

      await handleUpdateDeliverableTasks(targetDeliverable.id, nextTasks)

      setShowTaskDialog(false)
      toast({ title: "Success", description: "Task created successfully" })
    } catch (error) {
      logger.error("Error creating task", error)
      toastError(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateDeliverableTasks, toastError, toast])

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<ProjectTask>) => {
    try {
      // Find the deliverable containing this task
      let targetDeliverable: any = null
      for (const wp of allWorkpackages) {
        if (wp.deliverables) {
          const found = wp.deliverables.find(d => d.tasks?.some((t: ProjectTask) => t.id === taskId))
          if (found) {
            targetDeliverable = found
            break
          }
        }
      }

      if (!targetDeliverable) {
        throw new Error("Deliverable not found for task")
      }

      const currentTasks = (Array.isArray(targetDeliverable.tasks) ? targetDeliverable.tasks : []) as ProjectTask[]
      const updatedTasks = currentTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )

      await handleUpdateDeliverableTasks(targetDeliverable.id, updatedTasks)

      logger.info("Task updated successfully", { taskId, deliverableId: targetDeliverable.id })
      setShowTaskEditDialog(false)
      setSelectedTask(null)
    } catch (error) {
      logger.error("Error updating task", error)
      toastError(`Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateDeliverableTasks, toastError])

  const handleDeleteTask = useCallback(async (workpackageId: string, taskId: string) => {
    try {
      // Find the deliverable containing this task
      // Note: workpackageId might be passed, but we should verify or find the deliverable
      let targetDeliverable: any = null

      // Try finding via workpackageId first if possible, but searching all is safer for now
      for (const wp of allWorkpackages) {
        if (wp.deliverables) {
          const found = wp.deliverables.find(d => d.tasks?.some((t: ProjectTask) => t.id === taskId))
          if (found) {
            targetDeliverable = found
            break
          }
        }
      }

      if (!targetDeliverable) {
        throw new Error("Deliverable not found for task")
      }

      const currentTasks = (Array.isArray(targetDeliverable.tasks) ? targetDeliverable.tasks : []) as ProjectTask[]
      const updatedTasks = currentTasks.filter(task => task.id !== taskId)

      await handleUpdateDeliverableTasks(targetDeliverable.id, updatedTasks)

      toast({ title: "Success", description: "Task deleted successfully" })
    } catch (error) {
      logger.error("Error deleting task", error)
      toastError(`Failed to delete task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateDeliverableTasks, toastError, toast])

  const handleCreateMasterProjectFromDialog = async (
    projectData: ProfileProject & { funderId?: string; groupIds?: string[] }
  ) => {
    if (!profile || !user) return

    const parsedProject = projectDialogSchema.parse(projectData)

    const mapVisibility = (vis: string): "private" | "lab" | "institute" | "organisation" => {
      switch (vis) {
        case "private":
        case "postdocs":
        case "pi-researchers":
        case "custom":
          return "private"
        case "lab":
          return "lab"
        case "institute":
          return "institute"
        case "organisation":
          return "organisation"
        default:
          return "lab"
      }
    }

    const newProject: Omit<MasterProject, "id" | "createdAt"> = {
      name: parsedProject.name,
      description: parsedProject.description,
      labId: profile.labId,
      labName: profile.labName,
      instituteId: profile.instituteId,
      instituteName: profile.instituteName,
      organisationId: profile.organisationId,
      organisationName: profile.organisationName,
      grantName: parsedProject.grantName,
      grantNumber: parsedProject.grantNumber,
      totalBudget: parsedProject.budget,
      currency: "EUR",
      startDate: parsedProject.startDate,
      endDate: parsedProject.endDate,
      funderId: parsedProject.funderId,
      funderName: "",
      accountIds: parsedProject.fundedBy,
      principalInvestigatorIds: parsedProject.principalInvestigatorId
        ? [parsedProject.principalInvestigatorId]
        : profile.id
          ? [profile.id]
          : [],
      coPIIds: [],
      teamMemberIds: parsedProject.principalInvestigatorId
        ? [parsedProject.principalInvestigatorId]
        : profile.id
          ? [profile.id]
          : [],
      teamRoles: parsedProject.principalInvestigatorId
        ? { [parsedProject.principalInvestigatorId]: "PI" }
        : profile.id
          ? { [profile.id]: "PI" }
          : {},
      status: parsedProject.status,
      progress: 0,
      workpackageIds: [],
      groupIds: parsedProject.groupIds.length > 0 ? parsedProject.groupIds : selectedGroupId ? [selectedGroupId] : [],
      visibility: mapVisibility(parsedProject.visibility),
      visibleTo: parsedProject.visibleTo,
      tags: parsedProject.tags,
      notes: parsedProject.notes,
      createdBy: user.uid,
      isExpanded: true,
      type: parsedProject.type || (parsedProject.funderId ? "funded" : "unfunded"),
      legacyTypeLabel: parsedProject.legacyTypeLabel || parsedProject.type,
    }

    try {
      await handleCreateMasterProject(newProject)
      setShowProjectDialog(false)
    } catch (error) {
      logger.error("Error creating master project", error)
      toastError(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Loading state
  if (!profile) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Projects</h3>
          <p className="text-sm text-muted-foreground">Fetching your project data...</p>
        </div>
      </div>
    )
  }

  const totalProjects = filteredProjects.length
  const totalPortfolioCount = projects?.length || 0
  const activeProjects = filteredProjects.filter(p => p.status === "active").length

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Portfolio</h1>
            <p className="text-sm text-muted-foreground">
              {totalProjects} project{totalProjects !== 1 ? 's' : ''} • {activeProjects} active
            </p>
          </div>
          {projectsSyncStatus === 'syncing' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing...
            </Badge>
          )}
          {projectsSyncStatus === 'error' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sync Error
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowProjectDialog(true)} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <GroupSelector />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="at-risk">At Risk</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fundingFilter} onValueChange={setFundingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Funding" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="unfunded">Unfunded</SelectItem>
          </SelectContent>
        </Select>

        <Tabs
          value={projectView}
          onValueChange={(value) => setProjectView(value as typeof projectView)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="list" className="gap-2">
              <ListTree className="h-4 w-4" />
              List / Tree
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <KanbanSquare className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <GanttChartIcon className="h-4 w-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Ledger
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 overflow-hidden min-h-0">
        {projectView === 'ledger' ? (
          <div className="col-span-1 lg:col-span-2 h-full overflow-hidden">
            <PersonalLedger />
          </div>
        ) : (
          <>
            {/* Personal Tasks Sidebar */}
            <div className="hidden lg:block overflow-hidden">
              <PersonalTasksWidget />
            </div>

            {/* Projects Grid/List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {totalPortfolioCount === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <FolderKanban className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get started by creating your first project or importing an existing one.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button onClick={() => setShowProjectDialog(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Project
                      </Button>
                      <Button onClick={() => setShowImportDialog(true)} variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Import Project
                      </Button>
                    </div>
                  </div>
                </div>
              ) : totalProjects === 0 ? (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No projects match your filters</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {projectView === "list" && (
                    <div className="space-y-6">
                      {(fundingFilter === "all" || fundingFilter === "funded") && fundedProjects.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold">Funded Projects</h2>
                            <Badge variant="secondary">{fundedProjects.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {fundedProjects.map(renderProjectCard)}
                          </div>
                        </div>
                      )}

                      {(fundingFilter === "all" || fundingFilter === "unfunded") && unfundedProjects.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <FolderKanban className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold">Internal/Unfunded Projects</h2>
                            <Badge variant="secondary">{unfundedProjects.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {unfundedProjects.map(renderProjectCard)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unfunded Projects Section */}
                  {(fundingFilter === "all" || fundingFilter === "unfunded") && unfundedProjects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <FolderKanban className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold">Unfunded Projects</h2>
                        <Badge variant="secondary">{unfundedProjects.length}</Badge>
                      </div>
                      <div
                        className={
                          projectView === "list"
                            ? "space-y-4"
                            : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        }
                      >
                        {unfundedProjects.map(project => {
                          return renderProjectCard(project)
                        })}
                      </div>
                    </div>
                  )}

                  {projectView === "kanban" && (
                    <div className="h-full overflow-hidden">
                      <ProjectKanbanBoard
                        projects={filteredProjects}
                        workpackages={allWorkpackages}
                        deliverables={deliverables}
                        people={allProfiles}
                        budgetSummaries={budgetSummaries}
                        projectHealths={projectHealths}
                        onProjectStatusChange={async (projectId, newStatus) => {
                          await handleUpdateMasterProject(projectId, { status: newStatus })
                        }}
                      />
                    </div>
                  )}

                  {projectView === "gantt" && (
                    <div className="h-full overflow-hidden">
                      <ProjectGanttChart
                        projects={filteredProjects}
                        workpackages={allWorkpackages}
                        people={peopleList}
                        onTaskClick={(task) => {
                          setSelectedTask(task)
                          setShowTaskEditDialog(true)
                        }}
                      />
                    </div>
                  )}

                  {projectView === "calendar" && (
                    <div className="space-y-3">
                      {calendarItems.map(item => {
                        const project = projectLookup.get(item.projectId)
                        const health = project ? projectHealths.get(project.id) : undefined
                        const budgetSummary = project ? budgetSummaries.get(project.id) : undefined
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 border rounded-lg p-3 bg-white shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {project && renderStatusBadge(project.status)}
                                {renderHealthBadge(health)}
                                {renderBudgetChip(budgetSummary)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatDate(item.date)}</p>
                              {project && (
                                <Button asChild variant="ghost" size="sm" className="mt-1">
                                  <Link href={`/projects/${project.id}`}>View project</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={showProjectDialog}
        onClose={() => setShowProjectDialog(false)}
        onCreateRegular={async (projectData) => {
          if (!profile || !user) return

          const newProject: Omit<MasterProject, "id" | "createdAt"> = {
            name: projectData.name || "New Project",
            description: projectData.description || "",
            labId: profile.labId,
            labName: profile.labName,
            instituteId: profile.instituteId,
            instituteName: profile.instituteName,
            organisationId: profile.organisationId,
            organisationName: profile.organisationName,
            grantName: "",
            grantNumber: "",
            totalBudget: 0,
            currency: "EUR",
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            funderId: "",
            funderName: "",
            accountIds: [],
            principalInvestigatorIds: profile.id ? [profile.id] : [],
            coPIIds: [],
            teamMemberIds: profile.id ? [profile.id] : [],
            teamRoles: profile.id ? { [profile.id]: "PI" } : {},
            status: "active",
            progress: 0,
            workpackageIds: [],
            groupIds: selectedGroupId ? [selectedGroupId] : [],
            visibility: projectData.visibility || "lab",
            visibleTo: [],
            tags: [],
            notes: "",
            createdBy: user.uid,
            isExpanded: true,
            type: "unfunded",
            legacyTypeLabel: "Regular Project",
          }

          try {
            await handleCreateMasterProject(newProject)
            setShowProjectDialog(false)
            toast({ title: "Success", description: "Project created successfully" })
          } catch (error) {
            logger.error("Error creating regular project", error)
            toastError(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }}
        onCreateMaster={handleCreateMasterProjectFromDialog}
        currentUserProfileId={profile?.id || null}
        currentUserId={user?.uid || ""}
        organisationId={profile?.organisationId}
        labId={profile?.labId}
        defaultGroupId={selectedGroupId}
      />

      {/* Import Dialog */}
      <ProjectImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportSuccess={(projectId) => {
          logger.info('Project imported successfully', { projectId })
          setShowImportDialog(false)
        }}
        labId={profile?.labId || ""}
        userId={user?.uid || ""}
      />

      {/* Deliverable Dialog */}
      <DeliverableDialog
        open={showDeliverableDialog}
        onOpenChange={setShowDeliverableDialog}
        deliverable={selectedDeliverable}
        workpackageId={deliverableParentId || selectedDeliverable?.workpackageId || ""}
        onSave={async (data) => {
          try {
            if (deliverableMode === "create") {
              await handleCreateDeliverable({
                ...data,
                createdBy: user?.uid || "",
              } as any)
            } else if (selectedDeliverable) {
              await handleUpdateDeliverable(selectedDeliverable.id, data)
            }
            setShowDeliverableDialog(false)
          } catch (error) {
            logger.error("Error saving deliverable", error)
            toastError("Failed to save deliverable")
          }
        }}
        onDelete={
          selectedDeliverable
            ? async () => {
              try {
                await handleDeleteDeliverable(selectedDeliverable.id)
                setShowDeliverableDialog(false)
              } catch (error) {
                logger.error("Error deleting deliverable", error)
                toastError("Failed to delete deliverable")
              }
            }
            : undefined
        }
        mode={deliverableMode}
        availableOwners={allProfiles}
      />


      {/* Task Creation Dialog */}
      <TaskCreationDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        deliverableId={taskDeliverableId}
        workpackageId={taskWorkpackageId}
        onCreateTask={handleCreateTask}
        availablePeople={allProfiles}
      />

      {/* Task Edit Dialog */}
      {selectedTask && (
        <TaskEditDialog
          open={showTaskEditDialog}
          onOpenChange={setShowTaskEditDialog}
          task={selectedTask}
          onSave={handleUpdateTask}
          onDelete={async (taskId) => {
            await handleDeleteTask("", taskId)
            setShowTaskEditDialog(false)
            setSelectedTask(null)
          }}
          availablePeople={allProfiles}
        />
      )}
    </div>
  )
}
