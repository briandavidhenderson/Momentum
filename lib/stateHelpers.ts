/**
 * State management helper utilities to reduce code duplication
 */

/**
 * Creates a generic updater function for a specific field
 * @example
 * const updateTaskName = createFieldUpdater<Task>('name')
 * updateTaskName(taskId, 'New Name', setTasks)
 */
export function createFieldUpdater<T extends { id: string }>(field: keyof T) {
  return (
    id: string,
    value: T[typeof field],
    setState: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    setState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }
}

/**
 * Creates a generic expand/collapse toggle function
 * @example
 * const toggleProjectExpand = createExpandToggler<Project>()
 * toggleProjectExpand(projectId, setProjects)
 */
export function createExpandToggler<T extends { id: string; isExpanded?: boolean }>() {
  return (id: string, setState: React.Dispatch<React.SetStateAction<T[]>>) => {
    setState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    )
  }
}

/**
 * Creates a generic delete function
 * @example
 * const deleteTask = createDeleter<Task>()
 * deleteTask(taskId, setTasks)
 */
export function createDeleter<T extends { id: string }>() {
  return (id: string, setState: React.Dispatch<React.SetStateAction<T[]>>) => {
    setState((prev) => prev.filter((item) => item.id !== id))
  }
}

/**
 * Creates a generic find function
 * @example
 * const findTask = createFinder<Task>()
 * const task = findTask(taskId, tasks)
 */
export function createFinder<T extends { id: string }>() {
  return (id: string, items: T[]): T | undefined => {
    return items.find((item) => item.id === id)
  }
}

/**
 * Creates a localStorage sync utility
 * @example
 * const projectsStorage = createLocalStorageSync<Project>('gantt-projects')
 * projectsStorage.save(projects)
 * const loaded = projectsStorage.load()
 */
export function createLocalStorageSync<T>(key: string) {
  return {
    load: (): T[] => {
      if (typeof window === 'undefined') return []
      try {
        const stored = localStorage.getItem(key)
        return stored ? JSON.parse(stored) : []
      } catch (error) {
        console.error(`Error loading ${key} from localStorage:`, error)
        return []
      }
    },
    save: (data: T[]) => {
      if (typeof window === 'undefined') return
      try {
        if (data.length > 0 || localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(data))
        }
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error)
      }
    },
    clear: () => {
      if (typeof window === 'undefined') return
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Error clearing ${key} from localStorage:`, error)
      }
    },
  }
}

/**
 * Normalizes date fields in an object (converts string dates to Date objects)
 * @example
 * const normalized = normalizeDates(project, ['start', 'end'])
 */
export function normalizeDates<T>(
  obj: T,
  dateFields: (keyof T)[]
): T {
  const normalized = { ...obj }
  dateFields.forEach((field) => {
    const value = normalized[field]
    if (value && typeof value === 'string') {
      normalized[field] = new Date(value) as T[keyof T]
    }
  })
  return normalized
}

/**
 * Batch normalizes dates for an array of objects
 * @example
 * const normalized = batchNormalizeDates(projects, ['start', 'end'])
 */
export function batchNormalizeDates<T>(
  items: T[],
  dateFields: (keyof T)[]
): T[] {
  return items.map((item) => normalizeDates(item, dateFields))
}

/**
 * Creates a confirmation dialog helper
 * @example
 * const confirmed = await confirmAction('Delete project?', 'This cannot be undone')
 */
export function confirmAction(
  title: string,
  message?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const fullMessage = message ? `${title}\n\n${message}` : title
    resolve(confirm(fullMessage))
  })
}

/**
 * Generates a unique ID with a prefix
 * @example
 * const id = generateId('project') // 'project-1699123456789'
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Deep clones an object (useful for state updates)
 * @example
 * const cloned = deepClone(project)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Checks if two arrays have the same elements (order-independent)
 * @example
 * const same = arraysEqual([1, 2, 3], [3, 2, 1]) // true
 */
export function arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  return sorted1.every((val, index) => val === sorted2[index])
}

/**
 * Groups an array of objects by a key
 * @example
 * const grouped = groupBy(tasks, 'workpackageId')
 */
export function groupBy<T>(
  items: T[],
  key: keyof T
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

/**
 * Counts items in an array by a predicate
 * @example
 * const completedCount = countBy(tasks, task => task.status === 'done')
 */
export function countBy<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length
}

/**
 * Safely gets a nested property value
 * @example
 * const name = getNestedValue(project, 'owner.name', 'Unknown')
 */
export function getNestedValue<T>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current?.[key] === undefined) {
      return defaultValue
    }
    current = current[key]
  }
  
  return current as T
}



