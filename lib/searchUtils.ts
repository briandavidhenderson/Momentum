/**
 * Search and Filtering Utilities
 * Provides functions for searching and filtering data across the application
 */

import type { Project, Task, PersonProfile, CalendarEvent, Order, InventoryItem } from "./types"
import { WORK_STATUS, PROJECT_STATUS, IMPORTANCE_LEVEL } from "./constants"

// ============================================================================
// GENERIC SEARCH
// ============================================================================

/**
 * Generic fuzzy search function
 * Searches for a query string within multiple fields of an object
 */
export function fuzzySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] {
  if (!query || query.trim() === "") return items

  const lowerQuery = query.toLowerCase().trim()

  return items.filter((item) => {
    return searchFields.some((field) => {
      const value = item[field]
      if (value === null || value === undefined) return false

      // Handle different types
      if (typeof value === "string") {
        return value.toLowerCase().includes(lowerQuery)
      }
      if (typeof value === "number") {
        return String(value).includes(lowerQuery)
      }
      if (Array.isArray(value)) {
        return value.some((v: any) =>
          String(v).toLowerCase().includes(lowerQuery)
        )
      }

      return false
    })
  })
}

// ============================================================================
// PROJECT SEARCH & FILTERING
// ============================================================================

export interface ProjectFilters {
  query?: string
  status?: string[]
  importance?: string[]
  kind?: string[]
  principalInvestigatorId?: string
  startDateFrom?: Date
  startDateTo?: Date
  endDateFrom?: Date
  endDateTo?: Date
  minProgress?: number
  maxProgress?: number
  tags?: string[]
}

/**
 * Search projects by query string
 */
export function searchProjects(projects: Project[], query: string): Project[] {
  return fuzzySearch(projects, query, ["name", "notes", "tags"])
}

/**
 * Filter projects by multiple criteria
 */
export function filterProjects(
  projects: Project[],
  filters: ProjectFilters
): Project[] {
  let filtered = projects

  // Text search
  if (filters.query) {
    filtered = searchProjects(filtered, filters.query)
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((p) =>
      filters.status!.includes(p.status || "")
    )
  }

  // Importance filter
  if (filters.importance && filters.importance.length > 0) {
    filtered = filtered.filter((p) =>
      filters.importance!.includes(p.importance)
    )
  }

  // Kind filter
  if (filters.kind && filters.kind.length > 0) {
    filtered = filtered.filter((p) =>
      filters.kind!.includes(p.kind || "regular")
    )
  }

  // PI filter
  if (filters.principalInvestigatorId) {
    filtered = filtered.filter(
      (p) => p.principalInvestigatorId === filters.principalInvestigatorId
    )
  }

  // Date filters
  if (filters.startDateFrom) {
    filtered = filtered.filter((p) => p.start >= filters.startDateFrom!)
  }
  if (filters.startDateTo) {
    filtered = filtered.filter((p) => p.start <= filters.startDateTo!)
  }
  if (filters.endDateFrom) {
    filtered = filtered.filter((p) => p.end >= filters.endDateFrom!)
  }
  if (filters.endDateTo) {
    filtered = filtered.filter((p) => p.end <= filters.endDateTo!)
  }

  // Progress filters
  if (filters.minProgress !== undefined) {
    filtered = filtered.filter((p) => p.progress >= filters.minProgress!)
  }
  if (filters.maxProgress !== undefined) {
    filtered = filtered.filter((p) => p.progress <= filters.maxProgress!)
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((p) =>
      p.tags?.some((tag) => filters.tags!.includes(tag))
    )
  }

  return filtered
}

// ============================================================================
// TASK SEARCH & FILTERING
// ============================================================================

export interface TaskFilters {
  query?: string
  status?: string[]
  importance?: string[]
  type?: string[]
  primaryOwner?: string
  startDateFrom?: Date
  startDateTo?: Date
  endDateFrom?: Date
  endDateTo?: Date
  workpackageId?: string
}

/**
 * Search tasks by query string
 */
export function searchTasks(tasks: Task[], query: string): Task[] {
  return fuzzySearch(tasks, query, ["name", "notes", "tags"])
}

/**
 * Filter tasks by multiple criteria
 */
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  let filtered = tasks

  // Text search
  if (filters.query) {
    filtered = searchTasks(filtered, filters.query)
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((t) =>
      filters.status!.includes(t.status || "")
    )
  }

  // Importance filter
  if (filters.importance && filters.importance.length > 0) {
    filtered = filtered.filter((t) =>
      filters.importance!.includes(t.importance)
    )
  }

  // Type filter
  if (filters.type && filters.type.length > 0) {
    filtered = filtered.filter((t) =>
      filters.type!.includes(t.type || "")
    )
  }

  // Owner filter
  if (filters.primaryOwner) {
    filtered = filtered.filter((t) => t.primaryOwner === filters.primaryOwner)
  }

  // Workpackage filter
  if (filters.workpackageId) {
    filtered = filtered.filter((t) => t.workpackageId === filters.workpackageId)
  }

  // Date filters
  if (filters.startDateFrom) {
    filtered = filtered.filter((t) => t.start >= filters.startDateFrom!)
  }
  if (filters.startDateTo) {
    filtered = filtered.filter((t) => t.start <= filters.startDateTo!)
  }
  if (filters.endDateFrom) {
    filtered = filtered.filter((t) => t.end >= filters.endDateFrom!)
  }
  if (filters.endDateTo) {
    filtered = filtered.filter((t) => t.end <= filters.endDateTo!)
  }

  return filtered
}

// ============================================================================
// PEOPLE SEARCH & FILTERING
// ============================================================================

export interface PeopleFilters {
  query?: string
  organisationId?: string
  instituteId?: string
  labId?: string
  position?: string
  reportsToId?: string
}

/**
 * Search people by query string
 */
export function searchPeople(
  profiles: PersonProfile[],
  query: string
): PersonProfile[] {
  return fuzzySearch(profiles, query, [
    "firstName",
    "lastName",
    "email",
    "position",
    "researchInterests",
    "qualifications",
  ])
}

/**
 * Filter people by multiple criteria
 */
export function filterPeople(
  profiles: PersonProfile[],
  filters: PeopleFilters
): PersonProfile[] {
  let filtered = profiles

  // Text search
  if (filters.query) {
    filtered = searchPeople(filtered, filters.query)
  }

  // Organisation filter
  if (filters.organisationId) {
    filtered = filtered.filter((p) => p.organisationId === filters.organisationId)
  }

  // Institute filter
  if (filters.instituteId) {
    filtered = filtered.filter((p) => p.instituteId === filters.instituteId)
  }

  // Lab filter
  if (filters.labId) {
    filtered = filtered.filter((p) => p.labId === filters.labId)
  }

  // Position filter
  if (filters.position) {
    filtered = filtered.filter((p) => p.position === filters.position)
  }

  // Reports to filter
  if (filters.reportsToId) {
    filtered = filtered.filter((p) => p.reportsToId === filters.reportsToId)
  }

  return filtered
}

// ============================================================================
// INVENTORY SEARCH & FILTERING
// ============================================================================

export interface InventoryFilters {
  query?: string
  category?: string
  subcategory?: string
  inventoryLevel?: string[]
  chargeToAccount?: string
  minQuantity?: boolean // Show items below minimum quantity
}

/**
 * Search inventory by query string
 */
export function searchInventory(
  inventory: InventoryItem[],
  query: string
): InventoryItem[] {
  return fuzzySearch(inventory, query, [
    "productName",
    "catNum",
    "notes",
    "category",
    "subcategory",
  ])
}

/**
 * Filter inventory by multiple criteria
 */
export function filterInventory(
  inventory: InventoryItem[],
  filters: InventoryFilters
): InventoryItem[] {
  let filtered = inventory

  // Text search
  if (filters.query) {
    filtered = searchInventory(filtered, filters.query)
  }

  // Category filter
  if (filters.category) {
    filtered = filtered.filter((i) => i.category === filters.category)
  }

  // Subcategory filter
  if (filters.subcategory) {
    filtered = filtered.filter((i) => i.subcategory === filters.subcategory)
  }

  // Inventory level filter
  if (filters.inventoryLevel && filters.inventoryLevel.length > 0) {
    filtered = filtered.filter((i) =>
      filters.inventoryLevel!.includes(i.inventoryLevel)
    )
  }

  // Account filter
  if (filters.chargeToAccount) {
    filtered = filtered.filter(
      (i) => i.chargeToAccount === filters.chargeToAccount
    )
  }

  // Below minimum quantity
  if (filters.minQuantity) {
    filtered = filtered.filter(
      (i) =>
        i.currentQuantity !== undefined &&
        i.minQuantity !== undefined &&
        i.currentQuantity < i.minQuantity
    )
  }

  return filtered
}

// ============================================================================
// EVENT SEARCH & FILTERING
// ============================================================================

export interface EventFilters {
  query?: string
  type?: string[]
  visibility?: string[]
  startDateFrom?: Date
  startDateTo?: Date
  ownerId?: string
}

/**
 * Search events by query string
 */
export function searchEvents(
  events: CalendarEvent[],
  query: string
): CalendarEvent[] {
  return fuzzySearch(events, query, [
    "title",
    "description",
    "location",
    "tags",
  ])
}

/**
 * Filter events by multiple criteria
 */
export function filterEvents(
  events: CalendarEvent[],
  filters: EventFilters
): CalendarEvent[] {
  let filtered = events

  // Text search
  if (filters.query) {
    filtered = searchEvents(filtered, filters.query)
  }

  // Type filter
  if (filters.type && filters.type.length > 0) {
    filtered = filtered.filter((e) =>
      filters.type!.includes(e.type || "")
    )
  }

  // Visibility filter
  if (filters.visibility && filters.visibility.length > 0) {
    filtered = filtered.filter((e) =>
      filters.visibility!.includes(e.visibility)
    )
  }

  // Owner filter
  if (filters.ownerId) {
    filtered = filtered.filter((e) => e.ownerId === filters.ownerId)
  }

  // Date filters
  if (filters.startDateFrom) {
    filtered = filtered.filter((e) => e.start >= filters.startDateFrom!)
  }
  if (filters.startDateTo) {
    filtered = filtered.filter((e) => e.start <= filters.startDateTo!)
  }

  return filtered
}

// ============================================================================
// ORDER SEARCH & FILTERING
// ============================================================================

export interface OrderFilters {
  query?: string
  status?: string[]
  category?: string
  subcategory?: string
  chargeToAccount?: string
  orderedBy?: string
}

/**
 * Search orders by query string
 */
export function searchOrders(orders: Order[], query: string): Order[] {
  return fuzzySearch(orders, query, ["productName", "catNum"])
}

/**
 * Filter orders by multiple criteria
 */
export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  let filtered = orders

  // Text search
  if (filters.query) {
    filtered = searchOrders(filtered, filters.query)
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((o) => filters.status!.includes(o.status))
  }

  // Category filter
  if (filters.category) {
    filtered = filtered.filter((o) => o.category === filters.category)
  }

  // Subcategory filter
  if (filters.subcategory) {
    filtered = filtered.filter((o) => o.subcategory === filters.subcategory)
  }

  // Account filter
  if (filters.chargeToAccount) {
    filtered = filtered.filter(
      (o) => o.chargeToAccount === filters.chargeToAccount
    )
  }

  // Ordered by filter
  if (filters.orderedBy) {
    filtered = filtered.filter((o) => o.orderedBy === filters.orderedBy)
  }

  return filtered
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

export type SortDirection = "asc" | "desc"

/**
 * Generic sorting function
 */
export function sortBy<T>(
  items: T[],
  key: keyof T,
  direction: SortDirection = "asc"
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (aVal === bVal) return 0
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    if (direction === "asc") {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}

/**
 * Sort projects by various criteria
 */
export function sortProjects(
  projects: Project[],
  sortByField: "name" | "start" | "end" | "progress" | "importance",
  direction: SortDirection = "asc"
): Project[] {
  return sortBy<Project>(projects, sortByField as keyof Project, direction)
}

/**
 * Sort tasks by various criteria
 */
export function sortTasks(
  tasks: Task[],
  sortByField: "name" | "start" | "end" | "progress" | "importance",
  direction: SortDirection = "asc"
): Task[] {
  return sortBy<Task>(tasks, sortByField as keyof Task, direction)
}
