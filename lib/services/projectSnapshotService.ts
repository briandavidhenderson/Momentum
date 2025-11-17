/**
 * Project Snapshot Service
 *
 * Handles importing and exporting complete project structures with all
 * related workpackages, deliverables, tasks, orders, and ledger data.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  ProjectSnapshot,
  ProjectWithDetails,
  WorkpackageWithDeliverables,
  DeliverableWithDetails,
  OrderWithInventory,
  ImportOptions,
  ImportResult,
  ImportStatistics,
  ImportError,
  ValidationResult,
  ProgressDetail,
  ProjectLedger,
} from '@/lib/types'

const SNAPSHOT_VERSION = '1.0.0'

/**
 * Export a complete project snapshot to JSON
 */
export async function exportProjectSnapshot(
  projectId: string,
  userId: string
): Promise<ProjectSnapshot> {
  try {
    logger.info('Starting project snapshot export', { projectId })

    // Fetch project
    const db = getFirebaseDb()
    const projectDoc = await getDoc(doc(db, 'projects', projectId))
    if (!projectDoc.exists()) {
      throw new Error(`Project ${projectId} not found`)
    }
    const project = { id: projectDoc.id, ...projectDoc.data() } as any

    // Fetch workpackages for this project
    const workpackagesQuery = query(
      collection(db, 'workpackages'),
      where('profileProjectId', '==', projectId)
    )
    const workpackagesDocs = await getDocs(workpackagesQuery)
    const workpackageIds = workpackagesDocs.docs.map((doc) => doc.id)

    // Fetch deliverables for all workpackages
    const deliverables: any[] = []
    if (workpackageIds.length > 0) {
      const deliverablesQuery = query(
        collection(db, 'deliverables'),
        where('workpackageId', 'in', workpackageIds.slice(0, 10)) // Firestore 'in' limit
      )
      const deliverablesDocs = await getDocs(deliverablesQuery)
      deliverables.push(
        ...deliverablesDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      )
    }
    const deliverableIds = deliverables.map((d) => d.id)

    // Fetch orders linked to deliverables
    const orders: any[] = []
    if (deliverableIds.length > 0) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('linkedDeliverableId', 'in', deliverableIds.slice(0, 10))
      )
      const ordersDocs = await getDocs(ordersQuery)
      orders.push(...ordersDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    }

    // Fetch project tasks linked to deliverables
    const projectTasks: any[] = []
    if (deliverableIds.length > 0) {
      const tasksQuery = query(
        collection(db, 'projectTasks'),
        where('linkedDeliverableId', 'in', deliverableIds.slice(0, 10))
      )
      const tasksDocs = await getDocs(tasksQuery)
      projectTasks.push(...tasksDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    }

    // Fetch day-to-day tasks linked to deliverables
    const dayToDayTasks: any[] = []
    if (deliverableIds.length > 0) {
      const dayTasksQuery = query(
        collection(db, 'dayToDayTasks'),
        where('linkedDeliverableId', 'in', deliverableIds.slice(0, 10))
      )
      const dayTasksDocs = await getDocs(dayTasksQuery)
      dayToDayTasks.push(...dayTasksDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    }

    // Fetch funding accounts for this project
    const accountsQuery = query(
      collection(db, 'fundingAccounts'),
      where('masterProjectId', '==', projectId)
    )
    const accountsDocs = await getDocs(accountsQuery)
    const accounts = accountsDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // Fetch funding transactions
    const transactions: any[] = []
    const accountIds = accounts.map((a) => a.id)
    if (accountIds.length > 0) {
      const transactionsQuery = query(
        collection(db, 'fundingTransactions'),
        where('accountId', 'in', accountIds.slice(0, 10))
      )
      const transactionsDocs = await getDocs(transactionsQuery)
      transactions.push(
        ...transactionsDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      )
    }

    // Build hierarchical structure
    const workpackagesWithDeliverables: WorkpackageWithDeliverables[] =
      workpackagesDocs.docs.map((wpDoc) => {
        const wp = { id: wpDoc.id, ...wpDoc.data() } as any
        const wpDeliverables = deliverables.filter((d) => d.workpackageId === wp.id)

        const deliverablesWithDetails: DeliverableWithDetails[] = wpDeliverables.map(
          (deliverable) => {
            const linkedOrders: OrderWithInventory[] = orders
              .filter((o) => o.linkedDeliverableId === deliverable.id)
              .map((order) => ({
                ...order,
                inventoryUpdate: undefined, // TODO: Link to inventory updates if needed
              }))

            const linkedProjectTasks = projectTasks.filter(
              (t) => t.linkedDeliverableId === deliverable.id
            )

            const linkedDayTasks = dayToDayTasks.filter(
              (t) => t.linkedDeliverableId === deliverable.id
            )

            return {
              ...deliverable,
              linkedOrders,
              projectTasks: linkedProjectTasks,
              dayToDayTasks: linkedDayTasks,
              actions: ['createOrder', 'createTask', 'updateProgress'],
            }
          }
        )

        return {
          ...wp,
          deliverables: deliverablesWithDetails,
        }
      })

    // Calculate progress detail
    const progressDetail: ProgressDetail = calculateProgressDetail(
      deliverables,
      [...projectTasks, ...dayToDayTasks]
    )

    // Build ledger
    const ledger: ProjectLedger = buildProjectLedger(
      project,
      accounts,
      transactions,
      orders
    )

    // Build final snapshot
    const projectWithDetails: ProjectWithDetails = {
      ...project,
      workpackages: workpackagesWithDeliverables,
      progressDetail,
      ledger,
    }

    const snapshot: ProjectSnapshot = {
      version: SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      project: projectWithDetails,
    }

    logger.info('Project snapshot export completed', {
      projectId,
      workpackages: workpackagesWithDeliverables.length,
      deliverables: deliverables.length,
      orders: orders.length,
    })

    return snapshot
  } catch (error) {
    logger.error('Error exporting project snapshot', error)
    throw error
  }
}

/**
 * Import a project snapshot from JSON
 */
export async function importProjectSnapshot(
  snapshot: ProjectSnapshot,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    statistics: {
      workpackagesCreated: 0,
      deliverablesCreated: 0,
      ordersCreated: 0,
      tasksCreated: 0,
      transactionsCreated: 0,
      itemsSkipped: 0,
    },
    errors: [],
    warnings: [],
  }

  try {
    // Validate snapshot
    const validation = validateSnapshot(snapshot)
    if (!validation.valid) {
      result.errors = validation.errors
      return result
    }
    result.warnings = validation.warnings

    const { project } = snapshot
    const db = getFirebaseDb()
    const batch = writeBatch(db)
    let operationCount = 0

    // Generate new ID or use existing
    const projectId = options.generateNewIds
      ? doc(collection(db, 'projects')).id
      : project.id

    // Check if project exists
    if (!options.overwriteExisting) {
      const existingDoc = await getDoc(doc(db, 'projects', projectId))
      if (existingDoc.exists()) {
        result.errors.push({
          type: 'duplicate',
          message: `Project with ID ${projectId} already exists`,
        })
        return result
      }
    }

    // Create project document
    const projectData = {
      ...project,
      labId: options.labId || project.labId,
      createdBy: options.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    delete (projectData as any).workpackages
    delete (projectData as any).progressDetail
    delete (projectData as any).ledger

    batch.set(doc(db, 'projects', projectId), projectData)
    operationCount++

    // Import workpackages and deliverables
    for (const workpackage of project.workpackages) {
      const wpId = options.generateNewIds
        ? doc(collection(db, 'workpackages')).id
        : workpackage.id

      const wpData = {
        ...workpackage,
        profileProjectId: projectId,
        createdBy: options.userId,
        createdAt: Timestamp.now(),
      }
      delete (wpData as any).deliverables

      batch.set(doc(db, 'workpackages', wpId), wpData)
      operationCount++
      result.statistics.workpackagesCreated++

      // Import deliverables
      for (const deliverable of workpackage.deliverables) {
        const delivId = options.generateNewIds
          ? doc(collection(db, 'deliverables')).id
          : deliverable.id

        const delivData = {
          ...deliverable,
          workpackageId: wpId,
          createdBy: options.userId || deliverable.createdBy,
          createdAt: Timestamp.now(),
        }
        delete (delivData as any).linkedOrders
        delete (delivData as any).projectTasks
        delete (delivData as any).dayToDayTasks
        delete (delivData as any).actions

        batch.set(doc(db, 'deliverables', delivId), delivData)
        operationCount++
        result.statistics.deliverablesCreated++

        // Check batch size (Firestore limit is 500)
        if (operationCount >= 450) {
          await batch.commit()
          logger.info('Committed batch of operations', { count: operationCount })
          operationCount = 0
        }

        // Import orders if enabled
        if (options.importOrders !== false) {
          for (const order of deliverable.linkedOrders || []) {
            const orderId = options.generateNewIds
              ? doc(collection(db, 'orders')).id
              : order.id

            const orderData = {
              ...order,
              linkedDeliverableId: delivId,
              createdBy: options.userId || order.createdBy,
              createdAt: Timestamp.now(),
            }
            delete (orderData as any).inventoryUpdate

            batch.set(doc(db, 'orders', orderId), orderData)
            operationCount++
            result.statistics.ordersCreated++

            if (operationCount >= 450) {
              await batch.commit()
              operationCount = 0
            }
          }
        }

        // Import tasks if enabled
        if (options.importTasks !== false) {
          // Project tasks
          for (const task of deliverable.projectTasks || []) {
            const taskId = options.generateNewIds
              ? doc(collection(db, 'projectTasks')).id
              : task.id

            const taskData = {
              ...task,
              linkedDeliverableId: delivId,
              createdBy: options.userId,
              createdAt: Timestamp.now(),
            }
            delete (taskData as any).todos

            batch.set(doc(db, 'projectTasks', taskId), taskData)
            operationCount++
            result.statistics.tasksCreated++

            if (operationCount >= 450) {
              await batch.commit()
              operationCount = 0
            }
          }

          // Day-to-day tasks
          for (const task of deliverable.dayToDayTasks || []) {
            const taskId = options.generateNewIds
              ? doc(collection(db, 'dayToDayTasks')).id
              : task.id

            const taskData = {
              ...task,
              linkedDeliverableId: delivId,
              createdBy: options.userId,
              createdAt: Timestamp.now(),
            }

            batch.set(doc(db, 'dayToDayTasks', taskId), taskData)
            operationCount++
            result.statistics.tasksCreated++

            if (operationCount >= 450) {
              await batch.commit()
              operationCount = 0
            }
          }
        }
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit()
      logger.info('Committed final batch', { count: operationCount })
    }

    result.success = true
    result.projectId = projectId
    logger.info('Project snapshot import completed', { projectId, statistics: result.statistics })

    return result
  } catch (error) {
    logger.error('Error importing project snapshot', error)
    result.errors.push({
      type: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error during import',
    })
    return result
  }
}

/**
 * Validate project snapshot structure
 */
export function validateSnapshot(snapshot: ProjectSnapshot): ValidationResult {
  const errors: ImportError[] = []
  const warnings: string[] = []

  // Check version
  if (!snapshot.version) {
    errors.push({
      type: 'validation',
      field: 'version',
      message: 'Snapshot version is required',
    })
  }

  // Check project
  if (!snapshot.project) {
    errors.push({
      type: 'validation',
      field: 'project',
      message: 'Project data is required',
    })
    return { valid: false, errors, warnings }
  }

  const { project } = snapshot

  // Validate required project fields
  if (!project.id) {
    errors.push({
      type: 'validation',
      field: 'project.id',
      message: 'Project ID is required',
    })
  }

  if (!project.name) {
    errors.push({
      type: 'validation',
      field: 'project.name',
      message: 'Project name is required',
    })
  }

  // Validate workpackages
  if (!Array.isArray(project.workpackages)) {
    errors.push({
      type: 'validation',
      field: 'project.workpackages',
      message: 'Workpackages must be an array',
    })
  } else {
    project.workpackages.forEach((wp, index) => {
      if (!wp.id) {
        errors.push({
          type: 'validation',
          field: `workpackages[${index}].id`,
          message: `Workpackage at index ${index} missing ID`,
        })
      }
      if (!wp.name) {
        errors.push({
          type: 'validation',
          field: `workpackages[${index}].name`,
          message: `Workpackage at index ${index} missing name`,
        })
      }

      // Validate deliverables
      if (!Array.isArray(wp.deliverables)) {
        warnings.push(`Workpackage ${wp.name} has no deliverables array`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Calculate progress detail from deliverables and tasks
 */
function calculateProgressDetail(
  deliverables: any[],
  tasks: any[]
): ProgressDetail {
  const deliverablesCompleted = deliverables.filter(
    (d) => d.status === 'completed'
  ).length
  const deliverablesTotal = deliverables.length

  const tasksCompleted = tasks.filter((t) => t.status === 'completed').length
  const tasksTotal = tasks.length

  // Calculate average progress
  const delivProgress =
    deliverablesTotal > 0 ? (deliverablesCompleted / deliverablesTotal) * 100 : 0
  const taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0
  const calculatedProgress =
    deliverablesTotal > 0 || tasksTotal > 0
      ? (delivProgress + taskProgress) / 2
      : 0

  return {
    deliverablesCompleted,
    deliverablesTotal,
    tasksCompleted,
    tasksTotal,
    calculatedProgress: Math.round(calculatedProgress),
  }
}

/**
 * Build project ledger from funding data
 */
function buildProjectLedger(
  project: any,
  accounts: any[],
  transactions: any[],
  orders: any[]
): ProjectLedger {
  // Calculate totals from orders
  const spentAmount = orders
    .filter((o) => o.status === 'received' || o.status === 'ordered')
    .reduce((sum, o) => sum + (o.priceExVAT || 0), 0)

  const totalBudget = accounts.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0)
  const remainingBudget = totalBudget - spentAmount

  // Build account balances
  const accountBalances = accounts.map((account) => {
    const accountOrders = orders.filter((o) => o.accountId === account.id)
    const spent = accountOrders.reduce((sum, o) => sum + (o.priceExVAT || 0), 0)
    const startingAllocation = account.allocatedAmount || 0

    return {
      ...account,
      startingAllocation,
      spent,
      remaining: startingAllocation - spent,
    }
  })

  return {
    totalBudget,
    spentAmount,
    remainingBudget,
    currency: project.currency || 'EUR',
    accounts: accountBalances,
    transactions: transactions.map((t) => ({
      ...t,
      orderId: orders.find((o) => o.id === t.orderId)?.id,
    })),
  }
}

/**
 * Download snapshot as JSON file
 */
export function downloadSnapshot(snapshot: ProjectSnapshot, filename?: string) {
  const json = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `project-${snapshot.project.id}-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse uploaded JSON file
 */
export async function parseSnapshotFile(file: File): Promise<ProjectSnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const snapshot = JSON.parse(json) as ProjectSnapshot
        resolve(snapshot)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
