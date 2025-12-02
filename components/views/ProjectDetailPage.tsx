"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { MasterProject, Workpackage, PersonProfile, FundingAccount, Order, Deliverable, CalendarEvent, ELNExperiment, ProjectTask, ImportanceLevel, WorkStatus, HydratedWorkpackage } from "@/lib/types"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { logger } from "@/lib/logger"
import { uploadFile, deleteFile } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { WorkpackageDialog } from "@/components/projects/WorkpackageDialog"
import { DeliverableDialog } from "@/components/DeliverableDialog"
import { DeliverableDetailsPanel } from "@/components/projects/DeliverableDetailsPanel"
import { CommentsSection } from "@/components/CommentsSection"
import { ProjectExportDialog } from "@/components/ProjectExportDialog"
import { ProjectImportDialog } from "@/components/projects/ProjectImportDialog"
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Activity,
  Edit,
  Plus,
  ShoppingCart,
  Download,
  Upload,
  FlaskConical,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Folder,
  PanelLeft,
  PanelRight,
  LayoutDashboard,
  Trash2,
  Mail,
} from "lucide-react"
import { ProjectEmailRules } from "@/components/views/ProjectEmailRules"
import { ProjectEmailsPanel } from "@/components/views/ProjectEmailsPanel"
import { calculateProjectHealth, getHealthStatusColor, ProjectHealth } from "@/lib/utils/projectHealth"
import { formatCurrency, getBudgetStatusColor, ProjectBudgetSummary } from "@/lib/utils/budgetCalculation"
import { useAppContext } from "@/lib/AppContext"

interface ProjectFile {
  id: string
  projectId: string
  labId?: string
  name: string
  url: string
  storagePath: string
  size: number
  type: string
  uploadedBy: string
  uploadedByName?: string
  uploadedAt: Date
}

interface ProjectDetailPageProps {
  project: MasterProject
  workpackages: HydratedWorkpackage[]
  deliverables: Deliverable[]
  teamMembers: PersonProfile[]
  fundingAccounts: FundingAccount[]
  events?: CalendarEvent[]
  health?: ProjectHealth
  budgetSummary?: ProjectBudgetSummary
  onBack: () => void
  onEdit?: () => void
  onCreateWorkpackage?: (workpackageData: Partial<Workpackage>) => Promise<string | undefined>
  onUpdateWorkpackage?: (workpackageId: string, updates: Partial<Workpackage>) => Promise<void>
  onDeleteWorkpackage?: (workpackageId: string) => Promise<void>
  onCreateDeliverable?: (deliverableData: Partial<Deliverable>) => Promise<string | undefined>
  onUpdateDeliverable?: (deliverableId: string, updates: Partial<Deliverable>) => Promise<void>
  onDeleteDeliverable?: (deliverableId: string) => Promise<void>
  onUpdateProject?: (projectId: string, updates: Partial<MasterProject>) => Promise<void>
  onUpdateTask?: (taskId: string, updates: Partial<ProjectTask>) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onViewOrder?: (orderId: string) => void
  onViewExperiment?: (experimentId: string) => void
  onViewEvent?: (eventId: string) => void
  onUpdateDeliverableTasks?: (deliverableId: string, tasks: ProjectTask[]) => Promise<void>
}

export function ProjectDetailPage({
  project,
  workpackages,
  deliverables,
  teamMembers,
  fundingAccounts,
  events = [],
  health,
  budgetSummary,
  onBack,
  onEdit,
  onCreateWorkpackage,
  onUpdateWorkpackage,
  onDeleteWorkpackage,
  onCreateDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  onUpdateProject,
  onUpdateTask,
  onDeleteTask,
  onViewOrder,
  onViewExperiment,
  onViewEvent,
  onUpdateDeliverableTasks,
}: ProjectDetailPageProps) {
  const { toast } = useToast()

  useEffect(() => {
    console.log("DEBUG: ProjectDetailPage project changed", JSON.stringify({ id: project.id, labId: project.labId, keys: Object.keys(project) }));
  }, [project]);

  const [workpackageDialogOpen, setWorkpackageDialogOpen] = useState(false)
  const [selectedWorkpackageDialog, setSelectedWorkpackageDialog] = useState<Workpackage | null>(null)
  const [workpackageDialogMode, setWorkpackageDialogMode] = useState<"create" | "edit" | "view">("view")
  const [deliverableDialogOpen, setDeliverableDialogOpen] = useState(false)
  const [selectedDeliverableDialog, setSelectedDeliverableDialog] = useState<Deliverable | null>(null)
  const [deliverableDialogMode, setDeliverableDialogMode] = useState<"create" | "edit" | "view">("view")
  const [selectedDeliverableForPanel, setSelectedDeliverableForPanel] = useState<Deliverable | null>(null)
  const [selectedWorkpackageForDeliverable, setSelectedWorkpackageForDeliverable] = useState<string | null>(null)
  const [newTaskName, setNewTaskName] = useState("")
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [draggedOwnerId, setDraggedOwnerId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [experiments, setExperiments] = useState<ELNExperiment[]>([])
  const [loadingExperiments, setLoadingExperiments] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string | null>(null)
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)
  const [expandedWorkpackages, setExpandedWorkpackages] = useState<Record<string, boolean>>({})
  const [drawerVisibility, setDrawerVisibility] = useState({
    stats: true,
    funding: false,
    resources: false,
    files: false,
    activity: false,
    emails: false,
  })
  const [newDeliverableNames, setNewDeliverableNames] = useState<Record<string, string>>({})
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileUploadError, setFileUploadError] = useState<string | null>(null)
  const [equipmentItems, setEquipmentItems] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])

  const toggleDrawer = (drawer: keyof typeof drawerVisibility) => {
    setDrawerVisibility((current) => ({
      ...current,
      [drawer]: !current[drawer],
    }))
  }

  const toggleWorkpackageExpand = (workpackageId: string) => {
    setExpandedWorkpackages((current) => ({
      ...current,
      [workpackageId]: !current[workpackageId],
    }))
  }

  const isFundedProject = (project.type || "unfunded") === "funded"
  const hasFundingLedger = (project.accountIds?.length ?? 0) > 0 || (fundingAccounts?.length ?? 0) > 0
  const canAccessFunding = isFundedProject && hasFundingLedger

  // Get current user for import/export
  const { currentUser, currentUserProfile } = useAppContext()

  // Fetch project orders
  useEffect(() => {
    if (!canAccessFunding || !currentUser) {
      setOrders([])
      setLoadingOrders(false)
      return
    }

    const fetchProjectOrders = async () => {
      const db = getFirebaseDb()
      setLoadingOrders(true)
      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("masterProjectId", "==", project.id),
          orderBy("createdDate", "desc")
        )
        const ordersSnapshot = await getDocs(ordersQuery)
        const ordersData = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdDate: doc.data().createdDate?.toDate?.() || new Date(),
          orderedDate: doc.data().orderedDate?.toDate?.(),
          receivedDate: doc.data().receivedDate?.toDate?.(),
          expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.(),
        })) as Order[]
        setOrders(ordersData)
      } catch (error) {
        logger.error("Error fetching project orders", error)
      } finally {
        setLoadingOrders(false)
      }
    }

    fetchProjectOrders()
  }, [project.id, canAccessFunding, currentUser?.uid, currentUser])

  // Fetch project experiments
  useEffect(() => {
    if (!currentUser) {
      setExperiments([])
      setLoadingExperiments(false)
      return
    }
    const fetchProjectExperiments = async () => {
      const db = getFirebaseDb()
      setLoadingExperiments(true)
      try {
        const experimentsQuery = query(
          collection(db, "elnExperiments"),
          where("masterProjectId", "==", project.id),
          orderBy("createdAt", "desc")
        )
        const experimentsSnapshot = await getDocs(experimentsQuery)
        const experimentsData = experimentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date().toISOString(),
        })) as ELNExperiment[]
        setExperiments(experimentsData)
      } catch (error) {
        logger.error("Error fetching project experiments", error)
      } finally {
        setLoadingExperiments(false)
      }
    }

    fetchProjectExperiments()
  }, [project.id, currentUser?.uid, currentUser])

  // Fetch equipment and inventory for the project's lab
  useEffect(() => {
    const loadLabResources = async () => {
      if (!project.labId) {
        setEquipmentItems([])
        setInventoryItems([])
        return
      }
      const db = getFirebaseDb()
      try {
        const equipmentSnap = await getDocs(
          query(collection(db, "equipment"), where("labId", "==", project.labId))
        )
        const inventorySnap = await getDocs(
          query(collection(db, "inventory"), where("labId", "==", project.labId))
        )
        setEquipmentItems(equipmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        setInventoryItems(inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      } catch (error) {
        logger.error("Error loading lab resources", error)
      }
    }
    loadLabResources()
  }, [project.labId])

  // Fetch project files stored in Storage
  useEffect(() => {
    const loadFiles = async () => {
      const db = getFirebaseDb()
      try {
        const filesSnap = await getDocs(
          query(collection(db, "projectFiles"), where("projectId", "==", project.id), orderBy("uploadedAt", "desc"))
        )
        const files = filesSnap.docs.map((docSnapshot) => {
          const data = docSnapshot.data() as any
          return {
            id: docSnapshot.id,
            projectId: data.projectId,
            labId: data.labId,
            name: data.name,
            url: data.url,
            storagePath: data.storagePath,
            size: data.size,
            type: data.type,
            uploadedBy: data.uploadedBy,
            uploadedByName: data.uploadedByName,
            uploadedAt: data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(data.uploadedAt || Date.now()),
          } as ProjectFile
        })
        setProjectFiles(files)
      } catch (error) {
        logger.error("Error loading project files", error)
      }
    }

    loadFiles()
  }, [project.id])

  // Calculate project statistics
  const stats = useMemo(() => {
    const totalTasks = workpackages.reduce((sum, wp) => sum + (wp.deliverables?.reduce((dSum, d) => dSum + (d.tasks?.length || 0), 0) || 0), 0)
    const completedTasks = workpackages.reduce(
      (sum, wp) => sum + (wp.deliverables?.reduce((dSum, d) => dSum + (d.tasks?.filter(t => t.status === "done").length || 0), 0) || 0),
      0
    )
    const completedWorkpackages = workpackages.filter(wp => wp.status === "completed").length
    const atRiskWorkpackages = workpackages.filter(wp => wp.status === "at-risk").length

    return {
      totalWorkpackages: workpackages.length,
      completedWorkpackages,
      atRiskWorkpackages,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    }
  }, [workpackages])

  // Calculate order statistics
  const orderStats = useMemo(() => {
    const totalOrders = orders.length
    const toOrderCount = orders.filter(o => o.status === "to-order").length
    const orderedCount = orders.filter(o => o.status === "ordered").length
    const receivedCount = orders.filter(o => o.status === "received").length

    const totalSpent = orders
      .filter(o => o.status === "received")
      .reduce((sum, o) => sum + (o.priceExVAT || 0), 0)

    const totalCommitted = orders
      .filter(o => o.status === "ordered")
      .reduce((sum, o) => sum + (o.priceExVAT || 0), 0)

    return {
      totalOrders,
      toOrderCount,
      orderedCount,
      receivedCount,
      totalSpent,
      totalCommitted,
    }
  }, [orders])

  const deliverableStats = useMemo(() => {
    const statusBuckets = deliverables.reduce<Record<string, number>>((acc, d) => {
      const status = d.status || "not-started"
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return {
      total: deliverables.length,
      statusBuckets,
      completed: statusBuckets["completed"] || 0,
      inProgress: (statusBuckets["in-progress"] || 0) + (statusBuckets["working"] || 0),
      notStarted: statusBuckets["not-started"] || 0,
    }
  }, [deliverables])

  const peopleActive = useMemo(() => {
    const ids = new Set<string>()
    workpackages.forEach(wp => {
      wp.deliverables?.forEach(d => {
        d.tasks?.forEach(task => {
          if (task.primaryOwner) ids.add(task.primaryOwner)
          task.helpers?.forEach((h: string) => h && ids.add(h))
        })
      })
    })
    deliverables.forEach(d => d.ownerId && ids.add(d.ownerId))
    return teamMembers.filter(p => ids.has(p.id))
  }, [workpackages, deliverables, teamMembers])

  const fundingByFunder = useMemo(() => {
    const map = new Map<string, { funderName: string; committed: number; spent: number }>()
    orders.forEach(order => {
      const funderId = order.funderId || "unknown"
      const entry = map.get(funderId) || { funderName: order.funderName || "Unknown funder", committed: 0, spent: 0 }
      if (order.status === "received") {
        entry.spent += order.priceExVAT || 0
      } else {
        entry.committed += order.priceExVAT || 0
      }
      map.set(funderId, entry)
    })
    return Array.from(map.values())
  }, [orders])

  const activityFeed = useMemo(() => {
    const events: Array<{ label: string; meta?: string; timestamp: Date; type: string }> = []

    orders.slice(0, 20).forEach(order => {
      events.push({
        type: "order",
        label: `Order ${order.status || "updated"}: ${order.productName}`,
        meta: order.supplier,
        timestamp: order.updatedAt ? new Date(order.updatedAt as any) : new Date(order.createdDate || Date.now()),
      })
    })

    deliverables.slice(0, 30).forEach(d => {
      events.push({
        type: "deliverable",
        label: `Deliverable ${d.status || "updated"}: ${d.name}`,
        meta: teamMembers.find(p => p.id === d.ownerId)?.firstName || "Owner pending",
        timestamp: d.updatedAt ? new Date(d.updatedAt as any) : new Date(d.startDate || Date.now()),
      })
    })

    workpackages.forEach(wp => {
      wp.deliverables?.forEach(d => {
        d.tasks?.slice(0, 5).forEach(task => {
          events.push({
            type: "task",
            label: `Task ${task.status || "updated"}: ${task.name}`,
            meta: teamMembers.find(p => p.id === task.primaryOwner)?.firstName || "Unassigned",
            timestamp: new Date(task.start || Date.now()),
          })
        })
      })
    })

    return events
      .filter(e => !Number.isNaN(e.timestamp.getTime()))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 25)
  }, [orders, deliverables, workpackages, teamMembers])

  // Default selections for the execution view
  useEffect(() => {
    if (workpackages.length > 0 && !selectedWorkpackageId) {
      setSelectedWorkpackageId(workpackages[0].id)
    }
  }, [workpackages, selectedWorkpackageId])

  useEffect(() => {
    if (!selectedWorkpackageId) return
    const deliverablesForWp = deliverables.filter(d => d.workpackageId === selectedWorkpackageId)
    if (deliverablesForWp.length > 0) {
      setSelectedDeliverableId((current) => {
        if (current && deliverablesForWp.some(d => d.id === current)) return current
        return deliverablesForWp[0].id
      })
    } else {
      setSelectedDeliverableId(null)
    }
  }, [deliverables, selectedWorkpackageId])

  useEffect(() => {
    setExpandedWorkpackages((current) => {
      const next = { ...current }
      workpackages.forEach((wp) => {
        if (next[wp.id] === undefined) {
          next[wp.id] = true
        }
      })
      return next
    })
  }, [workpackages])

  const computedHealth = useMemo<ProjectHealth>(() => {
    if (health) return health
    return calculateProjectHealth(project, deliverables, workpackages)
  }, [health, project, deliverables, workpackages])

  // Get project PIs
  const principalInvestigators = teamMembers.filter(member =>
    project.principalInvestigatorIds?.includes(member.id)
  )

  // Format dates
  const startDate = new Date(project.startDate).toLocaleDateString()
  const endDate = new Date(project.endDate).toLocaleDateString()
  const daysRemaining = Math.ceil(
    (new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const timelineRange = useMemo(() => {
    const dates: Date[] = [new Date(project.startDate), new Date(project.endDate)]

    workpackages.forEach(wp => {
      dates.push(wp.start instanceof Date ? wp.start : new Date(wp.start))
      dates.push(wp.end instanceof Date ? wp.end : new Date(wp.end))
    })

    deliverables.forEach(deliverable => {
      if (deliverable.dueDate) dates.push(new Date(deliverable.dueDate))
      if (deliverable.startDate) dates.push(new Date(deliverable.startDate))
    })

    events.forEach(event => {
      if (event.start) dates.push(new Date(event.start))
      if (event.end) dates.push(new Date(event.end))
    })

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))

    return { start, end }
  }, [project.startDate, project.endDate, workpackages, deliverables, events])

  const getTimelinePosition = useCallback(
    (date: Date) => {
      const total = timelineRange.end.getTime() - timelineRange.start.getTime()
      if (total <= 0) return 0
      const offset = date.getTime() - timelineRange.start.getTime()
      return Math.min(100, Math.max(0, (offset / total) * 100))
    },
    [timelineRange.end, timelineRange.start]
  )

  const getTimelineWidth = useCallback(
    (start: Date, end: Date) => Math.max(2, getTimelinePosition(end) - getTimelinePosition(start)),
    [getTimelinePosition]
  )

  // Workpackage dialog handlers
  const handleCreateWorkpackageClick = () => {
    setSelectedWorkpackageDialog(null)
    setWorkpackageDialogMode("create")
    setWorkpackageDialogOpen(true)
  }

  const handleViewWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackageDialog(wp)
    setWorkpackageDialogMode("view")
    setWorkpackageDialogOpen(true)
  }

  const handleEditWorkpackage = (wp: Workpackage) => {
    setSelectedWorkpackageDialog(wp)
    setWorkpackageDialogMode("edit")
    setWorkpackageDialogOpen(true)
  }

  const handleSaveWorkpackage = (workpackageData: Partial<Workpackage>) => {
    console.log("DEBUG: handleSaveWorkpackage CALLED. Project state:", JSON.stringify({ id: project.id, labId: project.labId }));

    if (workpackageDialogMode === "create" && onCreateWorkpackage) {
      const dataWithLabId = {
        ...workpackageData,
        labId: project.labId
      };
      console.log("DEBUG: handleSaveWorkpackage creating with", JSON.stringify(dataWithLabId));
      onCreateWorkpackage(dataWithLabId)
    } else if (workpackageDialogMode === "edit" && selectedWorkpackageDialog && onUpdateWorkpackage) {
      onUpdateWorkpackage(selectedWorkpackageDialog.id, workpackageData)
    }
    setWorkpackageDialogOpen(false)
  }

  const handleDeleteWorkpackage = () => {
    if (selectedWorkpackageDialog && onDeleteWorkpackage) {
      if (confirm(`Are you sure you want to delete "${selectedWorkpackageDialog.name}"?`)) {
        onDeleteWorkpackage(selectedWorkpackageDialog.id)
        setWorkpackageDialogOpen(false)
      }
    }
  }

  // Deliverable dialog handlers
  const handleCreateDeliverableClick = (workpackageId: string) => {
    setSelectedWorkpackageForDeliverable(workpackageId)
    setSelectedDeliverableDialog(null)
    setDeliverableDialogMode("create")
    setDeliverableDialogOpen(true)
  }

  const handleViewDeliverable = (deliverable: Deliverable) => {
    setSelectedDeliverableForPanel(deliverable)
  }

  const handleEditDeliverable = (deliverable: Deliverable) => {
    setSelectedDeliverableDialog(deliverable)
    setSelectedWorkpackageForDeliverable(deliverable.workpackageId)
    setDeliverableDialogMode("edit")
    setDeliverableDialogOpen(true)
  }

  const handleSaveDeliverable = (deliverableData: Partial<Deliverable>) => {
    if (deliverableDialogMode === "create" && onCreateDeliverable) {
      onCreateDeliverable(deliverableData)
    } else if (deliverableDialogMode === "edit" && selectedDeliverableDialog && onUpdateDeliverable) {
      onUpdateDeliverable(selectedDeliverableDialog.id, deliverableData)
    }
    setDeliverableDialogOpen(false)
  }

  const handleDeleteDeliverable = (deliverableId: string) => {
    if (onDeleteDeliverable) {
      if (confirm("Are you sure you want to delete this deliverable?")) {
        onDeleteDeliverable(deliverableId)
        setSelectedDeliverableForPanel(null)
      }
    }
  }

  // Get deliverables for a specific workpackage
  const getWorkpackageDeliverables = (workpackageId: string): Deliverable[] => {
    return deliverables.filter(d => d.workpackageId === workpackageId)
  }

  // Handle import success
  const handleImportSuccess = (projectId: string) => {
    logger.info('Project imported successfully', { projectId })
    // Parent component should handle navigation to the new project
    // For now, just log success
    toast({
      title: "Import Successful",
      description: "Project imported successfully! Refresh the page to see the new project.",
    })
  }

  const selectedWorkpackage = useMemo(
    () => workpackages.find(wp => wp.id === selectedWorkpackageId) || null,
    [selectedWorkpackageId, workpackages]
  )

  const deliverablesForSelectedWp = useMemo(
    () => deliverables.filter(d => d.workpackageId === selectedWorkpackageId),
    [deliverables, selectedWorkpackageId]
  )

  const selectedDeliverable = useMemo(
    () => deliverablesForSelectedWp.find(d => d.id === selectedDeliverableId) || null,
    [deliverablesForSelectedWp, selectedDeliverableId]
  )

  const getTaskDueDate = (task: ProjectTask) => {
    if (!task) return null
    const due = task.end
    if (!due) return null
    return isNaN(due.getTime()) ? null : due
  }

  const wasTaskUpdatedThisWeek = (task: ProjectTask) => {
    // We don't have an updatedAt field on ProjectTask in the current type definition
    // But if we did, or if we used start/end dates as a proxy for recent activity:
    // For now, let's check if start date is within the last 7 days
    if (!task.start) return false
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - new Date(task.start).getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }

  const hasTaskDependencies = (task: ProjectTask) => Array.isArray(task?.dependencies) && task.dependencies.length > 0

  const isTaskBlocked = (task: ProjectTask) => task?.status === "blocked" || task?.status === "at-risk"

  const isTaskOverdue = (task: ProjectTask) => {
    const due = getTaskDueDate(task)
    if (!due) return false
    return due.getTime() < Date.now() && task?.status !== "done"
  }

  const isTaskDueSoon = (task: ProjectTask) => {
    const due = getTaskDueDate(task)
    if (!due) return false
    const now = new Date()
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }

  const getTasksForSelectedDeliverable = useCallback(() => {
    // Need to cast to access nested tasks on HydratedDeliverable
    const deliverable = selectedDeliverable as any
    const tasks = Array.isArray(deliverable?.tasks) ? deliverable?.tasks : []
    return tasks || []
  }, [selectedDeliverable])

  const handleQuickAddDeliverable = (workpackageId: string) => {
    if (!onCreateDeliverable) return
    const name = newDeliverableNames[workpackageId]?.trim()
    if (!name) return

    onCreateDeliverable({
      name,
      workpackageId,
      status: "not-started",
      progress: 0,
    })

    setNewDeliverableNames((current) => ({ ...current, [workpackageId]: "" }))
  }

  const handleQuickAddTask = () => {
    if (!selectedWorkpackage || !onUpdateWorkpackage) return
    const name = newTaskName.trim()
    if (!name) return

    const generateId = () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const newTask: ProjectTask = {
      id: generateId(),
      name,
      start: new Date(),
      end: new Date(),
      progress: 0,
      primaryOwner: selectedDeliverable?.ownerId,
      helpers: [],
      importance: "medium" as ImportanceLevel,
      deliverableId: selectedDeliverable?.id || "",
      status: "not-started",
      notes: "",
      todos: [],
      dependencies: []
    }

    const deliverable = selectedDeliverable as any
    const nextTasks = [...(deliverable.tasks || []), newTask]

    if (onUpdateDeliverableTasks && selectedDeliverable) {
      onUpdateDeliverableTasks(selectedDeliverable.id, nextTasks)
        .then(() => {
          logger.info("Task created successfully via onUpdateDeliverableTasks")
          setNewTaskName("")
        })
        .catch(err => {
          logger.error("Failed to create task", err)
          toast({
            title: "Error",
            description: "Failed to create task",
            variant: "destructive"
          })
        })
    } else {
      logger.warn("onUpdateDeliverableTasks not provided or selectedDeliverable missing")
    }
  }

  const updateTaskStatus = (taskId: string, status: string) => {
    if (!selectedDeliverable || !onUpdateDeliverableTasks) return

    // Need to cast to access nested tasks on HydratedDeliverable
    const deliverable = selectedDeliverable as any
    const currentTasks = (Array.isArray(deliverable?.tasks) ? deliverable?.tasks : []) as ProjectTask[]

    const nextTasks = currentTasks.map(task =>
      task.id === taskId
        ? {
          ...task,
          status: status as WorkStatus,
          progress: status === "done" || status === "completed" ? 100 : task.progress || 0,
          // We don't track updatedAt on ProjectTask anymore, relying on parent update
        }
        : task
    )

    onUpdateDeliverableTasks(selectedDeliverable.id, nextTasks)
      .catch(err => {
        logger.error("Failed to update task status", err)
        toast({
          title: "Error",
          description: "Failed to update task status",
          variant: "destructive"
        })
      })
  }

  const handleDeleteTask = (taskId: string) => {
    if (!selectedDeliverable || !onUpdateDeliverableTasks) return

    const deliverable = selectedDeliverable as any
    const currentTasks = (Array.isArray(deliverable?.tasks) ? deliverable?.tasks : []) as ProjectTask[]
    const nextTasks = currentTasks.filter(task => task.id !== taskId)

    onUpdateDeliverableTasks(selectedDeliverable.id, nextTasks)
      .catch(err => {
        logger.error("Failed to delete task", err)
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive"
        })
      })
  }

  const handleFileUpload = async (file?: File | null) => {
    if (!file || !currentUser) return
    setUploadingFile(true)
    setFileUploadError(null)
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const path = `projects/${project.id}/${Date.now()}_${sanitizedName}`
      const uploadResult = await uploadFile(file, path)

      const db = getFirebaseDb()
      await addDoc(collection(db, "projectFiles"), {
        projectId: project.id,
        labId: project.labId,
        name: file.name,
        url: uploadResult.url,
        storagePath: uploadResult.path,
        size: uploadResult.size,
        type: uploadResult.type,
        uploadedBy: currentUser.uid,
        uploadedByName: currentUserProfile ? `${currentUserProfile.firstName} ${currentUserProfile.lastName}` : undefined,
        uploadedAt: serverTimestamp(),
      })

      setProjectFiles((prev) => [
        {
          id: `${Date.now()}`,
          projectId: project.id,
          labId: project.labId,
          name: file.name,
          url: uploadResult.url,
          storagePath: uploadResult.path,
          size: uploadResult.size,
          type: uploadResult.type,
          uploadedBy: currentUser.uid,
          uploadedByName: currentUserProfile
            ? `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            : undefined,
          uploadedAt: new Date(),
        },
        ...prev,
      ])
    } catch (error) {
      logger.error("Failed to upload file", error)
      setFileUploadError("Upload failed. Please try again.")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteProjectFile = async (file: ProjectFile) => {
    try {
      await deleteFile(file.storagePath)
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "projectFiles", file.id))
      setProjectFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (error) {
      logger.error("Failed to delete file", error)
      toast({
        title: "Delete Failed",
        description: "Unable to delete file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B"
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getPersonById = (personId?: string | null) =>
    teamMembers.find(member => member.id === personId) || null

  const getTaskStatusMeta = (status?: string) => {
    switch (status) {
      case "done":
      case "completed":
        return { label: "Completed", color: "bg-green-50 text-green-700 border-green-200", bar: "bg-green-500" }
      case "in-progress":
      case "working":
        return { label: "In progress", color: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-blue-500" }
      case "blocked":
      case "at-risk":
        return { label: "Blocked", color: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" }
      default:
        return { label: "Planned", color: "bg-muted text-slate-700 border-border", bar: "bg-muted-foreground" }
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-border bg-surface-2 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">{project.name}</h1>
                <Badge className={`${getHealthStatusColor(computedHealth.status)} border-0`}>
                  <span className="capitalize">{computedHealth.status.replace("-", " ")}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={isFundedProject ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-700 border-gray-300"}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {isFundedProject ? "Funded" : "Unfunded"}
                </Badge>
                <Badge variant="secondary">{project.status}</Badge>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {project.grantNumber && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {project.grantNumber}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {startDate} - {endDate}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {project.teamMemberIds?.length || 0} team members
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              title="Export project snapshot"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
      </div>

      <div className="border-b border-border bg-background px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <span className="flex items-center gap-1">
            <Folder className="h-4 w-4" />
            Projects
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate">{project.name}</span>
          {selectedWorkpackage && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground truncate">{selectedWorkpackage.name}</span>
            </>
          )}
          {selectedDeliverable && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground truncate">{selectedDeliverable.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant={drawerVisibility.stats ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("stats")}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Stats
          </Button>
          <Button
            variant={drawerVisibility.funding ? "secondary" : "ghost"}
            size="sm"
            onClick={() => canAccessFunding && toggleDrawer("funding")}
            disabled={!canAccessFunding}
            className="gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Funding
          </Button>
          <Button
            variant={drawerVisibility.resources ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("resources")}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            Resources
          </Button>
          <Button
            variant={drawerVisibility.files ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("files")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Files
          </Button>
          <Button
            variant={drawerVisibility.activity ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("activity")}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            Activity
          </Button>
          <Button
            variant={drawerVisibility.emails ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleDrawer("emails")}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Emails
          </Button>
          {onCreateWorkpackage && (
            <Button onClick={handleCreateWorkpackageClick} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Work Package
            </Button>
          )}
        </div>
      </div>

      {drawerVisibility.stats && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Work Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWorkpackages}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.completedWorkpackages} completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.taskCompletionRate}% complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.totalBudget || 0, project.currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(project.remainingBudget || 0, project.currency)} remaining
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysRemaining} days</div>
                <p className="text-xs text-muted-foreground mt-1">remaining until project end</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Deliverable Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Completed</span>
                  <Badge variant="secondary">{deliverableStats.completed}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>In progress</span>
                  <Badge variant="secondary">{deliverableStats.inProgress}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Not started</span>
                  <Badge variant="secondary">{deliverableStats.notStarted}</Badge>
                </div>
                <Progress
                  value={
                    deliverableStats.total > 0
                      ? (deliverableStats.completed / deliverableStats.total) * 100
                      : 0
                  }
                  className="h-2 mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  {deliverableStats.total} deliverables total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Burndown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tasks remaining</span>
                  <Badge variant="outline">
                    {Math.max(stats.totalTasks - stats.completedTasks, 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tasks completed</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {stats.completedTasks}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stay on track by closing {Math.ceil(Math.max(stats.totalTasks - stats.completedTasks, 0) / Math.max(daysRemaining, 1))}
                  {" "}tasks/day to finish on time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">People working</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {peopleActive.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active task owners yet.</p>
                ) : (
                  peopleActive.slice(0, 6).map((person) => (
                    <div key={person.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{person.firstName} {person.lastName}</span>
                      <Badge variant="outline" className="text-[11px]">
                        {person.position || "Team member"}
                      </Badge>
                    </div>
                  ))
                )}
                {peopleActive.length > 6 && (
                  <p className="text-xs text-muted-foreground">
                    +{peopleActive.length - 6} more contributors
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {drawerVisibility.funding && (
        <div className="border-b border-border bg-surface-2 px-6 py-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.totalBudget || 0, project.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Spent</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.spentAmount || 0, project.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.remainingBudget || 0, project.currency)}
                  </p>
                </div>
              </div>
              {project.totalBudget && project.totalBudget > 0 && (
                <div className="mt-4">
                  <Progress value={((project.spentAmount || 0) / project.totalBudget) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round(((project.spentAmount || 0) / project.totalBudget) * 100)}% of budget used
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funding accounts</CardTitle>
              <CardDescription>Ledger view across accounts and funders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fundingAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked funding accounts yet.</p>
              ) : (
                <div className="space-y-2">
                  {fundingAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-background"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{account.accountName}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.funderName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(account.totalBudget || 0, account.currency || project.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(account.remainingBudget || 0, account.currency || project.currency)} remaining
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fundingByFunder.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">By funder</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {fundingByFunder.map((entry, idx) => (
                      <div key={`${entry.funderName}-${idx}`} className="p-3 rounded-lg border bg-surface-2">
                        <p className="text-sm font-medium truncate">{entry.funderName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(entry.spent, project.currency)} spent - {formatCurrency(entry.committed, project.currency)} committed
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {canAccessFunding && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Project Orders
                </CardTitle>
                <CardDescription>
                  {orderStats.totalOrders} order{orderStats.totalOrders !== 1 ? "s" : ""} -{" "}
                  {formatCurrency(orderStats.totalSpent, project.currency)} spent -{" "}
                  {formatCurrency(orderStats.totalCommitted, project.currency)} committed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders linked to this project</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Orders will appear here when created through project funding accounts
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-surface-2 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{orderStats.toOrderCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">To Order</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{orderStats.orderedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Ordered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{orderStats.receivedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Received</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-3">Recent Orders</h4>
                      {orders.slice(0, 10).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface-2 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{order.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">{order.catNum}</p>
                              {order.supplier && (
                                <>
                                  <span className="text-xs text-muted-foreground">-</span>
                                  <p className="text-xs text-muted-foreground">{order.supplier}</p>
                                </>
                              )}
                              {order.allocationName && (
                                <>
                                  <span className="text-xs text-muted-foreground">-</span>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {order.allocationName}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(order.priceExVAT, order.currency)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${order.status === "received"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : order.status === "ordered"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                }`}
                            >
                              {order.status === "to-order"
                                ? "To Order"
                                : order.status === "ordered"
                                  ? "Ordered"
                                  : "Received"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {orders.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Showing 10 of {orders.length} orders
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {drawerVisibility.resources && (
        <div className="border-b border-border bg-surface-2 px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
                <CardDescription>Team members contributing to this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No people linked yet.</p>
                ) : (
                  teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.position || "Team member"}</p>
                      </div>
                      <Badge variant="outline" className="text-[11px]">{member.labName || "Lab"}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment & Inventory</CardTitle>
                <CardDescription>Items available in the project lab</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Equipment</p>
                  {equipmentItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No equipment linked.</p>
                  ) : (
                    equipmentItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                        <span className="text-sm font-medium truncate">{item.name || item.equipmentName || "Equipment"}</span>
                        <Badge variant="outline" className="text-[11px]">{item.status || "active"}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Inventory</p>
                  {inventoryItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No inventory linked.</p>
                  ) : (
                    inventoryItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                        <span className="text-sm font-medium truncate">{item.name || "Inventory item"}</span>
                        <Badge variant="secondary" className="text-[11px]">{item.category || "General"}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Events & Experiments</CardTitle>
                <CardDescription>Upcoming milestones and ELN work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Upcoming events</p>
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events scheduled.</p>
                  ) : (
                    events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-background cursor-pointer"
                        onClick={() => onViewEvent?.(event.id)}
                      >
                        <span className="text-sm font-medium truncate">{event.title}</span>
                        <Badge variant="outline" className="text-[11px]">{new Date(event.start).toLocaleDateString()}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Experiments</p>
                  {experiments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked experiments.</p>
                  ) : (
                    experiments.slice(0, 3).map(exp => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-background cursor-pointer"
                        onClick={() => onViewExperiment?.(exp.id)}
                      >
                        <span className="text-sm font-medium truncate">{exp.title}</span>
                        <Badge variant="outline" className="text-[11px]">{exp.status || "in-progress"}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {drawerVisibility.files && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project files</CardTitle>
                <CardDescription>Upload and manage documents linked to this project</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingFile}
                  onClick={() => document.getElementById("project-file-input")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFile ? "Uploading..." : "Upload"}
                </Button>
                <input
                  id="project-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleFileUpload(file)
                      e.target.value = ""
                    }
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fileUploadError && <p className="text-sm text-red-600">{fileUploadError}</p>}
              {projectFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
              ) : (
                projectFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {file.name}
                        </a>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)} · {file.type || "file"} ·{" "}
                        {file.uploadedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <a href={file.url} target="_blank" rel="noreferrer">Open</a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProjectFile(file)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {drawerVisibility.activity && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Activity</CardTitle>
              <CardDescription>
                Orders, deliverables, tasks, and comments in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                <div className="space-y-3">
                  {activityFeed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                  ) : (
                    activityFeed.map((event, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-background flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{event.label}</p>
                          {event.meta && <p className="text-xs text-muted-foreground truncate">{event.meta}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <CommentsSection
                  entityType="project"
                  entityId={project.id}
                  teamMembers={teamMembers.map(m => ({
                    id: m.id,
                    name: `${m.firstName} ${m.lastName}`
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {drawerVisibility.emails && (
        <div className="border-b border-border bg-surface-2 px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectEmailRules projectId={project.id} />
            <ProjectEmailsPanel projectId={project.id} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr_360px] h-full">
          <Card className="bg-surface-2 border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PanelLeft className="h-4 w-4" />
                Structure
              </CardTitle>
              <CardDescription>Workpackages → Deliverables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workpackages.length === 0 && (
                <p className="text-sm text-muted-foreground">No work packages yet.</p>
              )}
              {workpackages.map((wp) => {
                const deliverablesForWp = getWorkpackageDeliverables(wp.id)
                const isSelected = wp.id === selectedWorkpackageId
                const isExpanded = expandedWorkpackages[wp.id]

                return (
                  <div
                    key={wp.id}
                    className={`rounded-lg border ${isSelected ? "border-brand-500 bg-brand-50/40" : "border-border"}`}
                  >
                    <button
                      onClick={() => {
                        setSelectedWorkpackageId(wp.id)
                        setSelectedDeliverableId(deliverablesForWp[0]?.id || null)
                      }}
                      className="w-full px-3 py-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleWorkpackageExpand(wp.id)
                            }}
                            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{wp.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {deliverablesForWp.length} deliverable{deliverablesForWp.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={wp.status === "completed" ? "default" : "outline"} className="text-[11px]">
                          {wp.status}
                        </Badge>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-background px-3 py-2 space-y-2">
                        {deliverablesForWp.length === 0 && (
                          <p className="text-xs text-muted-foreground">No deliverables yet.</p>
                        )}
                        {deliverablesForWp.map((deliverable) => (
                          <button
                            key={deliverable.id}
                            onClick={() => {
                              setSelectedWorkpackageId(wp.id)
                              setSelectedDeliverableId(deliverable.id)
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md transition-colors ${deliverable.id === selectedDeliverableId ? "bg-brand-50 text-brand-900" : "hover:bg-muted/60"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{deliverable.name}</span>
                              <Badge variant="outline" className="text-[11px]">
                                {deliverable.status}
                              </Badge>
                            </div>
                            <Progress value={deliverable.progress || 0} className="h-1 mt-2" />
                          </button>
                        ))}

                        {onCreateDeliverable && (
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Quick add deliverable"
                              value={newDeliverableNames[wp.id] || ""}
                              onChange={(event) =>
                                setNewDeliverableNames((prev) => ({ ...prev, [wp.id]: event.target.value }))
                              }
                              className="h-9"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleQuickAddDeliverable(wp.id)}
                              disabled={!newDeliverableNames[wp.id]?.trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{selectedDeliverable?.name || "Select a deliverable"}</CardTitle>
                  {selectedWorkpackage && <CardDescription>{selectedWorkpackage.name}</CardDescription>}
                </div>
                {selectedDeliverable && (
                  <Badge variant="outline" className="capitalize">
                    {selectedDeliverable.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDeliverable ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deliverable progress</span>
                      <span className="font-medium">{selectedDeliverable.progress || 0}%</span>
                    </div>
                    <Progress value={selectedDeliverable.progress || 0} className="h-2" />
                  </div>

                  {selectedDeliverable.description && (
                    <p className="text-sm text-muted-foreground">{selectedDeliverable.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDeliverable.importance || "unspecified"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Owner: {teamMembers.find((p) => p.id === selectedDeliverable.ownerId)?.firstName || "Unassigned"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListTodo className="h-4 w-4" />
                      <span>Open the detailed drawer for metrics, blockers, and links.</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDeliverableForPanel(selectedDeliverable)}>
                      Open Details
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a deliverable to view details.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface-2 border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PanelRight className="h-4 w-4" />
                Task execution
              </CardTitle>
              <CardDescription>Tasks linked to the selected deliverable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick add task"
                  value={newTaskName}
                  onChange={(event) => setNewTaskName(event.target.value)}
                  className="h-9"
                />
                <Button size="sm" onClick={handleQuickAddTask} disabled={!newTaskName.trim() || !onUpdateWorkpackage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {getTasksForSelectedDeliverable().length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks yet for this selection.</p>
              )}

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {getTasksForSelectedDeliverable().map((task: ProjectTask, idx: number) => {
                  const meta = getTaskStatusMeta(task?.status)
                  const owner = getPersonById(task?.primaryOwner)
                  const progressValue = typeof task?.progress === "number" ? task.progress : 0
                  const taskProblem = isTaskBlocked(task) || isTaskOverdue(task)

                  return (
                    <div key={task?.id || idx} className="p-3 rounded-lg border bg-background space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <p className="font-medium truncate">{task?.name || "Untitled task"}</p>
                        </div>
                        <Badge variant="outline" className={`text-[11px] ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`${meta.bar} h-1.5 rounded-full`} style={{ width: `${progressValue || 0}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{owner ? `${owner.firstName} ${owner.lastName}` : "Unassigned"}</span>
                        {taskProblem && <span className="text-red-600 font-medium">At risk</span>}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => task?.id && updateTaskStatus(task.id, "in-progress")}
                        >
                          Start
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => task?.id && updateTaskStatus(task.id, "done")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => task?.id && handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WorkpackageDialog
        open={workpackageDialogOpen}
        onOpenChange={setWorkpackageDialogOpen}
        workpackage={selectedWorkpackage}
        projectId={project.id}
        onSave={handleSaveWorkpackage}
        onDelete={workpackageDialogMode === "edit" ? handleDeleteWorkpackage : undefined}
        mode={workpackageDialogMode}
        availableLeads={teamMembers}
      />

      {selectedWorkpackageForDeliverable && (
        <DeliverableDialog
          open={deliverableDialogOpen}
          onOpenChange={setDeliverableDialogOpen}
          deliverable={selectedDeliverableDialog}
          workpackageId={selectedWorkpackageForDeliverable}
          onSave={handleSaveDeliverable}
          onDelete={
            deliverableDialogMode === "edit"
              ? () => selectedDeliverableDialog && handleDeleteDeliverable(selectedDeliverableDialog.id)
              : undefined
          }
          mode={deliverableDialogMode}
          availableOwners={teamMembers}
        />
      )}

      {selectedDeliverableForPanel && (
        <DeliverableDetailsPanel
          deliverable={selectedDeliverableForPanel}
          onClose={() => setSelectedDeliverableForPanel(null)}
          onEdit={onUpdateDeliverable ? handleEditDeliverable : undefined}
          onDelete={onDeleteDeliverable ? handleDeleteDeliverable : undefined}
          onUpdate={onUpdateDeliverable}
          orders={orders}
          people={teamMembers}
        />
      )}

      <ProjectExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        projectId={project.id}
        projectName={project.name}
        userId={currentUser?.uid || ""}
      />

      <ProjectImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={handleImportSuccess}
        labId={currentUserProfile?.labId || ""}
        userId={currentUser?.uid || ""}
      />
    </div>
  )
}
