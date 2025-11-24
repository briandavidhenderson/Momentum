/**
 * Progress Calculation Utilities
 *
 * Cascading progress calculation from todos → project tasks → deliverables → work packages → projects
 */

import { Deliverable, Project, ProjectTask, ProjectTaskTodo, Task, Workpackage } from "./types"

/**
 * Calculate subtask progress from todos (legacy Task/Subtask structure)
 * If no todos, use manual progress value
 */
export function calculateSubtaskProgress(subtask: { progress: number; todos?: { completed: boolean }[] }): number {
  if (!subtask.todos || subtask.todos.length === 0) {
    return subtask.progress || 0 // Use manual progress if no todos
  }

  const completedTodos = subtask.todos.filter(t => t.completed).length
  const totalTodos = subtask.todos.length

  if (totalTodos === 0) return 0

  return Math.round((completedTodos / totalTodos) * 100)
}

/**
 * Calculate project task progress.
 * Supports both new ProjectTask (todos) and legacy Task (subtasks) structures for backward compatibility.
 */
export function calculateTaskProgress(task: ProjectTask | Task): number {
  // ProjectTask with todos
  if ((task as ProjectTask).todos && Array.isArray((task as ProjectTask).todos)) {
    const todos = (task as ProjectTask).todos as ProjectTaskTodo[]
    if (todos.length === 0) return task.progress || 0

    const completedTodos = todos.filter((t) => t.completed).length
    return Math.round((completedTodos / todos.length) * 100)
  }

  // Legacy Task with subtasks
  if ((task as Task).subtasks && Array.isArray((task as Task).subtasks)) {
    const subtasks = (task as Task).subtasks!
    if (subtasks.length === 0) return task.progress || 0

    const totalProgress = subtasks.reduce(
      (sum, subtask) => sum + calculateSubtaskProgress(subtask),
      0
    )

    return Math.round(totalProgress / subtasks.length)
  }

  return task.progress || 0
}

/**
 * Calculate deliverable progress from linked project tasks.
 * Falls back to the deliverable's stored progress if no project tasks are provided.
 */
export function calculateDeliverableProgress(
  deliverable: Deliverable,
  projectTasks: ProjectTask[] = []
): number {
  const tasksForDeliverable = projectTasks.filter((task) => task.deliverableId === deliverable.id)

  if (tasksForDeliverable.length === 0) {
    return deliverable.progress || 0
  }

  const totalProgress = tasksForDeliverable.reduce(
    (sum, task) => sum + calculateTaskProgress(task),
    0
  )

  return Math.round(totalProgress / tasksForDeliverable.length)
}

/**
 * Calculate work package progress from its deliverables and linked project tasks.
 * Falls back to the workpackage's stored progress when no deliverables are provided.
 */
export function calculateWorkpackageProgress(
  workpackage: Workpackage,
  deliverables: Deliverable[] = [],
  projectTasks: ProjectTask[] = []
): number {
  const deliverablesForWorkpackage = deliverables.filter((deliverable) => deliverable.workpackageId === workpackage.id)

  if (deliverablesForWorkpackage.length === 0) {
    return workpackage.progress || 0
  }

  const totalProgress = deliverablesForWorkpackage.reduce(
    (sum, deliverable) => sum + calculateDeliverableProgress(deliverable, projectTasks),
    0
  )

  return Math.round(totalProgress / deliverablesForWorkpackage.length)
}

/**
 * Calculate project progress from work packages.
 * If workpackages are not provided, returns the stored project.progress value.
 */
export function calculateProjectProgress(
  project: Project,
  workpackages: Workpackage[] = [],
  deliverables: Deliverable[] = [],
  projectTasks: ProjectTask[] = []
): number {
  if (workpackages.length === 0) {
    return project.progress || 0
  }

  const totalProgress = workpackages.reduce((sum, workpackage) => {
    return sum + calculateWorkpackageProgress(workpackage, deliverables, projectTasks)
  }, 0)

  return Math.round(totalProgress / workpackages.length)
}
