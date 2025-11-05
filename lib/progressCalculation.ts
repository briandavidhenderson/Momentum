/**
 * Progress Calculation Utilities
 *
 * Cascading progress calculation from todos → subtasks → tasks → work packages → projects
 */

import { Subtask, Task, Workpackage, Project } from "./types"

/**
 * Calculate subtask progress from todos
 * If no todos, use manual progress value
 */
export function calculateSubtaskProgress(subtask: Subtask): number {
  if (!subtask.todos || subtask.todos.length === 0) {
    return subtask.progress || 0  // Use manual progress if no todos
  }

  const completedTodos = subtask.todos.filter(t => t.completed).length
  const totalTodos = subtask.todos.length

  if (totalTodos === 0) return 0

  return Math.round((completedTodos / totalTodos) * 100)
}

/**
 * Calculate task progress from subtasks
 * If no subtasks, use manual progress value
 */
export function calculateTaskProgress(task: Task): number {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.progress || 0
  }

  const totalProgress = task.subtasks.reduce(
    (sum, subtask) => sum + calculateSubtaskProgress(subtask),
    0
  )

  const avgProgress = totalProgress / task.subtasks.length

  return Math.round(avgProgress)
}

/**
 * Calculate work package progress from tasks
 * If no tasks, use manual progress value
 */
export function calculateWorkpackageProgress(workpackage: Workpackage): number {
  if (!workpackage.tasks || workpackage.tasks.length === 0) {
    return workpackage.progress || 0
  }

  const totalProgress = workpackage.tasks.reduce(
    (sum, task) => sum + calculateTaskProgress(task),
    0
  )

  const avgProgress = totalProgress / workpackage.tasks.length

  return Math.round(avgProgress)
}

/**
 * Calculate project progress from work packages
 * Falls back to tasks if no work packages (legacy)
 */
export function calculateProjectProgress(project: Project): number {
  // New structure: use work packages
  if (project.workpackages && project.workpackages.length > 0) {
    const totalProgress = project.workpackages.reduce(
      (sum, wp) => sum + calculateWorkpackageProgress(wp),
      0
    )

    const avgProgress = totalProgress / project.workpackages.length
    return Math.round(avgProgress)
  }

  // Legacy structure: calculate from tasks directly
  if (project.tasks && project.tasks.length > 0) {
    const totalProgress = project.tasks.reduce(
      (sum, task) => sum + calculateTaskProgress(task),
      0
    )

    const avgProgress = totalProgress / project.tasks.length
    return Math.round(avgProgress)
  }

  return project.progress || 0
}

/**
 * Update a subtask's progress when todos change
 */
export function updateSubtaskWithTodoProgress(subtask: Subtask): Subtask {
  return {
    ...subtask,
    progress: calculateSubtaskProgress(subtask)
  }
}

/**
 * Update a task's progress when subtasks change
 */
export function updateTaskWithSubtaskProgress(task: Task): Task {
  const updatedSubtasks = task.subtasks?.map(updateSubtaskWithTodoProgress)

  return {
    ...task,
    subtasks: updatedSubtasks,
    progress: calculateTaskProgress({ ...task, subtasks: updatedSubtasks })
  }
}

/**
 * Update a work package's progress when tasks change
 */
export function updateWorkpackageWithTaskProgress(workpackage: Workpackage): Workpackage {
  const updatedTasks = workpackage.tasks.map(updateTaskWithSubtaskProgress)

  return {
    ...workpackage,
    tasks: updatedTasks,
    progress: calculateWorkpackageProgress({ ...workpackage, tasks: updatedTasks })
  }
}

/**
 * Update entire project progress cascade
 * This recalculates all progress from bottom-up:
 * Todos → Subtasks → Tasks → Work Packages → Project
 */
export function updateProjectProgress(project: Project): Project {
  // Update work packages if present
  if (project.workpackages && project.workpackages.length > 0) {
    const updatedWorkpackages = project.workpackages.map(updateWorkpackageWithTaskProgress)

    return {
      ...project,
      workpackages: updatedWorkpackages,
      progress: calculateProjectProgress({ ...project, workpackages: updatedWorkpackages })
    }
  }

  // Legacy: Update tasks directly
  if (project.tasks && project.tasks.length > 0) {
    const updatedTasks = project.tasks.map(updateTaskWithSubtaskProgress)

    return {
      ...project,
      tasks: updatedTasks,
      progress: calculateProjectProgress({ ...project, tasks: updatedTasks })
    }
  }

  return project
}

/**
 * Toggle a todo's completion status and recalculate all progress
 * Returns updated project
 */
export function toggleTodoAndRecalculate(
  project: Project,
  workpackageId: string | null,
  taskId: string,
  subtaskId: string,
  todoId: string
): Project {
  // Helper to toggle todo in subtask
  const toggleTodoInSubtask = (subtask: Subtask): Subtask => {
    if (subtask.id !== subtaskId) return subtask

    const updatedTodos = subtask.todos?.map(todo => {
      if (todo.id !== todoId) return todo

      return {
        ...todo,
        completed: !todo.completed,
        completedAt: !todo.completed ? new Date().toISOString() : undefined,
      }
    })

    return {
      ...subtask,
      todos: updatedTodos
    }
  }

  // Helper to toggle todo in task
  const toggleTodoInTask = (task: Task): Task => {
    if (task.id !== taskId) return task

    const updatedSubtasks = task.subtasks?.map(toggleTodoInSubtask)

    return {
      ...task,
      subtasks: updatedSubtasks
    }
  }

  // Update in work packages structure
  if (workpackageId && project.workpackages) {
    const updatedWorkpackages = project.workpackages.map(wp => {
      if (wp.id !== workpackageId) return wp

      const updatedTasks = wp.tasks.map(toggleTodoInTask)

      return {
        ...wp,
        tasks: updatedTasks
      }
    })

    const projectWithUpdatedData = {
      ...project,
      workpackages: updatedWorkpackages
    }

    // Recalculate all progress
    return updateProjectProgress(projectWithUpdatedData)
  }

  // Legacy: Update in tasks directly
  if (project.tasks) {
    const updatedTasks = project.tasks.map(toggleTodoInTask)

    const projectWithUpdatedData = {
      ...project,
      tasks: updatedTasks
    }

    // Recalculate all progress
    return updateProjectProgress(projectWithUpdatedData)
  }

  return project
}

/**
 * Add a new todo to a subtask and recalculate progress
 */
export function addTodoAndRecalculate(
  project: Project,
  workpackageId: string | null,
  taskId: string,
  subtaskId: string,
  todoText: string
): Project {
  const newTodo = {
    id: `todo-${Date.now()}`,
    text: todoText,
    completed: false,
    createdAt: new Date().toISOString(),
    order: Date.now()
  }

  // Helper to add todo to subtask
  const addTodoToSubtask = (subtask: Subtask): Subtask => {
    if (subtask.id !== subtaskId) return subtask

    return {
      ...subtask,
      todos: [...(subtask.todos || []), newTodo]
    }
  }

  // Helper to add todo to task
  const addTodoToTask = (task: Task): Task => {
    if (task.id !== taskId) return task

    const updatedSubtasks = task.subtasks?.map(addTodoToSubtask)

    return {
      ...task,
      subtasks: updatedSubtasks
    }
  }

  // Update in work packages structure
  if (workpackageId && project.workpackages) {
    const updatedWorkpackages = project.workpackages.map(wp => {
      if (wp.id !== workpackageId) return wp

      const updatedTasks = wp.tasks.map(addTodoToTask)

      return {
        ...wp,
        tasks: updatedTasks
      }
    })

    const projectWithUpdatedData = {
      ...project,
      workpackages: updatedWorkpackages
    }

    return updateProjectProgress(projectWithUpdatedData)
  }

  // Legacy: Update in tasks directly
  if (project.tasks) {
    const updatedTasks = project.tasks.map(addTodoToTask)

    const projectWithUpdatedData = {
      ...project,
      tasks: updatedTasks
    }

    return updateProjectProgress(projectWithUpdatedData)
  }

  return project
}

/**
 * Get completion statistics for a project
 */
export function getProjectStats(project: Project) {
  let totalTodos = 0
  let completedTodos = 0
  let totalSubtasks = 0
  let completedSubtasks = 0
  let totalTasks = 0
  let completedTasks = 0
  let totalWorkpackages = 0
  let completedWorkpackages = 0

  const countInTask = (task: Task) => {
    totalTasks++
    if (task.progress === 100) completedTasks++

    task.subtasks?.forEach(subtask => {
      totalSubtasks++
      if (subtask.progress === 100) completedSubtasks++

      subtask.todos?.forEach(todo => {
        totalTodos++
        if (todo.completed) completedTodos++
      })
    })
  }

  if (project.workpackages) {
    project.workpackages.forEach(wp => {
      totalWorkpackages++
      if (wp.progress === 100) completedWorkpackages++

      wp.tasks.forEach(countInTask)
    })
  } else if (project.tasks) {
    project.tasks.forEach(countInTask)
  }

  return {
    todos: { total: totalTodos, completed: completedTodos },
    subtasks: { total: totalSubtasks, completed: completedSubtasks },
    tasks: { total: totalTasks, completed: completedTasks },
    workpackages: { total: totalWorkpackages, completed: completedWorkpackages },
    overallProgress: project.progress || 0
  }
}
