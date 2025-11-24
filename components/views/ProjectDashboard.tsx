"use client"

import { useState, useMemo, useCallback } from "react"
import { z } from "zod"
import { useAppContext } from "@/lib/AppContext"
import { useGroupContext } from "@/lib/GroupContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { ProjectDetailPage } from "@/components/views/ProjectDetailPage"
import { ProjectImportDialog } from "@/components/projects/ProjectImportDialog"
import { DeliverableDialog } from "@/components/DeliverableDialog"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { PersonalTasksWidget } from "@/components/projects/PersonalTasksWidget"
import { TaskCreationDialog } from "@/components/projects/TaskCreationDialog"
import { TaskEditDialog } from "@/components/projects/TaskEditDialog"
import { MasterProject, Workpackage, Deliverable, PersonProfile, Task } from "@/lib/types"
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

export function ProjectDashboard() {
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
  } = useAppContext()

  // Get selected group for filtering
  const { selectedGroupId } = useGroupContext()

  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<MasterProject | null>(null)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeliverableDialog, setShowDeliverableDialog] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [deliverableMode, setDeliverableMode] = useState<"create" | "edit" | "view">("create")
  const [deliverableParentId, setDeliverableParentId] = useState<string | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showTaskEditDialog, setShowTaskEditDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDeliverableId, setTaskDeliverableId] = useState<string>("")
  const [taskWorkpackageId, setTaskWorkpackageId] = useState<string>("")

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [fundingFilter, setFundingFilter] = useState<string>("all")
  const [healthFilter, setHealthFilter] = useState<string>("all")
  const [projectView, setProjectView] = useState<"list" | "kanban" | "gantt" | "calendar">("list")

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
      funded = filtered.filter(p => (p.type || "unfunded") === "funded")
    } else if (fundingFilter === "unfunded") {
      unfunded = filtered.filter(p => (p.type || "unfunded") === "unfunded")
    } else {
      funded = filtered.filter(p => (p.type || "unfunded") === "funded")
      unfunded = filtered.filter(p => (p.type || "unfunded") === "unfunded")
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name))
    return filtered
  }, [projects, searchTerm, statusFilter, healthFilter, fundingFilter, projectHealths, selectedGroupId, isProjectFunded])

  const fundedProjects = useMemo(() => filteredProjects.filter(isProjectFunded), [filteredProjects, isProjectFunded])
  const unfundedProjects = useMemo(() => filteredProjects.filter(project => !isProjectFunded(project)), [filteredProjects, isProjectFunded])

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
  }, [filteredProjects, relevantDeliverables, relevantWorkpackages, projectLookup])

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

  const projectDialogSchema = z.object({
    name: z.string().trim().min(1, "Project name is required"),
    description: z.string().optional().default(""),
    grantName: z.string().optional().default(""),
    grantNumber: z.string().optional().default(""),
    budget: z.coerce.number().nonnegative().optional().default(0),
    startDate: z.preprocess(
      value => (typeof value === "string" || value instanceof Date ? new Date(value) : value),
      z.date()
    ),
    endDate: z.preprocess(
      value => (typeof value === "string" || value instanceof Date ? new Date(value) : value),
      z.date()
    ),
    funderId: z.string().optional().default(""),
    fundedBy: z.array(z.string()).optional().default([]),
    principalInvestigatorId: z.string().optional(),
    status: z.string(),
    groupIds: z.array(z.string()).optional().default([]),
    visibility: z.string().optional().default("lab"),
    visibleTo: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),
    type: z.string().optional(),
    legacyTypeLabel: z.string().optional(),
  })

  type ProjectDialogInput = z.infer<typeof projectDialogSchema>

  const handleCreateTask = useCallback(async (taskData: Partial<Task> & { workpackageId: string }) => {
    try {
      const workpackage = allWorkpackages.find(wp => wp.id === taskData.workpackageId)
      if (!workpackage) {
        throw new Error("Workpackage not found")
      }

      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: taskData.name || "New Task",
        start: taskData.start || new Date(),
        end: taskData.end || new Date(),
        progress: taskData.progress || 0,
        status: taskData.status || "not-started",
        workpackageId: taskData.workpackageId,
        primaryOwner: taskData.primaryOwner,
        helpers: taskData.helpers,
        importance: taskData.importance || "medium",
        notes: taskData.notes,
        subtasks: [],
        deliverables: [],
      }

      const updatedTasks = [...(workpackage.tasks || []), newTask]
      await handleUpdateWorkpackage(workpackage.id, {
        tasks: updatedTasks,
      })

      logger.info("Task created successfully", { taskId: newTask.id, workpackageId: workpackage.id })
      setShowTaskDialog(false)
    } catch (error) {
      logger.error("Error creating task", error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Find the workpackage containing this task
      const workpackage = allWorkpackages.find(wp =>
        wp.tasks?.some(t => t.id === taskId)
      )
      if (!workpackage) {
        throw new Error("Workpackage not found for task")
      }

      const updatedTasks = (workpackage.tasks || []).map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )

      await handleUpdateWorkpackage(workpackage.id, {
        tasks: updatedTasks,
      })

      logger.info("Task updated successfully", { taskId, workpackageId: workpackage.id })
      setShowTaskEditDialog(false)
      setSelectedTask(null)
    } catch (error) {
      logger.error("Error updating task", error)
      alert(`Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleDeleteTask = useCallback(async (workpackageId: string, taskId: string) => {
    try {
      const workpackage = allWorkpackages.find(wp => wp.id === workpackageId)
      if (!workpackage) {
        throw new Error("Workpackage not found")
      }

      const updatedTasks = (workpackage.tasks || []).filter(task => task.id !== taskId)

      await handleUpdateWorkpackage(workpackageId, {
        tasks: updatedTasks,
      })
    } catch (error) {
      logger.error("Error deleting task", error)
      alert(`Failed to delete task: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [allWorkpackages, handleUpdateWorkpackage])

  const handleCreateMasterProjectFromDialog = async (projectData: ProjectDialogInput) => {
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
      alert(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // If a project is selected for detail view, show the detail page
  if (selectedProjectForDetail) {
    const projectWorkpackages = allWorkpackages.filter(wp =>
      selectedProjectForDetail.workpackageIds.includes(wp.id)
    )
    const projectTeamMembers = allProfiles.filter(p =>
      selectedProjectForDetail.teamMemberIds?.includes(p.id)
    )
    const projectDeliverables = deliverables.filter(d =>
      projectWorkpackages.some(wp => wp.id === d.workpackageId)
    )

    return (
      <ProjectDetailPage
        project={selectedProjectForDetail}
        workpackages={projectWorkpackages}
        deliverables={projectDeliverables}
        teamMembers={projectTeamMembers}
        fundingAccounts={[]}
        health={projectHealths.get(selectedProjectForDetail.id)}
        budgetSummary={budgetSummaries.get(selectedProjectForDetail.id)}
        onBack={() => setSelectedProjectForDetail(null)}
        onEdit={() => {
          alert("Edit functionality coming soon")
        }}
        onCreateWorkpackage={async (workpackageData) => {
          const workpackageId = await createWorkpackage({
            ...workpackageData,
            projectId: selectedProjectForDetail.id,
            createdBy: user?.uid || "",
          } as any)

          if (workpackageId) {
            await handleUpdateMasterProject(selectedProjectForDetail.id, {
              workpackageIds: [...(selectedProjectForDetail.workpackageIds || []), workpackageId],
            })
          }
        }}
        onUpdateWorkpackage={async (workpackageId, updates) => {
          await handleUpdateWorkpackage(workpackageId, updates)
        }}
        onDeleteWorkpackage={async (workpackageId) => {
          await handleUpdateMasterProject(selectedProjectForDetail.id, {
            workpackageIds: (selectedProjectForDetail.workpackageIds || []).filter(
              id => id !== workpackageId
            ),
          })
        }}
        onCreateDeliverable={async (deliverableData) => {
          await handleCreateDeliverable({
            ...deliverableData,
            createdBy: user?.uid || "",
          } as any)
        }}
        onUpdateDeliverable={async (deliverableId, updates) => {
          await handleUpdateDeliverable(deliverableId, updates)
        }}
        onDeleteDeliverable={async (deliverableId) => {
          await handleDeleteDeliverable(deliverableId)
        }}
      />
    )
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

  const projectLookup = useMemo(
    () => new Map(filteredProjects.map(project => [project.id, project])),
    [filteredProjects]
  )

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
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 overflow-hidden min-h-0">
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
                        {fundedProjects.map(project => {
                          const budgetSummary = budgetSummaries.get(project.id)
                          const health = projectHealths.get(project.id)
                          return (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              workpackages={allWorkpackages}
                              deliverables={deliverables}
                              people={allProfiles}
                              budgetSummary={budgetSummary}
                              health={health}
                              onViewProject={setSelectedProjectForDetail}
                              onCreateWorkpackage={async (projectId) => {
                                const workpackageId = await createWorkpackage({
                                  name: "New Work Package",
                                  projectId,
                                  start: new Date(),
                                  end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                  status: "planning",
                                  progress: 0,
                                  tasks: [],
                                  deliverableIds: [],
                                  isExpanded: true,
                                  importance: "medium",
                                  createdBy: user?.uid || "",
                                } as any)

                                if (workpackageId) {
                                  await handleUpdateMasterProject(projectId, {
                                    workpackageIds: [...(project.workpackageIds || []), workpackageId],
                                  })
                                }
                              }}
                              onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                              onDeleteWorkpackage={async (workpackageId) => {
                                await handleUpdateMasterProject(project.id, {
                                  workpackageIds: (project.workpackageIds || []).filter(
                                    id => id !== workpackageId
                                  ),
                                })
                              }}
                              onCreateDeliverable={(workpackageId) => {
                                setDeliverableParentId(workpackageId)
                                setSelectedDeliverable(null)
                                setDeliverableMode("create")
                                setShowDeliverableDialog(true)
                              }}
                              onEditDeliverable={(deliverable) => {
                                try {
                                  if (deliverable && deliverable.id) {
                                    setSelectedDeliverable(deliverable)
                                    setDeliverableMode("edit")
                                    setShowDeliverableDialog(true)
                                  }
                                } catch (error) {
                                  logger.error("Error editing deliverable", error)
                                }
                              }}
                              onDeleteDeliverable={handleDeleteDeliverable}
                              onDeliverableClick={(deliverable) => {
                                try {
                                  if (deliverable && deliverable.id) {
                                    setSelectedDeliverable(deliverable)
                                    setDeliverableMode("view")
                                    setShowDeliverableDialog(true)
                                  }
                                } catch (error) {
                                  logger.error("Error opening deliverable dialog", error)
                                }
                              }}
                              onCreateTask={(deliverableId) => {
                                const deliverable = deliverables.find(d => d.id === deliverableId)
                                if (deliverable) {
                                  setTaskDeliverableId(deliverableId)
                                  setTaskWorkpackageId(deliverable.workpackageId)
                                  setShowTaskDialog(true)
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
                              onDeleteTask={(taskId) => {
                                const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
                                if (workpackage) {
                                  handleDeleteTask(workpackage.id, taskId)
                                }
                              }}
                            />
                          )
                        })}
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
                        {unfundedProjects.map(project => {
                          const health = projectHealths.get(project.id)
                          return (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              workpackages={allWorkpackages}
                              deliverables={deliverables}
                              people={allProfiles}
                              health={health}
                              onViewProject={setSelectedProjectForDetail}
                              onCreateWorkpackage={async (projectId) => {
                                const workpackageId = await createWorkpackage({
                                  name: "New Work Package",
                                  projectId,
                                  start: new Date(),
                                  end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                  status: "planning",
                                  progress: 0,
                                  tasks: [],
                                  deliverableIds: [],
                                  isExpanded: true,
                                  importance: "medium",
                                  createdBy: user?.uid || "",
                                } as any)

                                if (workpackageId) {
                                  await handleUpdateMasterProject(projectId, {
                                    workpackageIds: [...(project.workpackageIds || []), workpackageId],
                                  })
                                }
                              }}
                              onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                              onDeleteWorkpackage={async (workpackageId) => {
                                await handleUpdateMasterProject(project.id, {
                                  workpackageIds: (project.workpackageIds || []).filter(
                                    id => id !== workpackageId
                                  ),
                                })
                              }}
                              onCreateDeliverable={(workpackageId) => {
                                setDeliverableParentId(workpackageId)
                                setSelectedDeliverable(null)
                                setDeliverableMode("create")
                                setShowDeliverableDialog(true)
                              }}
                              onEditDeliverable={(deliverable) => {
                                try {
                                  if (deliverable && deliverable.id) {
                                    setSelectedDeliverable(deliverable)
                                    setDeliverableMode("edit")
                                    setShowDeliverableDialog(true)
                                  }
                                } catch (error) {
                                  logger.error("Error editing deliverable", error)
                                }
                              }}
                              onDeleteDeliverable={handleDeleteDeliverable}
                              onDeliverableClick={(deliverable) => {
                                try {
                                  if (deliverable && deliverable.id) {
                                    setSelectedDeliverable(deliverable)
                                    setDeliverableMode("view")
                                    setShowDeliverableDialog(true)
                                  }
                                } catch (error) {
                                  logger.error("Error opening deliverable dialog", error)
                                }
                              }}
                              onCreateTask={(deliverableId) => {
                                const deliverable = deliverables.find(d => d.id === deliverableId)
                                if (deliverable) {
                                  setTaskDeliverableId(deliverableId)
                                  setTaskWorkpackageId(deliverable.workpackageId)
                                  setShowTaskDialog(true)
                                }
                              }}
                              onEditTask={(task) => {
                                const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === task.id))
                                if (workpackage) {
                                  logger.info("Edit task", { taskId: task.id })
                                }
                              }}
                              onDeleteTask={(taskId) => {
                                const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
                                if (workpackage) {
                                  handleDeleteTask(workpackage.id, taskId)
                                }
                              }}
                            />
                          )
                        })}
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
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-4"
                    }
                  >
                    {unfundedProjects.map(project => {
                      const health = projectHealths.get(project.id)
                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          workpackages={allWorkpackages}
                          deliverables={deliverables}
                          people={allProfiles}
                          health={health}
                          onViewProject={setSelectedProjectForDetail}
                          onCreateWorkpackage={async (projectId) => {
                            const workpackageId = await createWorkpackage({
                              name: "New Work Package",
                              projectId,
                              start: new Date(),
                              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                              status: "planning",
                              progress: 0,
                              tasks: [],
                              deliverableIds: [],
                              isExpanded: true,
                              importance: "medium",
                              createdBy: user?.uid || "",
                            } as any)

                            if (workpackageId) {
                              await handleUpdateMasterProject(projectId, {
                                workpackageIds: [...(project.workpackageIds || []), workpackageId],
                              })
                            }
                          }}
                          onEditWorkpackage={(workpackage) => handleUpdateWorkpackage(workpackage.id, workpackage)}
                          onDeleteWorkpackage={async (workpackageId) => {
                            await handleUpdateMasterProject(project.id, {
                              workpackageIds: (project.workpackageIds || []).filter(
                                id => id !== workpackageId
                              ),
                            })
                          }}
                          onCreateDeliverable={(workpackageId) => {
                            setDeliverableParentId(workpackageId)
                            setSelectedDeliverable(null)
                            setDeliverableMode("create")
                            setShowDeliverableDialog(true)
                          }}
                          onEditDeliverable={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("edit")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error editing deliverable", error)
                            }
                          }}
                          onDeleteDeliverable={handleDeleteDeliverable}
                          onDeliverableClick={(deliverable) => {
                            try {
                              if (deliverable && deliverable.id) {
                                setSelectedDeliverable(deliverable)
                                setDeliverableMode("view")
                                setShowDeliverableDialog(true)
                              }
                            } catch (error) {
                              logger.error("Error opening deliverable dialog", error)
                            }
                          }}
                          onCreateTask={(deliverableId) => {
                            // Find workpackage for this deliverable
                            const deliverable = deliverables.find(d => d.id === deliverableId)
                            if (deliverable) {
                              setTaskDeliverableId(deliverableId)
                              setTaskWorkpackageId(deliverable.workpackageId)
                              setShowTaskDialog(true)
                            }
                          }}
                          onEditTask={(task) => {
                            // Find workpackage for this task
                            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === task.id))
                            if (workpackage) {
                              // For now, just log - could open edit dialog later
                              logger.info("Edit task", { taskId: task.id })
                            }
                          }}
                          onDeleteTask={(taskId) => {
                            // Find workpackage for this task
                            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
                            if (workpackage) {
                              handleDeleteTask(workpackage.id, taskId)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1"
                              onClick={() => setSelectedProjectForDetail(project)}
                            >
                              View project
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
      </div>

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={showProjectDialog}
        onClose={() => setShowProjectDialog(false)}
        onCreateRegular={() => {
          // Handle regular project creation
          setShowProjectDialog(false)
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
            alert("Failed to save deliverable")
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
                alert("Failed to delete deliverable")
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
        onSave={handleCreateTask}
        availablePeople={allProfiles}
      />

      {/* Task Edit Dialog */}
      {selectedTask && (
        <TaskEditDialog
          open={showTaskEditDialog}
          onOpenChange={setShowTaskEditDialog}
          task={selectedTask}
          workpackageId={selectedTask.workpackageId || ""}
          onSave={handleUpdateTask}
          onDelete={async (taskId) => {
            const workpackage = allWorkpackages.find(wp => wp.tasks?.some(t => t.id === taskId))
            if (workpackage) {
              await handleDeleteTask(workpackage.id, taskId)
              setShowTaskEditDialog(false)
              setSelectedTask(null)
            }
          }}
          availablePeople={allProfiles}
        />
      )}
    </div>
  )
}
