"use client"

import { useState } from "react"
import { Task, PersonProfile, Subtask } from "@/lib/types"
import { TodoList } from "./TodoList"
import { calculateTaskProgress } from "@/lib/progressCalculation"

interface TaskDetailPanelProps {
  task: Task
  profiles: PersonProfile[]
  onToggleTodo: (subtaskId: string, todoId: string) => void
  onAddTodo: (subtaskId: string, text: string) => void
  onDeleteTodo?: (subtaskId: string, todoId: string) => void
  onAddSubtask?: (name: string) => void
  readOnly?: boolean
}

export function TaskDetailPanel({
  task,
  profiles,
  onToggleTodo,
  onAddTodo,
  onDeleteTodo,
  onAddSubtask,
  readOnly = false
}: TaskDetailPanelProps) {
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set())
  const [newSubtaskName, setNewSubtaskName] = useState("")

  const taskProgress = calculateTaskProgress(task)
  const primaryOwner = profiles.find((p) => p.id === task.primaryOwner)
  const helpers = (task.helpers || [])
    .map((hId) => profiles.find((p) => p.id === hId))
    .filter(Boolean) as PersonProfile[]

  const toggleSubtask = (subtaskId: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev)
      if (next.has(subtaskId)) {
        next.delete(subtaskId)
      } else {
        next.add(subtaskId)
      }
      return next
    })
  }

  const handleAddSubtask = () => {
    if (newSubtaskName.trim() && onAddSubtask) {
      onAddSubtask(newSubtaskName.trim())
      setNewSubtaskName("")
    }
  }

  const getInitials = (profile: PersonProfile) => {
    return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase()
  }

  return (
    <div className="task-detail bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.name}</h2>
            {task.notes && (
              <p className="text-gray-600 text-sm mb-3">{task.notes}</p>
            )}
            {task.status && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium">Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === "done"
                      ? "bg-green-100 text-green-700"
                      : task.status === "in-progress"
                      ? "bg-blue-100 text-blue-700"
                      : task.status === "not-started"
                      ? "bg-gray-100 text-gray-700"
                      : task.status === "blocked"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {task.status.replace("-", " ").toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Owners & Progress */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              {primaryOwner && (
                <div
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm shadow-sm"
                  title={`${primaryOwner.firstName} ${primaryOwner.lastName} (Primary Owner)`}
                >
                  {getInitials(primaryOwner)}
                </div>
              )}
              {helpers.map((helper) => (
                <div
                  key={helper.id}
                  className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center font-medium text-xs shadow-sm"
                  title={`${helper.firstName} ${helper.lastName} (Helper)`}
                >
                  {getInitials(helper)}
                </div>
              ))}
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{taskProgress}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subtasks */}
      <div className="divide-y divide-gray-200">
        {task.subtasks && task.subtasks.length > 0 ? (
          task.subtasks.map((subtask) => {
            const isExpanded = expandedSubtasks.has(subtask.id)

            return (
              <div key={subtask.id} className="subtask-item">
                {/* Subtask Header */}
                <button
                  onClick={() => toggleSubtask(subtask.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{subtask.name}</h3>
                      {subtask.notes && !isExpanded && (
                        <p className="text-sm text-gray-500 truncate">{subtask.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-700">
                        {subtask.progress}%
                      </div>
                      {subtask.todos && subtask.todos.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {subtask.todos.filter((t) => t.completed).length}/
                          {subtask.todos.length} todos
                        </div>
                      )}
                    </div>
                    <div className="w-20">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${subtask.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pl-12">
                    {subtask.notes && (
                      <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded">
                        {subtask.notes}
                      </p>
                    )}
                    <TodoList
                      subtask={subtask}
                      onToggleTodo={(todoId) => onToggleTodo(subtask.id, todoId)}
                      onAddTodo={(text) => onAddTodo(subtask.id, text)}
                      onDeleteTodo={
                        onDeleteTodo ? (todoId) => onDeleteTodo(subtask.id, todoId) : undefined
                      }
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>No subtasks yet.</p>
            {!readOnly && onAddSubtask && (
              <p className="text-sm mt-1">Add one below to get started.</p>
            )}
          </div>
        )}
      </div>

      {/* Add New Subtask */}
      {!readOnly && onAddSubtask && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskName}
              onChange={(e) => setNewSubtaskName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddSubtask()
                }
              }}
              placeholder="Add new subtask..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtaskName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              + Add Subtask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
