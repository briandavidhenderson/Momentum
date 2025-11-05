"use client"

import { useState } from "react"
import { Subtask, Todo } from "@/lib/types"
import { calculateSubtaskProgress } from "@/lib/progressCalculation"

interface TodoListProps {
  subtask: Subtask
  onToggleTodo: (todoId: string) => void
  onAddTodo: (text: string) => void
  onDeleteTodo?: (todoId: string) => void
  readOnly?: boolean
}

export function TodoList({
  subtask,
  onToggleTodo,
  onAddTodo,
  onDeleteTodo,
  readOnly = false
}: TodoListProps) {
  const [newTodoText, setNewTodoText] = useState("")

  const todos = subtask.todos || []
  const progress = calculateSubtaskProgress(subtask)
  const completedCount = todos.filter(t => t.completed).length
  const totalCount = todos.length

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim())
      setNewTodoText("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAddTodo()
    }
  }

  return (
    <div className="todo-list bg-gray-50 rounded-lg p-4 space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700">
            Progress: {progress}%
          </span>
          <span className="text-gray-500">
            {completedCount}/{totalCount} complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Todo List */}
      {todos.length > 0 ? (
        <ul className="space-y-2">
          {todos
            .sort((a, b) => a.order - b.order)
            .map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-2 group hover:bg-white rounded px-2 py-1.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <span
                  className={`flex-1 text-sm ${
                    todo.completed
                      ? "line-through text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {todo.text}
                </span>
                {!readOnly && onDeleteTodo && (
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity text-sm font-medium px-2"
                    aria-label="Delete todo"
                  >
                    ×
                  </button>
                )}
                {todo.completed && todo.completedAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(todo.completedAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic text-center py-2">
          No todos yet. Add one below to get started.
        </p>
      )}

      {/* Add New Todo */}
      {!readOnly && (
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add new todo..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddTodo}
            disabled={!newTodoText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
