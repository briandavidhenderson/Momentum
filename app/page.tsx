"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { GanttChart } from "@/components/GanttChart"
import { Project, Task, Person, ImportanceLevel, Order, OrderStatus, InventoryItem, InventoryLevel, FUNDING_ACCOUNTS, CATEGORIES, PersonProfile, Deliverable, User, Workpackage, ProfileProject, CalendarEvent, Subtask, EquipmentDevice, LabPoll, ELNExperiment, MasterProject } from "@/lib/types"
import { DayToDayTask } from "@/lib/dayToDayTypes"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUser, getProfileByUserId, getProfile, findUserProfile, updateProfile, deleteProfileProjectCascade, deleteProject as deleteProjectFromFirestore, subscribeToProjects, createProject, createWorkpackage, createDayToDayTask, updateDayToDayTask, deleteDayToDayTask, subscribeToDayToDayTasks, subscribeToLabPolls, createLabPoll, updateLabPoll, deleteLabPoll, subscribeToEquipment, createEquipment, updateEquipment, subscribeToELNExperiments, createELNExperiment, updateELNExperiment, deleteELNExperiment } from "@/lib/firestoreService"
import { PeopleView } from "@/components/PeopleView"
import { ProfileManagement } from "@/components/ProfileManagement"
import { PersonalProfilePage } from "@/components/PersonalProfilePage"
import ViewSwitcher from "@/components/ViewSwitcher"
import { DeliverablesWidget } from "@/components/DeliverablesWidget"
import { AuthPage } from "@/components/AuthPage"
import OnboardingFlow from "@/components/OnboardingFlow"
import { DataClearDialog } from "@/components/DataClearDialog"
import { ProjectCreationDialog } from "@/components/ProjectCreationDialog"
import { UpcomingEventsPanel } from "@/components/UpcomingEventsPanel"
import { EventDialog } from "@/components/EventDialog"
import { DeletionConfirmationDialog } from "@/components/DeletionConfirmationDialog"
import { DayToDayBoard } from "@/components/DayToDayBoard"
import { EquipmentStatusPanel } from "@/components/EquipmentStatusPanel"
import { LabPollPanel } from "@/components/LabPollPanel"
import { ElectronicLabNotebook } from "@/components/ElectronicLabNotebook"
import { TaskDetailPanel } from "@/components/TaskDetailPanel"
import { calculateDeletionImpact, deleteMasterProject, deleteRegularProject, DeletionImpact } from "@/lib/projectDeletion"
import { profiles } from "@/lib/profiles"
import { useProfiles } from "@/lib/useProfiles"
import { personProfilesToPeople, getPersonDisplayName, findPersonProfileById } from "@/lib/personHelpers"
import { Task as GanttTask } from "gantt-task-react"
import { Plus, Users, Trash2, Check, X, GripVertical, Edit, Package, Maximize2, LogOut, ChevronDown, ChevronRight, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  pointerWithin,
} from "@dnd-kit/core"
import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type GanttContextActionPayload = {
  action: "add-child" | "add-dependency" | "mark-complete" | "open-details"
  targetId: string
  targetType: "project" | "workpackage" | "regular-project" | "task" | "subtask" | "deliverable"
}

// Inline Edit Component
function InlineEdit({ 
  value, 
  onSave, 
  className = "",
  inputClassName = ""
}: { 
  value: string
  onSave: (newValue: string) => void
  className?: string
  inputClassName?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim())
    } else {
      setEditValue(value)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />
    )
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value}
    </div>
  )
}

// Draggable Person Component
function DraggablePerson({ person }: { person: Person }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `person-${person.id}`,
    data: { type: "person", person },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 border-2 border-border rounded-xl hover:shadow-md transition-all duration-150 bg-white cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
        style={{ backgroundColor: person.color }}
      >
        {person.name.charAt(0).toUpperCase()}
      </div>
      <span className="font-medium text-foreground">{person.name}</span>
    </div>
  )
}

// Importance Selector Component
function ImportanceSelector({ 
  value, 
  onChange 
}: { 
  value: ImportanceLevel
  onChange: (value: ImportanceLevel) => void
}) {
  const options: { value: ImportanceLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ]

  const colors: Record<ImportanceLevel, string> = {
    low: "gray",
    medium: "blue",
    high: "orange",
    critical: "red",
  }

  const getButtonClasses = (optionValue: ImportanceLevel) => {
    const color = colors[optionValue]
    if (value === optionValue) {
      const bgClasses: Record<string, string> = {
        gray: "bg-gray-600 hover:bg-gray-700",
        blue: "bg-blue-500 hover:bg-blue-600",
        orange: "bg-orange-500 hover:bg-orange-600",
        red: "bg-red-500 hover:bg-red-600",
      }
      return `${bgClasses[color]} text-white shadow-md`
    }
    return "bg-muted text-muted-foreground hover:bg-accent"
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${getButtonClasses(option.value)}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Droppable Task Component
function DroppableTask({ 
  task, 
  projectColor,
  onNameChange,
  onDelete,
  onRemoveAssignee,
  onImportanceChange,
  onNotesChange,
  getPersonName,
  getImportanceBadge,
  assignedPeople
}: { 
  task: Task
  projectColor: string
  onNameChange: (newName: string) => void
  onDelete: () => void
  onRemoveAssignee: (personId: string) => void
  onImportanceChange: (importance: ImportanceLevel) => void
  onNotesChange: (notes: string) => void
  getPersonName: (id?: string) => string
  getImportanceBadge: (importance: ImportanceLevel) => JSX.Element
  assignedPeople: Person[]
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  })

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-lg hover:shadow-sm transition-all duration-150 ${
        isOver ? "bg-blue-500/10 border-2 border-blue-400" : "bg-secondary border-2 border-transparent"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <InlineEdit
              value={task.name}
              onSave={onNameChange}
              className="font-medium text-sm text-foreground inline-block"
              inputClassName="font-medium text-sm h-7"
            />
            {getImportanceBadge(task.importance)}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {new Date(task.start).toLocaleDateString()} - {new Date(task.end).toLocaleDateString()}
            </p>
            {assignedPeople.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {assignedPeople.map((person, index) => {
                  const isPrimary = index === 0 && task.primaryOwner === person.id
                  return (
                    <div 
                      key={person.id} 
                      className="flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 border hover:shadow-sm transition-shadow group"
                      style={{ 
                        background: "hsl(var(--surface-2))",
                        borderColor: isPrimary ? person.color : "hsl(var(--border))",
                        borderWidth: isPrimary ? "2px" : "1px",
                      }}
                      title={isPrimary ? "Primary Owner" : "Helper"}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {person.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveAssignee(person.id)
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-danger" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <span className="text-xs text-muted-foreground">• {task.progress}%</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 p-0 rounded-lg text-danger hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="mt-2 space-y-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Importance</label>
          <ImportanceSelector value={task.importance} onChange={onImportanceChange} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <textarea
            value={task.notes || ""}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes..."
            className="w-full px-2 py-1 text-xs rounded border border-border bg-input text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

// Droppable Project Component  
function DroppableProject({
  project,
  onNameChange,
  onDelete,
  onImportanceChange,
  onNotesChange,
  getPersonName,
  getImportanceBadge,
  onTaskNameChange,
  onTaskDelete,
  onTaskRemoveAssignee,
  onTaskImportanceChange,
  onTaskNotesChange,
  people,
  onAddTask,
  workpackages,
  onAddWorkpackage,
  onAddTaskToWorkpackage,
  onWorkpackageNameChange,
  onToggleProjectExpand,
  onToggleWorkpackageExpand,
  onToggleTaskExpand,
  onUpdateDeliverables,
  onWpTaskNameChange,
  onWpTaskDelete,
  onWpTaskRemoveAssignee,
  onWpTaskImportanceChange,
  onWpTaskNotesChange,
}: {
  project: Project
  onNameChange: (newName: string) => void
  onDelete: () => void
  onImportanceChange: (importance: ImportanceLevel) => void
  onNotesChange: (notes: string) => void
  getPersonName: (id?: string) => string
  getImportanceBadge: (importance: ImportanceLevel) => JSX.Element
  onTaskNameChange: (taskId: string, newName: string) => void
  onTaskDelete: (taskId: string) => void
  onTaskRemoveAssignee: (taskId: string, personId: string) => void
  onTaskImportanceChange: (taskId: string, importance: ImportanceLevel) => void
  onTaskNotesChange: (taskId: string, notes: string) => void
  people: Person[]
  onAddTask: () => void
  workpackages: Workpackage[]
  onAddWorkpackage: () => void
  onAddTaskToWorkpackage: (wpId: string) => void
  onWorkpackageNameChange: (wpId: string, newName: string) => void
  onToggleProjectExpand: (projectId: string) => void
  onToggleWorkpackageExpand: (wpId: string) => void
  onToggleTaskExpand: (taskId: string) => void
  onUpdateDeliverables: (taskId: string, deliverables: Deliverable[]) => void
  onWpTaskNameChange: (wpId: string, taskId: string, name: string) => void
  onWpTaskDelete: (wpId: string, taskId: string) => void
  onWpTaskRemoveAssignee: (wpId: string, taskId: string, personId: string) => void
  onWpTaskImportanceChange: (wpId: string, taskId: string, importance: ImportanceLevel) => void
  onWpTaskNotesChange: (wpId: string, taskId: string, notes: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `project-${project.id}`,
    data: { type: "project", project },
  })

  // Filter workpackages for this project
  const projectWorkpackages = project.profileProjectId
    ? workpackages.filter(w => w.profileProjectId === project.profileProjectId)
    : []
  
  // Get all people involved in this project from workpackages/tasks
  const involvedPeopleIds = new Set<string>()
  
  // For master projects, get people from workpackages
  if (project.profileProjectId) {
    projectWorkpackages.forEach(wp => {
      wp.tasks.forEach(task => {
        if (task.primaryOwner) involvedPeopleIds.add(task.primaryOwner)
        if (task.helpers) task.helpers.forEach(id => involvedPeopleIds.add(id))
      })
    })
  } else if (project.tasks) {
    // For backward compatibility with non-master projects
    project.tasks.forEach((task) => {
      if (task.primaryOwner) involvedPeopleIds.add(task.primaryOwner)
      if (task.helpers) task.helpers.forEach(id => involvedPeopleIds.add(id))
    })
  }
  
  const involvedPeople = Array.from(involvedPeopleIds)
    .map(id => people.find(p => p.id === id))
    .filter((p): p is Person => p !== undefined)

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-border rounded-xl p-6 hover:shadow-md transition-all duration-200 ${
        isOver ? "bg-blue-500/10 border-blue-400" : ""
      }`}
      style={{ 
        borderLeftColor: project.color, 
        borderLeftWidth: "6px",
        background: isOver ? "" : "hsl(var(--surface-2))"
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Expand/Collapse button for project */}
            {(projectWorkpackages.length > 0 || (project.tasks && project.tasks.length > 0)) && (
              <button
                onClick={() => onToggleProjectExpand(project.id)}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
              >
                {project.isExpanded !== false ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            )}
            <InlineEdit
              value={project.name}
              onSave={onNameChange}
              className="h3 text-foreground font-semibold"
              inputClassName="h3 h-9 font-semibold"
            />
            {getImportanceBadge(project.importance)}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {new Date(project.start).toLocaleDateString()} - {new Date(project.end).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm text-muted-foreground">Team:</p>
            {involvedPeople.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {involvedPeople.map((person) => (
                  <div key={person.id} className="flex items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{person.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">No team members</span>
            )}
          </div>

          <div className="space-y-2 mb-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Importance</label>
              <ImportanceSelector value={project.importance} onChange={onImportanceChange} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <textarea
                value={project.notes || ""}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add project notes..."
                className="w-full px-2 py-1 text-xs rounded border border-border bg-input text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={2}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-9 w-9 p-0 rounded-lg text-danger hover:bg-red-50/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Display workpackages for master projects */}
      {project.profileProjectId && project.isExpanded !== false && projectWorkpackages.length > 0 && (
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-border">
          {projectWorkpackages.map((wp) => (
            <div key={wp.id} className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-brand-500">
                {/* Expand/Collapse button for workpackage */}
                {wp.tasks && wp.tasks.length > 0 && (
                  <button
                    onClick={() => onToggleWorkpackageExpand(wp.id)}
                    className="flex items-center justify-center w-5 h-5 rounded hover:bg-accent transition-colors"
                  >
                    {wp.isExpanded !== false ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                <GripVertical className="h-4 w-4" />
                <InlineEdit
                  value={wp.name}
                  onSave={(newName) => onWorkpackageNameChange(wp.id, newName)}
                  className="text-sm"
                  inputClassName="text-sm"
                />
              </div>
              
              {/* Tasks within workpackage */}
              {wp.isExpanded !== false && wp.tasks.length > 0 && (
                <div className="ml-6 space-y-2 border-l-2 border-dashed border-border pl-4">
                  {wp.tasks.map((task) => {
                    const assigneeIds: string[] = []
                    if (task.primaryOwner) assigneeIds.push(task.primaryOwner)
                    if (task.helpers) assigneeIds.push(...task.helpers)
                    
                    const assignedPeople = assigneeIds
                      .map(id => people.find(p => p.id === id))
                      .filter((p): p is Person => p !== undefined)
                    
                    return (
                      <div key={task.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          {/* Expand/Collapse button for task (to show deliverables) */}
                          {task.deliverables && task.deliverables.length > 0 && (
                            <button
                              onClick={() => onToggleTaskExpand(task.id)}
                              className="flex items-center justify-center w-4 h-4 mt-3 rounded hover:bg-accent transition-colors flex-shrink-0"
                            >
                              {task.isExpanded !== false ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          <div className="flex-1">
                            <DroppableTask
                              task={task}
                              projectColor={project.color}
                              onNameChange={(newName) => onWpTaskNameChange(wp.id, task.id, newName)}
                              onDelete={() => onWpTaskDelete(wp.id, task.id)}
                              onRemoveAssignee={(personId) => onWpTaskRemoveAssignee(wp.id, task.id, personId)}
                              onImportanceChange={(importance) => onWpTaskImportanceChange(wp.id, task.id, importance)}
                              onNotesChange={(notes) => onWpTaskNotesChange(wp.id, task.id, notes)}
                              getPersonName={getPersonName}
                              getImportanceBadge={getImportanceBadge}
                              assignedPeople={assignedPeople}
                            />
                          </div>
                        </div>
                        
                        {/* Deliverables within task */}
                        {task.isExpanded !== false && task.deliverables && task.deliverables.length > 0 && (
                          <div className="ml-8 space-y-1 border-l-2 border-dashed border-muted pl-3">
                            {task.deliverables.map((deliverable) => (
                              <div key={deliverable.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground flex-1">
                                  {deliverable.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-border rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full bg-brand-500"
                                      style={{ width: `${deliverable.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                                    {deliverable.progress}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              <Button
                onClick={() => onAddTaskToWorkpackage(wp.id)}
                variant="outline"
                size="sm"
                className="ml-6 w-auto"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Display tasks for non-master projects (backward compatibility) */}
      {!project.profileProjectId && project.isExpanded !== false && project.tasks && project.tasks.length > 0 && (
        <div className="mt-4 space-y-2 pl-6 border-l-2 border-border">
          {project.tasks.map((task) => {
            const assigneeIds: string[] = []
            if (task.primaryOwner) assigneeIds.push(task.primaryOwner)
            if (task.helpers) assigneeIds.push(...task.helpers)
            
            const assignedPeople = assigneeIds
              .map(id => people.find(p => p.id === id))
              .filter((p): p is Person => p !== undefined)
            
            return (
              <div key={task.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  {/* Expand/Collapse button for task (to show deliverables) */}
                  {task.deliverables && task.deliverables.length > 0 && (
                    <button
                      onClick={() => onToggleTaskExpand(task.id)}
                      className="flex items-center justify-center w-4 h-4 mt-3 rounded hover:bg-accent transition-colors flex-shrink-0"
                    >
                      {task.isExpanded !== false ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <DroppableTask
                      task={task}
                      projectColor={project.color}
                      onNameChange={(newName) => onTaskNameChange(task.id, newName)}
                      onDelete={() => onTaskDelete(task.id)}
                      onRemoveAssignee={(personId) => onTaskRemoveAssignee(task.id, personId)}
                      onImportanceChange={(importance) => onTaskImportanceChange(task.id, importance)}
                      onNotesChange={(notes) => onTaskNotesChange(task.id, notes)}
                      getPersonName={getPersonName}
                      getImportanceBadge={getImportanceBadge}
                      assignedPeople={assignedPeople}
                    />
                  </div>
                </div>
                
                {/* Deliverables within task */}
                {task.isExpanded !== false && task.deliverables && task.deliverables.length > 0 && (
                  <div className="ml-8 space-y-1 border-l-2 border-dashed border-muted pl-3">
                    {task.deliverables.map((deliverable) => (
                      <div key={deliverable.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground flex-1">
                          {deliverable.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-border rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-brand-500"
                              style={{ width: `${deliverable.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                            {deliverable.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      
      {/* Add workpackage button (for master projects when expanded) */}
      {project.profileProjectId && project.isExpanded !== false && (
        <Button
          onClick={onAddWorkpackage}
          variant="outline"
          size="sm"
          className="mt-4 w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Workpackage
        </Button>
      )}
      
      {/* Add task button (only for non-master projects when expanded) */}
      {!project.profileProjectId && project.isExpanded !== false && (
        <Button
          onClick={onAddTask}
          variant="outline"
          size="sm"
          className="mt-4 w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      )}
    </div>
  )
}

// Draggable Order Card - Minimal Post-it Style
function DraggableOrder({ 
  order, 
  people,
  onDelete,
  onClick
}: { 
  order: Order
  people: Person[]
  onDelete: () => void
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { type: "order", order },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const orderedByPerson = order.orderedBy ? people.find(p => p.id === order.orderedBy) : null
  const chargeToAccount = FUNDING_ACCOUNTS.find(a => a.id === order.chargeToAccount)

  const bgColor = orderedByPerson 
    ? orderedByPerson.color 
    : order.status === "received" 
      ? "#10b981" 
      : "#fef08a" // Yellow post-it color for to-order

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: bgColor }}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg shadow-md border-2 cursor-grab active:cursor-grabbing transition-all relative group min-h-[100px] ${
        order.status === "received" || orderedByPerson 
          ? "border-transparent" 
          : "border-yellow-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div 
          className="flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <p className={`font-semibold text-sm mb-1 line-clamp-2 ${
            orderedByPerson || order.status === "received" ? "text-white" : "text-gray-900"
          }`}>
            {order.productName || "New Order"}
          </p>
          <p className={`text-xs font-mono mb-1 ${
            orderedByPerson || order.status === "received" ? "text-white/80" : "text-gray-600"
          }`}>
            {order.catNum || "No CAT#"}
          </p>
          {chargeToAccount && (
            <p className={`text-[10px] font-semibold ${
              orderedByPerson || order.status === "received" ? "text-white/90" : "text-gray-700"
            }`}>
              {chargeToAccount.name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className={`h-6 w-6 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
              orderedByPerson || order.status === "received" 
                ? "hover:bg-white/20 text-white" 
                : "hover:bg-gray-200 text-gray-700"
            }`}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={`h-6 w-6 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
              orderedByPerson || order.status === "received" 
                ? "hover:bg-white/20 text-white" 
                : "hover:bg-red-100 text-danger"
            }`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Order Details Dialog
function OrderDialog({
  open,
  order,
  people,
  onClose,
  onSave,
}: {
  open: boolean
  order: Order | undefined
  people: Person[]
  onClose: () => void
  onSave: (order: Order) => void
}) {
  const [editedOrder, setEditedOrder] = useState<Order | undefined>(order)

  useEffect(() => {
    setEditedOrder(order)
  }, [order])

  if (!editedOrder) return null

  const selectedCategory = CATEGORIES.find(c => c.id === editedOrder.category)
  const creator = people.find(p => p.id === editedOrder.createdBy)
  const orderedBy = editedOrder.orderedBy ? people.find(p => p.id === editedOrder.orderedBy) : null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Order Details</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Product Name</label>
            <Input
              value={editedOrder.productName}
              onChange={(e) => setEditedOrder({ ...editedOrder, productName: e.target.value })}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">CAT#</label>
            <Input
              value={editedOrder.catNum}
              onChange={(e) => setEditedOrder({ ...editedOrder, catNum: e.target.value })}
              placeholder="Enter catalog number"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Category</label>
            <select
              value={editedOrder.category || ""}
              onChange={(e) => setEditedOrder({ ...editedOrder, category: e.target.value, subcategory: "" })}
              className="w-full px-3 py-2 rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Category...</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Subcategory</label>
              <select
                value={editedOrder.subcategory || ""}
                onChange={(e) => setEditedOrder({ ...editedOrder, subcategory: e.target.value })}
                className="w-full px-3 py-2 rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select Subcategory...</option>
                {selectedCategory.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Charge To Account</label>
            <select
              value={editedOrder.chargeToAccount || ""}
              onChange={(e) => setEditedOrder({ ...editedOrder, chargeToAccount: e.target.value })}
              className="w-full px-3 py-2 rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Account...</option>
              {FUNDING_ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.accountNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Price (ex VAT)</label>
            <Input
              type="number"
              step="0.01"
              value={editedOrder.priceExVAT || ""}
              onChange={(e) => setEditedOrder({ ...editedOrder, priceExVAT: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            {creator && (
              <p className="text-sm text-muted-foreground">
                Created by: <span className="font-medium text-foreground">{creator.name}</span> on {new Date(editedOrder.createdDate).toLocaleDateString()}
              </p>
            )}
            {orderedBy && editedOrder.orderedDate && (
              <p className="text-sm text-muted-foreground">
                Ordered by: <span className="font-medium text-foreground">{orderedBy.name}</span> on {new Date(editedOrder.orderedDate).toLocaleDateString()}
              </p>
            )}
            {editedOrder.receivedDate && (
              <p className="text-sm text-muted-foreground">
                Received: {new Date(editedOrder.receivedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedOrder)} className="bg-brand-500 hover:bg-brand-600 text-white">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper function to assign colors to profiles
function getColorForProfile(profile: PersonProfile, index: number): string {
  // Assign colors based on lab for consistency
  const labColors: Record<string, string> = {
    "Martinez Lab": "#14b8a6",
    "Rodriguez Lab": "#8b5cf6"
  }
  
  // If lab has assigned color, use variations of it
  if (labColors[profile.lab]) {
    const baseColor = labColors[profile.lab]
    // Create variations for different people in same lab
    const hue = parseInt(baseColor.slice(1, 3), 16)
    const variation = (index % 5) * 15
    return `hsl(${(hue + variation) % 360}, 70%, 60%)`
  }
  
  // Fallback to schemeSet3
  const colors = [
    "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", 
    "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd"
  ]
  return colors[index % colors.length]
}

// Droppable Order Column
function DroppableOrderColumn({
  status,
  title,
  orders,
  people,
  onDeleteOrder,
  onOrderClick,
}: {
  status: OrderStatus
  title: string
  orders: Order[]
  people: Person[]
  onDeleteOrder: (orderId: string) => void
  onOrderClick: (order: Order) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `order-column-${status}`,
    data: { type: "order-column", status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] rounded-xl p-4 transition-all ${
        isOver ? "bg-blue-500/10 border-2 border-blue-400" : "border-2 border-border"
      }`}
      style={{ background: isOver ? undefined : "hsl(var(--surface-2))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge className="bg-muted text-muted-foreground">{orders.length}</Badge>
      </div>
      <div className="space-y-3 min-h-[400px]">
        {orders.map((order) => (
          <DraggableOrder
            key={order.id}
            order={order}
            people={people}
            onDelete={() => onDeleteOrder(order.id)}
            onClick={() => onOrderClick(order)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workpackages, setWorkpackages] = useState<Workpackage[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [activeDragPerson, setActiveDragPerson] = useState<Person | null>(null)
  const [activeDragOrder, setActiveDragOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders')
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | undefined>()
  const [mainView, setMainView] = useState<'projects' | 'people' | 'profiles' | 'myprofile' | 'daytoday' | 'eln'>('myprofile')
  const [deliverablesWidgetTask, setDeliverablesWidgetTask] = useState<Task | null>(null)
  const [taskDetailPanelOpen, setTaskDetailPanelOpen] = useState(false)
  const [taskDetailPanelTask, setTaskDetailPanelTask] = useState<Task | null>(null)
  const [taskDetailPanelWorkpackageId, setTaskDetailPanelWorkpackageId] = useState<string | null>(null)
  const [taskDetailPanelProjectId, setTaskDetailPanelProjectId] = useState<string | null>(null)
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false)
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [deliverablesWidgetPosition, setDeliverablesWidgetPosition] = useState({ x: 0, y: 0 })
  const [dayToDayTasks, setDayToDayTasks] = useState<DayToDayTask[]>([])
  const [equipment, setEquipment] = useState<EquipmentDevice[]>([])
  const [polls, setPolls] = useState<LabPoll[]>([])
  const [elnExperiments, setElnExperiments] = useState<ELNExperiment[]>([])
  const [mounted, setMounted] = useState(false)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null) // For personal pages
  const [currentUser, setCurrentUser] = useState<User | null>(null) // Current authenticated user
  const [currentUserProfile, setCurrentUserProfile] = useState<PersonProfile | null>(null) // Current user's profile
  const [authState, setAuthState] = useState<'auth' | 'setup' | 'app'>('auth') // Auth flow state
  const [showClearDialog, setShowClearDialog] = useState(false) // Data clearing dialog
  const [projectCreationDialogOpen, setProjectCreationDialogOpen] = useState(false) // Project creation dialog
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([])
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  
  const updateTaskEverywhere = (taskId: string, mutator: (task: Task) => Task) => {
    setWorkpackages((prev) =>
      prev.map((wp) => ({
        ...wp,
        tasks: wp.tasks.map((task) => (task.id === taskId ? mutator(task) : task)),
      }))
    )

    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        tasks: project.tasks?.map((task) => (task.id === taskId ? mutator(task) : task)),
      }))
    )
  }

  const updateTaskInWorkpackage = (
    workpackageId: string,
    taskId: string,
    mutator: (task: Task) => Task
  ) => {
    setWorkpackages((prev) =>
      prev.map((wp) =>
        wp.id === workpackageId
          ? { ...wp, tasks: wp.tasks.map((task) => (task.id === taskId ? mutator(task) : task)) }
          : wp
      )
    )

    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        tasks: project.tasks?.map((task) => (task.id === taskId ? mutator(task) : task)),
      }))
    )
  }

  const removeTaskEverywhere = (taskId: string) => {
    setWorkpackages((prev) =>
      prev.map((wp) => ({
        ...wp,
        tasks: wp.tasks.filter((task) => task.id !== taskId),
      }))
    )

    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        tasks: project.tasks?.filter((task) => task.id !== taskId),
      }))
    )
  }

  const removeTaskInWorkpackage = (workpackageId: string, taskId: string) => {
    setWorkpackages((prev) =>
      prev.map((wp) =>
        wp.id === workpackageId
          ? { ...wp, tasks: wp.tasks.filter((task) => task.id !== taskId) }
          : wp
      )
    )

    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        tasks: project.tasks?.filter((task) => task.id !== taskId),
      }))
    )
  }

  const assignPersonToTask = (task: Task, personId: string): Task => {
    if (!task.primaryOwner) {
      return { ...task, primaryOwner: personId }
    }
    if (task.primaryOwner === personId || (task.helpers || []).includes(personId)) {
      return task
    }
    return { ...task, helpers: [...(task.helpers || []), personId] }
  }

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
    isMountedRef.current = true
    
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if component is still mounted before proceeding
        if (!isMountedRef.current) return
        
        setIsLoadingProfile(true)
        try {
          // User is signed in, fetch user data from Firestore
          const userData = await getUser(firebaseUser.uid)
          
          // Check if component unmounted during async operation
          if (!isMountedRef.current) return
          
          if (userData) {
            const user: User = {
              id: userData.uid,
              email: userData.email,
              fullName: userData.fullName,
              passwordHash: "", // Not needed with Firebase Auth
              profileId: userData.profileId,
              createdAt: userData.createdAt ? userData.createdAt.toString() : new Date().toISOString(),
              isAdministrator: userData.isAdministrator,
            }
            setCurrentUser(user)
            
            // Check if user has a profile - if they do, they're a returning user and should skip setup
            console.log("Checking for profile - userData.profileId:", userData.profileId, "userId:", userData.uid)
            
            const profile = await findUserProfile(userData.uid, userData.profileId)
            
            // Check if component unmounted during async operation
            if (!isMountedRef.current) return
            
            if (profile) {
              // User has a profile - they're a returning user, go straight to app
              console.log("Returning user detected - going to app, skipping setup")
              setCurrentUserProfile(profile)
              setCurrentUserProfileId(profile.id)
              setAuthState('app')
            } else {
              // User doesn't have a profile - they need to complete setup
              console.log("New user detected - no profile found, showing setup page")
              setAuthState('setup')
            }
          } else {
            // User document doesn't exist yet (new signup), create temporary user from Firebase Auth
            // Check if they have a profile anyway (edge case)
            if (!isMountedRef.current) return
            const profile = await findUserProfile(firebaseUser.uid, null)
            if (!isMountedRef.current) return
            if (profile) {
              // They have a profile but no user doc - create user doc and go to app
              const user: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
                passwordHash: "",
                profileId: profile.id,
                createdAt: new Date().toISOString(),
                isAdministrator: false,
              }
              setCurrentUser(user)
              setCurrentUserProfile(profile)
              setCurrentUserProfileId(profile.id)
              setAuthState('app')
            } else {
              // No profile - new user needs setup
              const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
                passwordHash: "",
                profileId: null,
                createdAt: new Date().toISOString(),
                isAdministrator: false,
              }
              setCurrentUser(tempUser)
              setAuthState('setup')
            }
          }
        } catch (error) {
          if (!isMountedRef.current) return
          console.error("Error loading user data:", error)
          setIsLoadingProfile(false)
          // On error, check if profile exists first
          try {
            const profile = await findUserProfile(firebaseUser.uid, null)
            if (!isMountedRef.current) return
            if (profile) {
              // They have a profile - go to app
              const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
                passwordHash: "",
                profileId: profile.id,
                createdAt: new Date().toISOString(),
                isAdministrator: false,
              }
              setCurrentUser(tempUser)
              setCurrentUserProfile(profile)
              setCurrentUserProfileId(profile.id)
              setAuthState('app')
            } else {
              // No profile - go to setup
              const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
                passwordHash: "",
                profileId: null,
                createdAt: new Date().toISOString(),
                isAdministrator: false,
              }
              setCurrentUser(tempUser)
              setAuthState('setup')
            }
          } catch (profileError) {
            // If profile check also fails, default to setup
            if (!isMountedRef.current) return
            const tempUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
              passwordHash: "",
              profileId: null,
              createdAt: new Date().toISOString(),
              isAdministrator: false,
            }
            setCurrentUser(tempUser)
            setAuthState('setup')
          }
        } finally {
          if (isMountedRef.current) {
            setIsLoadingProfile(false)
          }
        }
      } else {
        // User is signed out
        if (isMountedRef.current) {
          setCurrentUser(null)
          setCurrentUserProfile(null)
          setCurrentUserProfileId(null)
          setAuthState('auth')
          setIsLoadingProfile(false)
        }
      }
    })
    
    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [])
  
  // Load profiles (including custom ones from localStorage)
  const allProfiles = useProfiles()
  
  // Check profile from static profiles after they load
  // Note: This is for backward compatibility with localStorage profiles
  // This should only run if we're still in setup state and haven't found a profile yet
  // AND we're not currently loading from Firestore
  useEffect(() => {
    // Only check localStorage profiles if:
    // 1. We're in setup state
    // 2. We have a user
    // 3. We don't have a profile yet
    // 4. Profiles are loaded
    // 5. We're not currently loading from Firestore (to prevent race condition)
    if (
      authState === 'setup' && 
      currentUser && 
      !currentUserProfile && 
      allProfiles.length > 0 && 
      !isLoadingProfile &&
      isMountedRef.current
    ) {
      const profile = allProfiles.find(p => p.userId === currentUser.id || p.id === currentUser.profileId)
      if (profile && isMountedRef.current) {
        // User has a profile - they're a returning user, go to app
        console.log("Found profile in localStorage/static profiles:", profile.id)
        setCurrentUserProfile(profile)
        setCurrentUserProfileId(profile.id)
        setAuthState('app')
      }
    }
  }, [allProfiles, currentUser, currentUserProfile, authState, isLoadingProfile])

  // Note: These callbacks are required by AuthPage's interface but authentication
  // and state updates are handled by the onAuthStateChanged listener (line 1182).
  // AuthPage calls these after successful auth, but no additional action is needed here.
  const handleLogin = async (uid: string, email: string, fullName: string) => {
    // Authentication handled by Firebase Auth in AuthPage component
    // State updates handled by onAuthStateChanged listener
    // No additional action required
  }

  const handleSignup = async (uid: string, email: string, fullName: string) => {
    // Authentication and user creation handled by Firebase Auth and Firestore in AuthPage
    // State updates handled by onAuthStateChanged listener
    // No additional action required
  }

  const handleSignOut = async () => {
    try {
      // Sign out from Firebase Auth
      await signOut(auth)
      
      // Clear all local state
      setCurrentUser(null)
      setCurrentUserProfile(null)
      setCurrentUserProfileId(null)
      setAuthState('auth')
      
      // The onAuthStateChanged listener will also handle the state cleanup
      // This ensures a clean logout without conflicts for the next user
    } catch (error) {
      console.error("Sign out error:", error)
      alert("Error signing out. Please try again.")
    }
  }

  const handleProfileSetupComplete = async (profile: PersonProfile) => {
    setCurrentUserProfile(profile)
    setCurrentUserProfileId(profile.id)
    
    // Profile is already saved to Firestore in ProfileSetupPage
    // Just update local state
    if (currentUser) {
      const updatedUser = { ...currentUser, profileId: profile.id }
      setCurrentUser(updatedUser)
    }
    
    setAuthState('app')
    
    // Set current user as the default view
    setCurrentUserProfileId(profile.id)
    
    // Dispatch event to reload profiles
    window.dispatchEvent(new CustomEvent("profiles-updated"))
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Convert PersonProfiles to Person format for UI display
  // Note: Person is UI-only. All ID fields store PersonProfile IDs, not Person IDs.
  const people: Person[] = personProfilesToPeople(allProfiles)
  
  // Debug logging
  useEffect(() => {
    if (allProfiles.length === 0) {
      console.warn("No profiles loaded. Check Firestore subscription and permissions.")
    } else {
      console.log(`Loaded ${allProfiles.length} profiles:`, allProfiles.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, lab: p.lab })))
    }
  }, [allProfiles])

  // Filter projects based on current user and visibility settings
  const visibleProjects = currentUserProfileId
    ? projects.filter((project) => {
        const userProfile = allProfiles.find(p => p.id === currentUserProfileId)
        if (!userProfile) return false
        
        // Find the profile project to check visibility
        let profileProject = null
        if (project.profileProjectId) {
          // Find profile project from any profile that has it
          for (const profile of allProfiles) {
            const proj = profile.projects?.find(p => p.id === project.profileProjectId)
            if (proj) {
              profileProject = proj
              break
            }
          }
        }
        
        // If no profile project found, check manual projects (show if user is involved)
        if (!profileProject) {
          // For manually created projects (not from profiles), show if user is PI or involved in tasks
          if (project.principalInvestigatorId === currentUserProfileId) return true
          const hasTaskInvolvement = project.tasks?.some(task =>
            task.primaryOwner === currentUserProfileId ||
            task.helpers?.includes(currentUserProfileId)
          )
          return hasTaskInvolvement
        }
        
        // Check visibility settings
        const visibility = profileProject.visibility || "lab" // Default to lab visibility
        
        // 1. Private - only the PI
        if (visibility === "private") {
          return project.principalInvestigatorId === currentUserProfileId
        }
        
        // 2. Custom - check visibleTo array
        if (visibility === "custom") {
          const visibleTo = profileProject.visibleTo || []
          return visibleTo.includes(currentUserProfileId) || project.principalInvestigatorId === currentUserProfileId
        }
        
        // 3. User is PI - always show
        if (project.principalInvestigatorId === currentUserProfileId) return true
        
        // 4. Check if user is involved in tasks (always show if involved)
        const hasTaskInvolvement = project.tasks?.some(task => 
          task.primaryOwner === currentUserProfileId || 
          task.helpers?.includes(currentUserProfileId)
        )
        if (hasTaskInvolvement) return true
        
        // 5. Postdocs - show to PI and their postdocs
        if (visibility === "postdocs") {
          if (project.principalInvestigatorId === currentUserProfileId) return true
          // Check if user reports to the PI
          const piProfile = allProfiles.find(p => p.id === project.principalInvestigatorId)
          if (piProfile && userProfile.reportsTo === project.principalInvestigatorId) {
            // Check if user is a postdoc (approximate check)
            const isPostdoc = userProfile.position?.toLowerCase().includes("postdoc") || 
                             userProfile.position?.toLowerCase().includes("post-doc")
            return isPostdoc
          }
          return false
        }
        
        // 6. PI-Researchers - show to PIs and researchers in the lab
        if (visibility === "pi-researchers") {
          const isPI = !userProfile.reportsTo // PIs don't report to anyone
          const isResearcher = userProfile.position?.toLowerCase().includes("research") ||
                              userProfile.position?.toLowerCase().includes("investigator") ||
                              userProfile.position?.toLowerCase().includes("lecturer")
          return isPI || isResearcher
        }
        
        // 7. Lab - show to all in the same lab
        if (visibility === "lab") {
          return userProfile.organisation === (allProfiles.find(p => p.id === project.principalInvestigatorId)?.organisation) &&
                 userProfile.institute === (allProfiles.find(p => p.id === project.principalInvestigatorId)?.institute) &&
                 userProfile.lab === (allProfiles.find(p => p.id === project.principalInvestigatorId)?.lab)
        }
        
        return false
      })
    : projects // Show all projects if no user selected

  const autoEvents = useMemo(() => {
    const generated: CalendarEvent[] = []
    const createdBy = currentUser?.id ?? "system"

    visibleProjects.forEach((project) => {
      const projectEnd = new Date(project.end)
      generated.push({
        id: `auto-project-${project.id}`,
        title: `${project.name} deadline`,
        description: project.notes,
        start: projectEnd,
        end: new Date(projectEnd.getTime() + 60 * 60 * 1000),
        recurrence: undefined,
        attendees: [],
        reminders: [],
        tags: ["project", "deadline"],
        visibility: "lab",
        ownerId: project.principalInvestigatorId,
        relatedIds: { projectId: project.id },
        type: "deadline",
        notes: project.notes,
        createdBy,
        createdAt: new Date(),
      })

      project.tasks?.forEach((task) => {
        const taskEnd = new Date(task.end)
        const attendees = new Set<string>()
        if (task.primaryOwner) attendees.add(task.primaryOwner)
        task.helpers?.forEach((helper) => attendees.add(helper))

        generated.push({
          id: `auto-task-${task.id}`,
          title: task.name,
          description: task.notes,
          start: taskEnd,
          end: new Date(taskEnd.getTime() + 45 * 60 * 1000),
          recurrence: undefined,
          attendees: Array.from(attendees).map((personId) => ({ personId })),
          reminders: [],
          tags: ["task", "deadline"],
          visibility: "lab",
          ownerId: task.primaryOwner,
          relatedIds: { projectId: project.id, taskId: task.id },
          type: "deadline",
          notes: task.notes,
          createdBy,
          createdAt: new Date(),
        })

        task.deliverables?.forEach((deliverable) => {
          if (!deliverable.dueDate) return
          const dueDate = new Date(deliverable.dueDate)
          generated.push({
            id: `auto-deliverable-${deliverable.id}`,
            title: `Deliverable: ${deliverable.name}`,
            description: deliverable.notes,
            start: dueDate,
            end: new Date(dueDate.getTime() + 30 * 60 * 1000),
            recurrence: undefined,
            attendees: deliverable.ownerId ? [{ personId: deliverable.ownerId }] : [],
            reminders: [],
            tags: ["deliverable"],
            visibility: "lab",
            ownerId: deliverable.ownerId,
            relatedIds: { projectId: project.id, taskId: task.id, deliverableId: deliverable.id },
            type: "milestone",
            notes: deliverable.notes,
            createdBy,
            createdAt: new Date(),
          })
        })
      })
    })

    workpackages.forEach((workpackage) => {
      const wpEnd = new Date(workpackage.end)
      generated.push({
        id: `auto-workpackage-${workpackage.id}`,
        title: `Workpackage checkpoint: ${workpackage.name}`,
        description: workpackage.notes,
        start: wpEnd,
        end: new Date(wpEnd.getTime() + 60 * 60 * 1000),
        recurrence: undefined,
        attendees: workpackage.ownerId ? [{ personId: workpackage.ownerId }] : [],
        reminders: [],
        tags: ["workpackage", "checkpoint"],
        visibility: "lab",
        ownerId: workpackage.ownerId,
        relatedIds: { workpackageId: workpackage.id, masterProjectId: workpackage.profileProjectId },
        type: "milestone",
        notes: workpackage.notes,
        createdBy,
        createdAt: new Date(),
      })
    })

    return generated
  }, [visibleProjects, workpackages, currentUser])

  const upcomingEvents = useMemo(() => {
    const manualIds = new Set(manualEvents.map((event) => event.id))
    const manual = manualEvents.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }))
    const auto = autoEvents
      .filter((event) => !manualIds.has(event.id))
      .map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))

    return [...manual, ...auto].sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [manualEvents, autoEvents])

  // Sync ProfileProjects to main Project system
  const syncProjectsFromProfiles = useCallback(() => {
    const syncedProjects: Project[] = []
    const projectIdMap = new Map<string, Project>() // Track by profileProjectId to avoid duplicates

    allProfiles.forEach((profile, profileIndex) => {
      profile.projects?.forEach((profileProject) => {
        // Check if this project already exists (avoid duplicates if multiple people are on same project)
        if (!projectIdMap.has(profileProject.id)) {
          // Generate a color based on the PI or profile
          const piId = profile.principalInvestigatorProjects?.includes(profileProject.id) 
            ? profile.id 
            : allProfiles.find(p => p.principalInvestigatorProjects?.includes(profileProject.id))?.id
          
          const piProfile = piId ? allProfiles.find(p => p.id === piId) : null
          const piIndex = piProfile ? allProfiles.findIndex(p => p.id === piId) : -1
          const piColor = piProfile && piIndex >= 0 ? getColorForProfile(piProfile, piIndex) : null
          
          const colors = [
            "#3b82f6", // blue
            "#10b981", // green
            "#f59e0b", // amber
            "#ef4444", // red
            "#8b5cf6", // violet
            "#ec4899", // pink
            "#06b6d4", // cyan
            "#14b8a6", // teal
            "#f97316", // orange
            "#6366f1", // indigo
          ]
          const colorIndex = profileProject.id.split("-").pop() || "0"
          const randomColor = colors[parseInt(colorIndex) % colors.length]

          const project: Project = {
            id: `sync-${profileProject.id}`,
            name: profileProject.name,
            start: new Date(profileProject.startDate),
            end: new Date(profileProject.endDate),
            progress: profileProject.status === "completed" ? 100 : profileProject.status === "active" ? 50 : 0,
            color: piColor || randomColor,
            importance: "medium",
            notes: profileProject.notes || profileProject.description || "",
            isExpanded: true,
            principalInvestigatorId: piId || undefined,
            profileProjectId: profileProject.id,
            fundedBy: profileProject.fundedBy || [],
            // NO tasks array - workpackages stored separately
          }
          syncedProjects.push(project)
          projectIdMap.set(profileProject.id, project)
        }
      })
    })

    return syncedProjects
  }, [allProfiles])

  // Load from localStorage on mount and sync with profiles
  useEffect(() => {
    const storedProjects = localStorage.getItem("gantt-projects")
    const storedWorkpackages = localStorage.getItem("gantt-workpackages")
    const storedOrders = localStorage.getItem("gantt-orders")
    const storedInventory = localStorage.getItem("gantt-inventory")
    const storedEvents = localStorage.getItem("gantt-events")
    
    let loadedProjects: Project[] = []
    
    if (storedProjects) {
      const parsed = JSON.parse(storedProjects)
      // Convert date strings back to Date objects and filter out synced projects
      loadedProjects = parsed
        .filter((p: any) => !p.profileProjectId) // Don't load synced projects from localStorage
        .map((p: any) => ({
          ...p,
          start: new Date(p.start),
          end: new Date(p.end),
          tasks: p.tasks.map((t: any) => ({
            ...t,
            start: new Date(t.start),
            end: new Date(t.end),
          })),
        }))
    }
    
    if (storedWorkpackages) {
      const parsed = JSON.parse(storedWorkpackages)
      const workpackagesWithDates = parsed.map((wp: any) => ({
        ...wp,
        start: new Date(wp.start),
        end: new Date(wp.end),
        tasks: (wp.tasks || []).map((task: any) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
          deliverables: (task.deliverables || []).map((deliverable: any) => ({ ...deliverable })),
          subtasks: (task.subtasks || []).map((subtask: any) => ({
            ...subtask,
            start: new Date(subtask.start),
            end: new Date(subtask.end),
            deliverables: (subtask.deliverables || []).map((deliverable: any) => ({ ...deliverable })),
          })),
        })),
      }))
      setWorkpackages(workpackagesWithDates)
    }
    
    // Sync projects from profiles
    const syncedProjects = syncProjectsFromProfiles()
    
    // Merge: synced projects + manually created projects
    setProjects([...syncedProjects, ...loadedProjects])

    if (storedOrders) {
      const parsed = JSON.parse(storedOrders)
      const ordersWithDates = parsed.map((o: any) => ({
        ...o,
        createdDate: new Date(o.createdDate),
        orderedDate: o.orderedDate ? new Date(o.orderedDate) : undefined,
        receivedDate: o.receivedDate ? new Date(o.receivedDate) : undefined,
      }))
      setOrders(ordersWithDates)
    }

    if (storedInventory) {
      const parsed = JSON.parse(storedInventory)
      const inventoryWithDates = parsed.map((i: any) => ({
        ...i,
        receivedDate: new Date(i.receivedDate),
        lastOrderedDate: i.lastOrderedDate ? new Date(i.lastOrderedDate) : undefined,
      }))
      setInventory(inventoryWithDates)
    }

    const storedEquipment = localStorage.getItem("gantt-equipment")
    if (storedEquipment) {
      const parsed = JSON.parse(storedEquipment)
      setEquipment(parsed)
    }

    const storedPolls = localStorage.getItem("gantt-polls")
    if (storedPolls) {
      const parsed = JSON.parse(storedPolls)
      setPolls(parsed)
    }

    const storedELN = localStorage.getItem("gantt-eln-experiments")
    if (storedELN) {
      const parsed = JSON.parse(storedELN)
      setElnExperiments(parsed)
    }

    if (storedEvents) {
      const parsed = JSON.parse(storedEvents)
      const eventsWithDates = parsed.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
        updatedAt: event.updatedAt ? new Date(event.updatedAt) : undefined,
      }))
      setManualEvents(eventsWithDates)
    }
  }, [syncProjectsFromProfiles])

  // Sync projects when profiles change
  useEffect(() => {
    const syncedProjects = syncProjectsFromProfiles()
    setProjects(prevProjects => {
      const manualProjects = prevProjects.filter(p => !p.profileProjectId)
      return [...syncedProjects, ...manualProjects]
    })
  }, [syncProjectsFromProfiles]) // Re-sync when profiles change

  // Save to localStorage whenever data changes (only manual projects)
  useEffect(() => {
    const manualProjects = projects.filter(p => !p.profileProjectId)
    if (manualProjects.length > 0 || localStorage.getItem("gantt-projects")) {
      localStorage.setItem("gantt-projects", JSON.stringify(manualProjects))
    }
  }, [projects])

  useEffect(() => {
    if (workpackages.length > 0 || localStorage.getItem("gantt-workpackages")) {
      localStorage.setItem("gantt-workpackages", JSON.stringify(workpackages))
    }
  }, [workpackages])

  useEffect(() => {
    if (orders.length > 0 || localStorage.getItem("gantt-orders")) {
      localStorage.setItem("gantt-orders", JSON.stringify(orders))
    }
  }, [orders])

  useEffect(() => {
    if (inventory.length > 0 || localStorage.getItem("gantt-inventory")) {
      localStorage.setItem("gantt-inventory", JSON.stringify(inventory))
    }
  }, [inventory])

  useEffect(() => {
    if (equipment.length > 0 || localStorage.getItem("gantt-equipment")) {
      localStorage.setItem("gantt-equipment", JSON.stringify(equipment))
    }
  }, [equipment])

  useEffect(() => {
    if (polls.length > 0 || localStorage.getItem("gantt-polls")) {
      localStorage.setItem("gantt-polls", JSON.stringify(polls))
    }
  }, [polls])

  useEffect(() => {
    if (elnExperiments.length > 0 || localStorage.getItem("gantt-eln-experiments")) {
      localStorage.setItem("gantt-eln-experiments", JSON.stringify(elnExperiments))
    }
  }, [elnExperiments])

  useEffect(() => {
    if (manualEvents.length > 0 || localStorage.getItem("gantt-events")) {
      const serialized = manualEvents.map((event) => ({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt ? event.updatedAt.toISOString() : undefined,
      }))
      localStorage.setItem("gantt-events", JSON.stringify(serialized))
    }
  }, [manualEvents])

  // Subscribe to Firestore projects (real-time sync)
  useEffect(() => {
    // Only set up subscriptions if we have a valid user with an ID and are in app state
    // Also wait for profile to be loaded to ensure proper filtering
    if (!currentUser || !currentUser.id || authState !== 'app' || !isMountedRef.current) {
      return
    }

    // Wait for profile to be loaded before setting up subscriptions to avoid filtering issues
    if (!currentUserProfile && isLoadingProfile) {
      return
    }

    console.log("Setting up Firestore subscriptions for user:", currentUser.id)

    let unsubProjects: (() => void) | null = null
    let unsubDayToDayTasks: (() => void) | null = null
    let unsubLabPolls: (() => void) | null = null
    let unsubEquipment: (() => void) | null = null
    let unsubELNExperiments: (() => void) | null = null

    try {
      // Subscribe to regular projects
      unsubProjects = subscribeToProjects(currentUser.id, (firestoreProjects) => {
        if (!isMountedRef.current) return
        
        console.log("Received projects from Firestore:", firestoreProjects.length)
        
        // Filter projects by lab if currentUserProfile is available
        const userLab = currentUserProfile?.lab
        const filteredProjects = userLab
          ? firestoreProjects.filter(p => {
              // Firestore rules handle server-side filtering, but add client-side filtering as backup
              // Projects should have labId set, but filter by creator's lab if not
              const project = p as any
              if (project.labId) {
                return project.labId === userLab
              }
              // If project doesn't have labId yet, only show if created by current user
              return project.createdBy === currentUser.id
            })
          : firestoreProjects
        
        // Convert profile projects from currentUserProfile to Project format
        let profileProjects: Project[] = []
        if (currentUserProfile && currentUserProfile.projects) {
          profileProjects = currentUserProfile.projects.map((pp) => ({
            id: `profile-${pp.id}`,
            name: pp.name,
            kind: "master" as const,
            start: new Date(pp.startDate),
            end: new Date(pp.endDate),
            progress: 0,
            color: "#3b82f6",
            importance: "medium" as ImportanceLevel,
            notes: pp.notes,
            profileProjectId: pp.id,
            principalInvestigatorId: pp.principalInvestigatorId,
            fundedBy: pp.fundedBy,
            status: pp.status === "active" ? "in-progress" : pp.status === "completed" ? "done" : "not-started",
          }))
        }
        
        // Merge Firestore projects with profile projects
        if (isMountedRef.current) {
          setProjects([...filteredProjects, ...profileProjects])
        }
      })

      // Subscribe to day-to-day tasks
      unsubDayToDayTasks = subscribeToDayToDayTasks(currentUser.id, (tasks) => {
        if (!isMountedRef.current) return
        console.log("Received day-to-day tasks from Firestore:", tasks.length)
        setDayToDayTasks(tasks)
      })

      // Subscribe to Lab Polls
      if (currentUserProfile?.lab) {
        unsubLabPolls = subscribeToLabPolls(currentUserProfile.lab, (polls) => {
          if (!isMountedRef.current) return
          console.log("Received lab polls from Firestore:", polls.length)
          setPolls(polls)
        })
      }

      // Subscribe to Equipment
      if (currentUserProfile?.lab) {
        unsubEquipment = subscribeToEquipment(currentUserProfile.lab, (equipment) => {
          if (!isMountedRef.current) return
          console.log("Received equipment from Firestore:", equipment.length)
          setEquipment(equipment)
        })
      }

      // Subscribe to ELN Experiments
      unsubELNExperiments = subscribeToELNExperiments(currentUser.id, (experiments) => {
        if (!isMountedRef.current) return
        console.log("Received ELN experiments from Firestore:", experiments.length)
        setElnExperiments(experiments)
      })
    } catch (error) {
      console.error("Error setting up Firestore subscriptions:", error)
      // Clean up any subscriptions that were created
      if (unsubProjects) unsubProjects()
      if (unsubDayToDayTasks) unsubDayToDayTasks()
      if (unsubLabPolls) unsubLabPolls()
      if (unsubEquipment) unsubEquipment()
      if (unsubELNExperiments) unsubELNExperiments()
    }

    return () => {
      if (unsubProjects) unsubProjects()
      if (unsubDayToDayTasks) unsubDayToDayTasks()
      if (unsubLabPolls) unsubLabPolls()
      if (unsubEquipment) unsubEquipment()
      if (unsubELNExperiments) unsubELNExperiments()
    }
  }, [currentUser, currentUserProfile, authState, isLoadingProfile])

  // Auto-remove received orders after 7 days
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setOrders((prev) =>
        prev.filter((order) => {
          if (order.status === "received" && order.receivedDate) {
            const daysSinceReceived = (now.getTime() - new Date(order.receivedDate).getTime()) / (1000 * 60 * 60 * 24)
            return daysSinceReceived < 7
          }
          return true
        })
      )
    }, 1000 * 60 * 60) // Check every hour

    return () => clearInterval(interval)
  }, [])

  const handleQuickCreateProject = () => {
    setProjectCreationDialogOpen(true)
  }

  const handleCreateRegularProject = async () => {
    if (!currentUser) {
      alert("Please log in first")
      return
    }

    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    // Vibrant, saturated colors that work well in dark mode
    const colors = [
      "#3b82f6", // bright blue
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#14b8a6", // teal
      "#f97316", // orange
      "#6366f1", // indigo
    ]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newProjectData = {
      name: `New Project ${projects.length + 1}`,
      kind: "regular" as const,
      start: today,
      end: nextWeek,
      progress: 0,
      color: randomColor,
      importance: "medium" as ImportanceLevel,
      tasks: [],
      notes: "",
      isExpanded: true,
      createdBy: currentUser.id,
      labId: currentUserProfile?.lab,
    }

    try {
      await createProject(newProjectData as any)
      // Firestore subscription will update state
      setProjectCreationDialogOpen(false)
    } catch (error) {
      console.error("Error creating project:", error)
      alert("Failed to create project. Please try again.")
    }
  }

  const handleCreateMasterProject = async (masterProject: ProfileProject) => {
    if (!currentUserProfileId) {
      alert("Please set up your profile first")
      return
    }

    try {
      // Find current user's profile
      const currentProfile = allProfiles.find(p => p.id === currentUserProfileId)
      if (!currentProfile) {
        alert("Profile not found")
        return
      }

      // Add the master project to the user's profile in Firestore
      const updatedProjects = [...(currentProfile.projects || []), masterProject]
      const updatedPIs = [...(currentProfile.principalInvestigatorProjects || []), masterProject.id]

      await updateProfile(currentUserProfileId, {
        projects: updatedProjects,
        principalInvestigatorProjects: updatedPIs
      })

      // The real-time listener will update allProfiles and trigger syncProjectsFromProfiles
      // No need to manually update state
    } catch (error) {
      console.error("Error creating master project:", error)
      alert("Error creating project. Please try again.")
    }
  }

  const handleAddTask = (projectId: string) => {
    // For backward compatibility with non-master projects
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    
    if (project.profileProjectId) {
      // If it's a master project, add a workpackage instead
      handleAddWorkpackage(projectId)
    } else {
      // For non-master projects, add a task directly
      const taskStart = new Date(project.start)
      const taskEnd = new Date(project.start)
      taskEnd.setDate(taskStart.getDate() + 2)
      
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: `Task ${(project.tasks || []).length + 1}`,
        start: taskStart,
        end: taskEnd,
        progress: 0,
        primaryOwner: undefined,
        helpers: [],
        workpackageId: projectId, // For non-master projects, link directly to project
        importance: "medium",
        notes: "",
        deliverables: [],
        isExpanded: false,
      }
      
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, tasks: [...(p.tasks || []), newTask] }
            : p
        )
      )
    }
  }

  const handleAddWorkpackage = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project || !project.profileProjectId) {
      alert("Can only add workpackages to master projects from profiles")
      return
    }

    if (!currentUser) {
      alert("Please log in first")
      return
    }

    const wpStart = new Date(project.start)
    const wpEnd = new Date(project.start)
    wpEnd.setDate(wpStart.getDate() + 30) // Default 30 days

    const existingWPs = workpackages.filter(w => w.profileProjectId === project.profileProjectId)
    const newWorkpackageData = {
      name: `Workpackage ${existingWPs.length + 1}`,
      profileProjectId: project.profileProjectId,
      start: wpStart,
      end: wpEnd,
      progress: 0,
      importance: "medium" as ImportanceLevel,
      notes: "",
      tasks: [],
      isExpanded: true,
      createdBy: currentUser.id,
    }

    try {
      await createWorkpackage(newWorkpackageData)
      // Firestore subscription will update state
    } catch (error) {
      console.error("Error creating workpackage:", error)
      alert("Failed to create workpackage. Please try again.")
    }
  }

  const handleAddTaskToWorkpackage = (workpackageId: string) => {
    const workpackage = workpackages.find(w => w.id === workpackageId)
    if (!workpackage) return
    
    const taskStart = new Date(workpackage.start)
    const taskEnd = new Date(workpackage.start)
    taskEnd.setDate(taskStart.getDate() + 7) // Default 7 days
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: `Task ${workpackage.tasks.length + 1}`,
      start: taskStart,
      end: taskEnd,
      progress: 0,
      primaryOwner: undefined,
      helpers: [],
      workpackageId: workpackageId,
      importance: "medium",
      notes: "",
      deliverables: [],
      isExpanded: false,
    }
    
    setWorkpackages(prev =>
      prev.map(wp =>
        wp.id === workpackageId
          ? { ...wp, tasks: [...wp.tasks, newTask] }
          : wp
      )
    )
  }

  const handleAddSubtask = (taskId: string) => {
    const now = new Date()
    const subtaskEnd = new Date(now)
    subtaskEnd.setDate(now.getDate() + 3)

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      name: "New Subtask",
      start: now,
      end: subtaskEnd,
      progress: 0,
      status: "not-started",
      notes: "",
      deliverables: [],
      linkedOrderIds: [],
      linkedInventoryItemIds: [],
      isExpanded: true,
    }

    setWorkpackages((prev) =>
      prev.map((wp) => ({
        ...wp,
        tasks: wp.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: [...(task.subtasks || []), newSubtask],
                isExpanded: true,
              }
            : task
        ),
      }))
    )

    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        tasks: project.tasks?.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: [...(task.subtasks || []), newSubtask],
                isExpanded: true,
              }
            : task
        ),
      }))
    )
  }

  // Todo handlers for task management
  const handleToggleTodo = async (
    projectId: string,
    workpackageId: string | null,
    taskId: string,
    subtaskId: string,
    todoId: string
  ) => {
    const { toggleTodoAndRecalculate } = require("@/lib/progressCalculation")
    const { updateWorkpackageWithProgress, updateProjectWithProgress } = require("@/lib/firestoreService")

    if (workpackageId) {
      // Update in workpackages
      setWorkpackages(prev =>
        prev.map(wp => {
          if (wp.id !== workpackageId) return wp
          const updatedTasks = wp.tasks.map(task => {
            if (task.id !== taskId) return task
            const updatedSubtasks = task.subtasks?.map(subtask => {
              if (subtask.id !== subtaskId) return subtask
              const updatedTodos = subtask.todos?.map(todo => {
                if (todo.id !== todoId) return todo
                return {
                  ...todo,
                  completed: !todo.completed,
                  completedAt: !todo.completed ? new Date().toISOString() : undefined,
                  completedBy: !todo.completed ? currentUserProfile?.id : undefined,
                }
              })
              return { ...subtask, todos: updatedTodos }
            })
            return { ...task, subtasks: updatedSubtasks }
          })
          const mockProject = { workpackages: [{ ...wp, tasks: updatedTasks }] }
          const recalculated = toggleTodoAndRecalculate(mockProject, workpackageId, taskId, subtaskId, todoId)
          return recalculated.workpackages![0]
        })
      )

      // Persist to Firestore
      const workpackage = workpackages.find(wp => wp.id === workpackageId)
      if (workpackage) {
        try {
          const mockProject = { workpackages: [workpackage] }
          const recalculated = toggleTodoAndRecalculate(mockProject, workpackageId, taskId, subtaskId, todoId)
          await updateWorkpackageWithProgress(workpackageId, recalculated.workpackages![0])
        } catch (error) {
          console.error("Error updating workpackage with todos:", error)
          alert("Failed to save changes. Please try again.")
        }
      }
    } else {
      // Update in projects (legacy structure)
      let updatedProject: Project | undefined
      setProjects(prev =>
        prev.map(project => {
          if (project.id !== projectId) return project
          updatedProject = toggleTodoAndRecalculate(project, null, taskId, subtaskId, todoId)
          return updatedProject!
        })
      )

      // Persist to Firestore
      if (updatedProject) {
        try {
          await updateProjectWithProgress(projectId, updatedProject)
        } catch (error) {
          console.error("Error updating project with todos:", error)
          alert("Failed to save changes. Please try again.")
        }
      }
    }
  }

  const handleAddTodo = async (
    projectId: string,
    workpackageId: string | null,
    taskId: string,
    subtaskId: string,
    text: string
  ) => {
    const { addTodoAndRecalculate } = require("@/lib/progressCalculation")
    const { updateWorkpackageWithProgress, updateProjectWithProgress } = require("@/lib/firestoreService")

    if (workpackageId) {
      // Update in workpackages
      setWorkpackages(prev =>
        prev.map(wp => {
          if (wp.id !== workpackageId) return wp
          const mockProject = { workpackages: [wp] }
          const recalculated = addTodoAndRecalculate(mockProject, workpackageId, taskId, subtaskId, text)
          return recalculated.workpackages![0]
        })
      )

      // Persist to Firestore
      const workpackage = workpackages.find(wp => wp.id === workpackageId)
      if (workpackage) {
        try {
          const mockProject = { workpackages: [workpackage] }
          const recalculated = addTodoAndRecalculate(mockProject, workpackageId, taskId, subtaskId, text)
          await updateWorkpackageWithProgress(workpackageId, recalculated.workpackages![0])
        } catch (error) {
          console.error("Error adding todo:", error)
          alert("Failed to add todo. Please try again.")
        }
      }
    } else {
      // Update in projects (legacy structure)
      let updatedProject: Project | undefined
      setProjects(prev =>
        prev.map(project => {
          if (project.id !== projectId) return project
          updatedProject = addTodoAndRecalculate(project, null, taskId, subtaskId, text)
          return updatedProject!
        })
      )

      // Persist to Firestore
      if (updatedProject) {
        try {
          await updateProjectWithProgress(projectId, updatedProject)
        } catch (error) {
          console.error("Error adding todo:", error)
          alert("Failed to add todo. Please try again.")
        }
      }
    }
  }

  const handleDeleteTodo = async (
    projectId: string,
    workpackageId: string | null,
    taskId: string,
    subtaskId: string,
    todoId: string
  ) => {
    const { updateProjectProgress } = require("@/lib/progressCalculation")
    const { updateWorkpackageWithProgress, updateProjectWithProgress } = require("@/lib/firestoreService")

    if (workpackageId) {
      // Update in workpackages
      setWorkpackages(prev =>
        prev.map(wp => {
          if (wp.id !== workpackageId) return wp
          const updatedTasks = wp.tasks.map(task => {
            if (task.id !== taskId) return task
            const updatedSubtasks = task.subtasks?.map(subtask => {
              if (subtask.id !== subtaskId) return subtask
              const updatedTodos = subtask.todos?.filter(todo => todo.id !== todoId)
              return { ...subtask, todos: updatedTodos }
            })
            return { ...task, subtasks: updatedSubtasks }
          })
          const mockProject = { workpackages: [{ ...wp, tasks: updatedTasks }] }
          const recalculated = updateProjectProgress(mockProject)
          return recalculated.workpackages![0]
        })
      )

      // Persist to Firestore
      const workpackage = workpackages.find(wp => wp.id === workpackageId)
      if (workpackage) {
        try {
          const updatedTasks = workpackage.tasks.map(task => {
            if (task.id !== taskId) return task
            const updatedSubtasks = task.subtasks?.map(subtask => {
              if (subtask.id !== subtaskId) return subtask
              const updatedTodos = subtask.todos?.filter(todo => todo.id !== todoId)
              return { ...subtask, todos: updatedTodos }
            })
            return { ...task, subtasks: updatedSubtasks }
          })
          const mockProject = { workpackages: [{ ...workpackage, tasks: updatedTasks }] }
          const recalculated = updateProjectProgress(mockProject)
          await updateWorkpackageWithProgress(workpackageId, recalculated.workpackages![0])
        } catch (error) {
          console.error("Error deleting todo:", error)
          alert("Failed to delete todo. Please try again.")
        }
      }
    } else {
      // Update in projects (legacy structure)
      let updatedProject: Project | undefined
      setProjects(prev =>
        prev.map(project => {
          if (project.id !== projectId) return project
          const updatedTasks = project.tasks?.map(task => {
            if (task.id !== taskId) return task
            const updatedSubtasks = task.subtasks?.map(subtask => {
              if (subtask.id !== subtaskId) return subtask
              const updatedTodos = subtask.todos?.filter(todo => todo.id !== todoId)
              return { ...subtask, todos: updatedTodos }
            })
            return { ...task, subtasks: updatedSubtasks }
          })
          updatedProject = updateProjectProgress({ ...project, tasks: updatedTasks })
          return updatedProject!
        })
      )

      // Persist to Firestore
      if (updatedProject) {
        try {
          await updateProjectWithProgress(projectId, updatedProject)
        } catch (error) {
          console.error("Error deleting todo:", error)
          alert("Failed to delete todo. Please try again.")
        }
      }
    }
  }

  const handleWorkpackageNameChange = (workpackageId: string, newName: string) => {
    setWorkpackages(prev =>
      prev.map(wp =>
        wp.id === workpackageId ? { ...wp, name: newName } : wp
      )
    )
  }

  const handleTaskNameChangeInWorkpackage = (workpackageId: string, taskId: string, newName: string) => {
    updateTaskInWorkpackage(workpackageId, taskId, (task) => ({ ...task, name: newName }))
  }

  const handleTaskDeleteFromWorkpackage = (workpackageId: string, taskId: string) => {
    removeTaskInWorkpackage(workpackageId, taskId)
  }

  const handleTaskRemoveAssigneeFromWorkpackage = (workpackageId: string, taskId: string, personId: string) => {
    updateTaskInWorkpackage(workpackageId, taskId, (task) => {
      if (task.primaryOwner === personId) {
        const helpers = task.helpers || []
        return {
          ...task,
          primaryOwner: helpers[0] || undefined,
          helpers: helpers.slice(1),
        }
      }
      const updatedHelpers = (task.helpers || []).filter((id) => id !== personId)
      if (updatedHelpers.length === (task.helpers || []).length) {
        return task
      }
      return { ...task, helpers: updatedHelpers }
    })
  }

  const handleTaskImportanceChangeInWorkpackage = (workpackageId: string, taskId: string, importance: ImportanceLevel) => {
    updateTaskInWorkpackage(workpackageId, taskId, (task) => ({ ...task, importance }))
  }

  const handleTaskNotesChangeInWorkpackage = (workpackageId: string, taskId: string, notes: string) => {
    updateTaskInWorkpackage(workpackageId, taskId, (task) => ({ ...task, notes }))
  }

  const handleProjectNameChange = (projectId: string, newName: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, name: newName } : p
      )
    )
  }

  const handleTaskNameChange = (_projectId: string, taskId: string, newName: string) => {
    updateTaskEverywhere(taskId, (task) => ({ ...task, name: newName }))
  }

  const handleToggleExpand = (id: string, isProject: boolean) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (isProject && p.id === id) {
          return { ...p, isExpanded: !p.isExpanded }
        }
        if (!isProject && p.tasks) {
          return {
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === id ? { ...t, isExpanded: !t.isExpanded } : t
            ),
          }
        }
        return p
      })
    )
  }

  const handleToggleProjectExpand = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p))
    )
  }

  const handleToggleWorkpackageExpand = (wpId: string) => {
    setWorkpackages((prev) =>
      prev.map((wp) => (wp.id === wpId ? { ...wp, isExpanded: !wp.isExpanded } : wp))
    )
  }

  const handleToggleTaskExpand = (taskId: string) => {
    // Toggle task in workpackages
    setWorkpackages((prev) =>
      prev.map((wp) => ({
        ...wp,
        tasks: wp.tasks.map((t) =>
          t.id === taskId ? { ...t, isExpanded: !t.isExpanded } : t
        ),
      }))
    )
    // Also toggle in projects (for standalone tasks)
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: p.tasks?.map((t) =>
          t.id === taskId ? { ...t, isExpanded: !t.isExpanded } : t
        ),
      }))
    )
  }

  const handlePersonDropOnBar = (taskOrProjectId: string, personId: string, isProject: boolean) => {
    if (isProject) {
      let targetProfileProjectId: string | undefined

      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== taskOrProjectId) {
            return project
          }

          targetProfileProjectId = project.profileProjectId

          if (!project.tasks || project.tasks.length === 0) {
            return project
          }

          return {
            ...project,
            tasks: project.tasks.map((task) => assignPersonToTask(task, personId)),
          }
        })
      )

      if (targetProfileProjectId) {
        setWorkpackages((prev) =>
          prev.map((wp) =>
            wp.profileProjectId === targetProfileProjectId
              ? {
                  ...wp,
                  tasks: wp.tasks.map((task) => assignPersonToTask(task, personId)),
                }
              : wp
          )
        )
      }

      return
    }

    updateTaskEverywhere(taskOrProjectId, (task) => assignPersonToTask(task, personId))
  }

  const handleTaskClick = (task: Task) => {
    const rect = document.querySelector('.gantt-container')?.getBoundingClientRect()
    setDeliverablesWidgetPosition({
      x: (rect?.right || window.innerWidth / 2) - 450,
      y: rect?.top || 100,
    })
    setDeliverablesWidgetTask(task)
  }

  const handleUpdateDeliverables = (taskId: string, deliverables: Deliverable[]) => {
    updateTaskEverywhere(taskId, (task) => ({ ...task, deliverables }))
  }

  const handleTaskRemoveAssignee = (_projectId: string, taskId: string, personId: string) => {
    updateTaskEverywhere(taskId, (task) => {
      if (task.primaryOwner === personId) {
        const helpers = task.helpers || []
        return {
          ...task,
          primaryOwner: helpers[0] || undefined,
          helpers: helpers.slice(1),
        }
      }
      const updatedHelpers = (task.helpers || []).filter((id) => id !== personId)
      if (updatedHelpers.length === (task.helpers || []).length) {
        return task
      }
      return { ...task, helpers: updatedHelpers }
    })
  }

  const handleProjectImportanceChange = (projectId: string, importance: ImportanceLevel) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, importance } : p
      )
    )
  }

  const handleProjectNotesChange = (projectId: string, notes: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, notes } : p
      )
    )
  }

  const handleTaskImportanceChange = (_projectId: string, taskId: string, importance: ImportanceLevel) => {
    updateTaskEverywhere(taskId, (task) => ({ ...task, importance }))
  }

  const handleTaskNotesChange = (_projectId: string, taskId: string, notes: string) => {
    updateTaskEverywhere(taskId, (task) => ({ ...task, notes }))
  }

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    // Calculate deletion impact
    const impact = calculateDeletionImpact(project, workpackages)
    
    // Show confirmation dialog
    setDeletionImpact(impact)
    setProjectToDelete(projectId)
    setDeletionDialogOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    const project = projects.find((p) => p.id === projectToDelete)
    if (!project) return

    const isMaster = project.profileProjectId !== undefined || project.kind === "master"

    try {
      if (isMaster) {
        // Delete from Firestore first (ProfileProject)
        if (project.profileProjectId) {
          await deleteProfileProjectCascade(project.profileProjectId)
        }
        
        // Update local state
        const result = deleteMasterProject(projectToDelete, projects, workpackages)
        setProjects(result.projects)
        setWorkpackages(result.workpackages)
      } else {
        // Delete from Firestore first (regular project)
        await deleteProjectFromFirestore(projectToDelete)
        
        // Update local state
        const result = deleteRegularProject(projectToDelete, projects)
        setProjects(result.projects)
      }
      
      // Clear from localStorage cache
      localStorage.removeItem(`project-${projectToDelete}`)
      
    } catch (error) {
      console.error("Error deleting project:", error)
      alert("Failed to delete project. Please try again.")
      return
    }

    // Close dialog and reset state
    setDeletionDialogOpen(false)
    setDeletionImpact(null)
    setProjectToDelete(null)
  }

  const cancelDeleteProject = () => {
    setDeletionDialogOpen(false)
    setDeletionImpact(null)
    setProjectToDelete(null)
  }

  // Day-to-Day Task Handlers
  const handleCreateDayToDayTask = async (task: Omit<DayToDayTask, "id" | "createdAt" | "updatedAt" | "order">) => {
    if (!currentUser) {
      alert("Please sign in to create tasks.")
      return
    }
    
    try {
      const order = dayToDayTasks.length
      await createDayToDayTask({
        ...task,
        createdBy: currentUser.id,
        order,
      })
      // Success - Firestore subscription will update UI
    } catch (error: any) {
      console.error("Error creating day-to-day task:", error)
      const errorMsg = error?.code === 'permission-denied' 
        ? "You don't have permission to create tasks. Please check your account."
        : error?.message?.includes('network') || navigator.onLine === false
        ? "Network error. Please check your connection and try again."
        : "Failed to create task. Please try again."
      alert(errorMsg)
    }
  }

  const handleUpdateDayToDayTask = async (taskId: string, updates: Partial<DayToDayTask>) => {
    try {
      await updateDayToDayTask(taskId, updates)
      // Success - Firestore subscription will update UI
    } catch (error: any) {
      console.error("Error updating day-to-day task:", error)
      const errorMsg = error?.code === 'permission-denied'
        ? "You don't have permission to update this task."
        : error?.message?.includes('network') || navigator.onLine === false
        ? "Network error. Your changes weren't saved. Please check your connection."
        : "Failed to update task. Please try again."
      alert(errorMsg)
    }
  }

  const handleDeleteDayToDayTask = async (taskId: string) => {
    try {
      await deleteDayToDayTask(taskId)
      // Success - Firestore subscription will update UI
    } catch (error: any) {
      console.error("Error deleting day-to-day task:", error)
      const errorMsg = error?.code === 'permission-denied'
        ? "You don't have permission to delete this task."
        : error?.message?.includes('network') || navigator.onLine === false
        ? "Network error. Please check your connection and try again."
        : "Failed to delete task. Please try again."
      alert(errorMsg)
    }
  }

  const handleMoveDayToDayTask = async (taskId: string, newStatus: "todo" | "working" | "done") => {
    try {
      await updateDayToDayTask(taskId, { status: newStatus })
      // Success - Firestore subscription will update UI
    } catch (error: any) {
      console.error("Error moving day-to-day task:", error)
      const errorMsg = error?.code === 'permission-denied'
        ? "You don't have permission to move this task."
        : error?.message?.includes('network') || navigator.onLine === false
        ? "Network error. The task wasn't moved. Please check your connection."
        : "Failed to move task. Please try again."
      alert(errorMsg)
    }
  }

  const handleDeleteTask = (_projectId: string, taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      removeTaskEverywhere(taskId)
    }
  }

  const handleCreateOrder = () => {
    // Try to use current user's profile ID first, then fall back to people array
    let createdById: string | undefined
    
    if (currentUserProfileId) {
      createdById = currentUserProfileId
    } else if (people.length > 0) {
      createdById = people[0].id
    } else {
      alert("Unable to create order: No user profile found. Please ensure you are logged in and have completed your profile setup.")
      console.error("handleCreateOrder: No profile available", {
        currentUserProfileId,
        peopleCount: people.length,
        allProfilesCount: allProfiles.length,
        currentUser: currentUser?.id
      })
      return
    }

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      productName: "",
      catNum: "",
      supplier: "",
      // Temporary placeholders - will be selected during order creation
      accountId: "temp_account_placeholder",
      accountName: "Select Account",
      funderId: "temp_funder_placeholder",
      funderName: "Select Funder",
      masterProjectId: "temp_project_placeholder",
      masterProjectName: "Select Project",
      priceExVAT: 0,
      currency: "GBP",
      status: "to-order",
      orderedBy: createdById,
      createdBy: createdById,
      createdDate: new Date(),
    }
    setEditingOrder(newOrder)
    setOrderDialogOpen(true)
  }

  const handleDeleteOrder = (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    }
  }

  const handleUpdateOrderField = (orderId: string, field: 'productName' | 'catNum', value: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, [field]: value } : o
      )
    )
  }

  const handleUpdateChargeToAccount = (orderId: string, accountId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, chargeToAccount: accountId } : o
      )
    )
  }

  const handleUpdateCategory = (orderId: string, categoryId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, category: categoryId } : o
      )
    )
  }

  const handleUpdateSubcategory = (orderId: string, subcategory: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, subcategory: subcategory } : o
      )
    )
  }

  const handleUpdateOrderPrice = (orderId: string, price: number) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, priceExVAT: price } : o
      )
    )
  }

  const handleOrderClick = (order: Order) => {
    setEditingOrder(order)
    setOrderDialogOpen(true)
  }

  const handleSaveOrder = (updatedOrder: Order) => {
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id)
      if (existingIndex >= 0) {
        // Update existing order
        return prev.map((o) =>
          o.id === updatedOrder.id ? updatedOrder : o
        )
      } else {
        // Add new order
        return [...prev, updatedOrder]
      }
    })
    setOrderDialogOpen(false)
    setEditingOrder(undefined)
  }

  const handleReorder = (item: InventoryItem) => {
    // Create a new order from the inventory item
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      productName: item.productName,
      catNum: item.catNum,
      supplier: "",
      // Use account from inventory item, or placeholder
      accountId: item.chargeToAccount || "temp_account_placeholder",
      accountName: "Select Account",
      funderId: "temp_funder_placeholder",
      funderName: "Select Funder",
      masterProjectId: "temp_project_placeholder",
      masterProjectName: "Select Project",
      priceExVAT: item.priceExVAT || 0,
      currency: "GBP",
      status: "to-order",
      orderedBy: people[0]?.id || "",
      createdBy: people[0]?.id || "",
      createdDate: new Date(),
      category: item.category,
      subcategory: item.subcategory,
      // Legacy field for backward compatibility
      chargeToAccount: item.chargeToAccount,
    }
    setOrders((prev) => [...prev, newOrder])

    // Set inventory level to empty
    setInventory((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, inventoryLevel: "empty" as InventoryLevel, lastOrderedDate: new Date() } : i
      )
    )
  }

  const handleUpdateInventoryLevel = (itemId: string, level: InventoryLevel) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, inventoryLevel: level } : i
      )
    )
  }

  const handleDeleteInventoryItem = (itemId: string) => {
    if (confirm("Are you sure you want to delete this inventory item?")) {
      setInventory((prev) => prev.filter((i) => i.id !== itemId))
    }
  }

  const handleUpdateInventoryNotes = (itemId: string, notes: string) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, notes } : i
      )
    )
  }

  // Utility function to remove duplicate inventory items
  const removeDuplicateInventory = () => {
    setInventory((prev) => {
      const seen = new Map<string, InventoryItem>()
      return prev.filter((item) => {
        const key = `${item.productName}-${item.catNum}`
        if (seen.has(key)) {
          return false // Skip duplicate
        }
        seen.set(key, item)
        return true
      })
    })
  }

  const handleCreateEvent = useCallback(() => {
    setEditingEvent(null)
    setEventDialogOpen(true)
  }, [])

  const handleSaveEvent = useCallback((event: CalendarEvent) => {
    setManualEvents((prev) => {
      const exists = prev.some((current) => current.id === event.id)
      if (exists) {
        return prev.map((current) => (current.id === event.id ? event : current))
      }
      return [...prev, event]
    })
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    })
    setEventDialogOpen(true)
  }, [])

  const handleDeleteEvent = useCallback((eventId: string) => {
    setManualEvents((prev) => prev.filter((event) => event.id !== eventId))
  }, [])

  const handleAssignPersonToEvent = useCallback((eventId: string, person: Person) => {
    setManualEvents((prev) => {
      const index = prev.findIndex((event) => event.id === eventId)
      if (index >= 0) {
        const existing = prev[index]
        if (existing.attendees.some((attendee) => attendee.personId === person.id)) {
          return prev
        }
        const updated: CalendarEvent = {
          ...existing,
          attendees: [...existing.attendees, { personId: person.id }],
          updatedAt: new Date(),
        }
        const clone = [...prev]
        clone[index] = updated
        return clone
      }

      const autoMatch = autoEvents.find((event) => event.id === eventId)
      if (autoMatch) {
        const updated: CalendarEvent = {
          ...autoMatch,
          attendees: [...(autoMatch.attendees || []), { personId: person.id }],
          updatedAt: new Date(),
          createdBy: autoMatch.createdBy || currentUser?.id || "system",
        }
        return [...prev, updated]
      }

      return prev
    })
  }, [autoEvents, currentUser?.id])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === "person") {
      setActiveDragPerson(active.data.current.person)
    } else if (active.data.current?.type === "order") {
      setActiveDragOrder(active.data.current.order)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragPerson(null)
    setActiveDragOrder(null)

    if (!over) return

    // Handle person drag
    const draggedPerson = active.data.current?.person as Person | undefined
    if (draggedPerson) {
       // Dropped on a gantt bar
       if (over.data.current?.type === "gantt-bar") {
         const { id, isProject } = over.data.current
         handlePersonDropOnBar(id, draggedPerson.id, isProject)
         return
       }
 
       // Dropped on a task card
       if (over.data.current?.type === "task") {
        const task = over.data.current.task as Task
        handlePersonDropOnBar(task.id, draggedPerson.id, false)
        return
       }
 
       if (over.data.current?.type === "event") {
         const calendarEvent = over.data.current.event as CalendarEvent
         handleAssignPersonToEvent(calendarEvent.id, draggedPerson)
         return
       }
 
       // Dropped on a project card (add to all tasks as helper)
       if (over.data.current?.type === "project") {
        const project = over.data.current.project as Project
        handlePersonDropOnBar(project.id, draggedPerson.id, true)
        return
       }
       return
    }

    // Handle order drag
    const draggedOrder = active.data.current?.order as Order | undefined
    if (draggedOrder && over.data.current?.type === "order-column") {
      const newStatus = over.data.current.status as OrderStatus
      
      // Check if we need to create inventory item BEFORE updating state
      const shouldCreateInventory = newStatus === "received" && draggedOrder.status !== "received"
      
      // Update order status
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === draggedOrder.id) {
            const updatedOrder = { ...o, status: newStatus }
            
            // When moved to "ordered", assign the first person and set date
            if (newStatus === "ordered" && o.status !== "ordered") {
              updatedOrder.orderedBy = people[0]?.id || o.createdBy
              updatedOrder.orderedDate = new Date()
            }
            
            // When moved to "received", set received date
            if (newStatus === "received" && o.status !== "received") {
              updatedOrder.receivedDate = new Date()
            }
            
            return updatedOrder
          }
          return o
        })
      )
      
      // Create inventory item AFTER order update (prevents duplicates)
      if (shouldCreateInventory) {
        const newInventoryItem: InventoryItem = {
          id: `inventory-${Date.now()}`,
          productName: draggedOrder.productName,
          catNum: draggedOrder.catNum,
          inventoryLevel: "full",
          receivedDate: new Date(),
          chargeToAccount: draggedOrder.chargeToAccount,
          notes: "",
          category: draggedOrder.category,
          subcategory: draggedOrder.subcategory,
          priceExVAT: draggedOrder.priceExVAT,
        }
        
        setInventory((prevInventory) => [...prevInventory, newInventoryItem])
      }
    }
  }

  const handleDateChange = (task: GanttTask) => {
    const newStart = task.start
    const newEnd = task.end

    if (task.type === "project") {
      // Update project dates
      setProjects((prev) =>
        prev.map((p) =>
          p.id === task.id
            ? { ...p, start: newStart, end: newEnd }
            : p
        )
      )
      
      // Also update workpackage dates if this is a master project
      setWorkpackages((prev) =>
        prev.map((wp) =>
          wp.profileProjectId === task.id
            ? { ...wp, start: newStart, end: newEnd }
            : wp
        )
      )
    } else if (task.type === "task") {
      // Update task dates in both projects and workpackages
      updateTaskEverywhere(task.id, (t) => ({ ...t, start: newStart, end: newEnd }))
    } else {
      // Handle other types (workpackage, subtask, etc.)
      // Update projects
      setProjects((prev) =>
        prev.map((p) => (p.tasks ? {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === task.id
              ? { ...t, start: newStart, end: newEnd }
              : t
          ),
        } : p))
      )
      
      // Update workpackages
      setWorkpackages((prev) =>
        prev.map((wp) => ({
          ...wp,
          tasks: wp.tasks.map((t) =>
            t.id === task.id
              ? { ...t, start: newStart, end: newEnd }
              : t
          ),
        }))
      )
    }
  }

  // Get display name for a PersonProfile ID
  // Note: personId parameter is actually a PersonProfile ID, not a Person ID
  const getPersonName = (personProfileId?: string) => {
    if (!personProfileId) return "Unassigned"
    return getPersonDisplayName(allProfiles, personProfileId)
  }

  const getImportanceBadge = (importance: ImportanceLevel) => {
    const variants: Record<ImportanceLevel, { color: string; label: string }> = {
      low: { color: "bg-gray-100 text-gray-700 border-gray-300", label: "Low" },
      medium: { color: "bg-blue-100 text-blue-700 border-blue-300", label: "Medium" },
      high: { color: "bg-orange-100 text-orange-700 border-orange-300", label: "High" },
      critical: { color: "bg-red-100 text-red-700 border-red-300", label: "Critical" },
    }
    const variant = variants[importance]
    return (
      <Badge className={`${variant.color} border font-medium shadow-sm`}>
        {variant.label}
      </Badge>
    )
  }

  const toOrderOrders = orders.filter(o => o.status === "to-order")
  const orderedOrders = orders.filter(o => o.status === "ordered")
  const receivedOrders = orders.filter(o => o.status === "received")

  const getInventoryLevelColor = (level: InventoryLevel) => {
    const colors: Record<InventoryLevel, string> = {
      empty: "bg-red-100 text-red-700 border-red-300",
      low: "bg-orange-100 text-orange-700 border-orange-300",
      medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
      full: "bg-green-100 text-green-700 border-green-300",
    }
    return colors[level]
  }

  // Prevent hydration mismatch - don't render until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="h1 text-foreground mb-2">Momentum Lab Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  // Show auth/setup pages without DndContext wrapper
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="h1 text-foreground mb-2">Momentum Lab Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (authState === 'auth') {
    return (
      <>
        <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
        {/* Data Clear Button - Only show on auth page */}
        <div className="fixed bottom-4 right-4">
          <Button
            variant="outline"
            onClick={() => setShowClearDialog(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-300"
          >
            Clear All Data
          </Button>
        </div>
        <DataClearDialog
          open={showClearDialog}
          onClose={() => setShowClearDialog(false)}
          onConfirm={() => {
            setShowClearDialog(false)
            // Page will reload after clearing
          }}
        />
      </>
    )
  }

  if (authState === 'setup' && currentUser) {
    return <OnboardingFlow user={currentUser} onComplete={handleProfileSetupComplete} />
  }

  const handleGanttContextAction = (payload: GanttContextActionPayload) => {
    switch (payload.action) {
      case "add-child": {
        if (payload.targetType === "project" || payload.targetType === "regular-project") {
          handleAddWorkpackage(payload.targetId)
        } else if (payload.targetType === "workpackage") {
          handleAddTaskToWorkpackage(payload.targetId)
        } else if (payload.targetType === "task") {
          handleAddSubtask(payload.targetId)
        }
        break
      }
      case "mark-complete": {
        if (payload.targetType === "task") {
          setWorkpackages((prev) =>
            prev.map((wp) => ({
              ...wp,
              tasks: wp.tasks.map((task) =>
                task.id === payload.targetId
                  ? { ...task, progress: 100, status: "done" }
                  : task
              ),
            }))
          )
          setProjects((prev) =>
            prev.map((project) => ({
              ...project,
              tasks: project.tasks?.map((task) =>
                task.id === payload.targetId
                  ? { ...task, progress: 100, status: "done" }
                  : task
              ),
            }))
          )
        } else if (payload.targetType === "subtask") {
          setWorkpackages((prev) =>
            prev.map((wp) => ({
              ...wp,
              tasks: wp.tasks.map((task) =>
                task.subtasks
                  ? {
                      ...task,
                      subtasks: task.subtasks.map((subtask) =>
                        subtask.id === payload.targetId
                          ? { ...subtask, progress: 100, status: "done" }
                          : subtask
                      ),
                    }
                  : task
              ),
            }))
          )
          setProjects((prev) =>
            prev.map((project) => ({
              ...project,
              tasks: project.tasks?.map((task) =>
                task.subtasks
                  ? {
                      ...task,
                      subtasks: task.subtasks.map((subtask) =>
                        subtask.id === payload.targetId
                          ? { ...subtask, progress: 100, status: "done" }
                          : subtask
                      ),
                    }
                  : task
              ),
            }))
          )
        } else if (payload.targetType === "deliverable") {
          setWorkpackages((prev) =>
            prev.map((wp) => ({
              ...wp,
              tasks: wp.tasks.map((task) =>
                task.deliverables
                  ? {
                      ...task,
                      deliverables: task.deliverables.map((deliverable) =>
                        deliverable.id === payload.targetId
                          ? { ...deliverable, progress: 100, status: "done" }
                          : deliverable
                      ),
                    }
                  : task
              ),
            }))
          )
          setProjects((prev) =>
            prev.map((project) => ({
              ...project,
              tasks: project.tasks?.map((task) =>
                task.deliverables
                  ? {
                      ...task,
                      deliverables: task.deliverables.map((deliverable) =>
                        deliverable.id === payload.targetId
                          ? { ...deliverable, progress: 100, status: "done" }
                          : deliverable
                      ),
                    }
                  : task
              ),
            }))
          )
        }
        break
      }
      case "open-details": {
        if (payload.targetType === "task") {
          // Find the task and its context (workpackage/project)
          let foundTask: Task | undefined
          let foundWorkpackageId: string | null = null
          let foundProjectId: string | null = null

          // Search in workpackages first
          for (const wp of workpackages) {
            const task = wp.tasks.find((t) => t.id === payload.targetId)
            if (task) {
              foundTask = task
              foundWorkpackageId = wp.id
              // Find the project this workpackage belongs to
              foundProjectId = projects.find(p =>
                p.workpackages?.some(w => w.id === wp.id)
              )?.id || null
              break
            }
          }

          // If not found, search in projects directly (legacy structure)
          if (!foundTask) {
            for (const project of projects) {
              const task = project.tasks?.find((t) => t?.id === payload.targetId)
              if (task) {
                foundTask = task
                foundProjectId = project.id
                break
              }
            }
          }

          if (foundTask) {
            setTaskDetailPanelTask(foundTask)
            setTaskDetailPanelWorkpackageId(foundWorkpackageId)
            setTaskDetailPanelProjectId(foundProjectId)
            setTaskDetailPanelOpen(true)
          }
        }
        break
      }
      case "add-dependency": {
        console.info("Dependency management coming soon", payload)
        break
      }
      default:
        break
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="min-h-screen bg-background p-4 pb-8">
        <div className="max-w-[2000px] mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="h1 text-foreground mb-2">
                  Momentum Lab Management
                </h1>
                <p className="text-base text-muted-foreground">
                  Comprehensive laboratory project and personnel management system
                </p>
              </div>
              
              {/* User Info & Sign Out Button */}
              <div className="flex items-center gap-3">
                {currentUserProfile && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {currentUserProfile.firstName} {currentUserProfile.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentUserProfile.position || currentUser?.email}
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="lg"
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
            
            {/* Main Navigation Tabs */}
            <div className="flex gap-2">
              <Button
                onClick={() => setMainView('projects')}
                variant={mainView === 'projects' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'projects' ? 'bg-brand-500 text-white' : ''}
              >
                Project Timeline
              </Button>
              <Button
                onClick={() => setMainView('people')}
                variant={mainView === 'people' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'people' ? 'bg-brand-500 text-white' : ''}
              >
                <Users className="h-4 w-4 mr-2" />
                People
              </Button>
              <Button
                onClick={() => setMainView('daytoday')}
                variant={mainView === 'daytoday' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'daytoday' ? 'bg-brand-500 text-white' : ''}
              >
                <Check className="h-4 w-4 mr-2" />
                Day to Day
              </Button>
              <Button
                onClick={() => setMainView('eln')}
                variant={mainView === 'eln' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'eln' ? 'bg-brand-500 text-white' : ''}
              >
                <FileText className="h-4 w-4 mr-2" />
                Lab Notebook
              </Button>
              <Button
                onClick={() => setMainView('myprofile')}
                variant={mainView === 'myprofile' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'myprofile' ? 'bg-brand-500 text-white' : ''}
              >
                <Edit className="h-4 w-4 mr-2" />
                My Profile
              </Button>
              {(currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
                <Button
                  onClick={() => setMainView('profiles')}
                  variant={mainView === 'profiles' ? 'default' : 'outline'}
                  size="lg"
                  className={mainView === 'profiles' ? 'bg-brand-500 text-white' : ''}
                >
                  <Users className="h-4 w-4 mr-2" />
                  All Profiles
                </Button>
              )}
            </div>

            {/* Action Buttons - Only show in Projects view */}
            {mainView === 'projects' && (
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                onClick={handleQuickCreateProject}
                className="btn-hover bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-5 py-2 font-medium shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Quick Add Project
              </Button>
            </div>
            )}
          </div>

          {/* Conditional Content Based on Main View */}
          {mainView === 'projects' ? (
            <>
          {/* Lab Polls and Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lab Polls Panel */}
            {currentUserProfile && (
              <LabPollPanel
                polls={polls}
                currentUserProfile={currentUserProfile}
                people={people}
                onCreatePoll={async (newPoll) => {
                  try {
                    const { id, ...pollData } = newPoll
                    await createLabPoll(pollData)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating poll:", error)
                    alert("Failed to create poll. Please try again.")
                  }
                }}
                onRespondToPoll={async (pollId, optionIds) => {
                  try {
                    const poll = polls.find(p => p.id === pollId)
                    if (!poll) return
                    
                    const existingResponseIndex = poll.responses?.findIndex(r => r.userId === currentUserProfile?.id) ?? -1
                    const newResponse = {
                      userId: currentUserProfile?.id || '',
                      selectedOptionIds: optionIds,
                      respondedAt: new Date().toISOString(),
                    }
                    
                    const updatedResponses = poll.responses || []
                    if (existingResponseIndex >= 0) {
                      updatedResponses[existingResponseIndex] = newResponse
                    } else {
                      updatedResponses.push(newResponse)
                    }
                    
                    await updateLabPoll(pollId, { responses: updatedResponses })
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error responding to poll:", error)
                    alert("Failed to update poll response. Please try again.")
                  }
                }}
                onDeletePoll={async (pollId) => {
                  if (confirm("Are you sure you want to delete this poll?")) {
                    try {
                      await deleteLabPoll(pollId)
                      // Firestore subscription will update state
                    } catch (error) {
                      console.error("Error deleting poll:", error)
                      alert("Failed to delete poll. Please try again.")
                    }
                  }
                }}
              />
            )}
            
            {/* Upcoming Events Panel */}
            <UpcomingEventsPanel
              events={upcomingEvents}
              onCreateEvent={handleCreateEvent}
              onSelectEvent={handleSelectEvent}
              getPersonName={getPersonName}
            />
          </div>

          {/* Master Projects View Switcher */}
          {currentUserProfile && (
            <ViewSwitcher
              currentProfile={currentUserProfile}
              onViewChange={(view) => {
                console.log("View changed to:", view)
              }}
            />
          )}

          {/* Top Section: Team Members + Gantt Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            {/* Team Members - From JSON Profiles */}
            <div className="card-monday hidden xl:block">
              <h2 className="text-lg font-bold text-foreground mb-3">Lab Personnel</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Drag to assign to projects & tasks
              </p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {people.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    No team members found.
                  </p>
                ) : (
                  people.map((person) => {
                    const profile = profiles.find(p => p.id === person.id)
                    return (
                      <div key={person.id} className="relative">
                        <DraggablePerson person={person} />
                        {profile && (
                          <div className="mt-1 px-3 text-xs text-muted-foreground">
                            <div className="font-medium truncate">{profile.position}</div>
                            <div className="truncate">{profile.lab}</div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Gantt Chart */}
            <div className="card-monday">
              <GanttChart 
                projects={visibleProjects}
                workpackages={workpackages}
                people={people}
                onDateChange={handleDateChange}
                onTaskClick={handleTaskClick}
                onPersonDropOnBar={handlePersonDropOnBar}
                onToggleExpand={handleToggleExpand}
                onContextAction={handleGanttContextAction}
              />
            </div>
          </div>

          {/* Bottom Section: Projects & Tasks + Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projects List */}
            <div className="card-monday">
              <div className="flex items-center justify-between mb-6">
                <h2 className="h2 text-foreground">
                  Master Projects & Workpackages
                  {currentUserProfileId && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({visibleProjects.length})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Master projects from profiles appear here. Add workpackages to break down work.
                </p>
              </div>
              <div className="space-y-4">
                {visibleProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {currentUserProfileId
                        ? "No projects found for this user. Add projects in Profile Management or assign them to tasks."
                        : "No projects yet. Click the button above to create your first project!"}
                    </p>
                  </div>
                ) : (
                  visibleProjects.map((project) => (
                    <DroppableProject
                      key={project.id}
                      project={project}
                      onNameChange={(newName) => handleProjectNameChange(project.id, newName)}
                      onDelete={() => handleDeleteProject(project.id)}
                      onImportanceChange={(importance) => handleProjectImportanceChange(project.id, importance)}
                      onNotesChange={(notes) => handleProjectNotesChange(project.id, notes)}
                      getPersonName={getPersonName}
                      getImportanceBadge={getImportanceBadge}
                      onTaskNameChange={(taskId, newName) => handleTaskNameChange(project.id, taskId, newName)}
                      onTaskDelete={(taskId) => handleDeleteTask(project.id, taskId)}
                      onTaskRemoveAssignee={(taskId, personId) => handleTaskRemoveAssignee(project.id, taskId, personId)}
                      onTaskImportanceChange={(taskId, importance) => handleTaskImportanceChange(project.id, taskId, importance)}
                      onTaskNotesChange={(taskId, notes) => handleTaskNotesChange(project.id, taskId, notes)}
                      people={people}
                      onAddTask={() => handleAddTask(project.id)}
                      workpackages={workpackages}
                      onAddWorkpackage={() => handleAddWorkpackage(project.id)}
                      onAddTaskToWorkpackage={handleAddTaskToWorkpackage}
                      onWorkpackageNameChange={handleWorkpackageNameChange}
                      onToggleProjectExpand={handleToggleProjectExpand}
                      onToggleWorkpackageExpand={handleToggleWorkpackageExpand}
                      onToggleTaskExpand={handleToggleTaskExpand}
                      onUpdateDeliverables={handleUpdateDeliverables}
                      onWpTaskNameChange={handleTaskNameChangeInWorkpackage}
                      onWpTaskDelete={handleTaskDeleteFromWorkpackage}
                      onWpTaskRemoveAssignee={handleTaskRemoveAssigneeFromWorkpackage}
                      onWpTaskImportanceChange={handleTaskImportanceChangeInWorkpackage}
                      onWpTaskNotesChange={handleTaskNotesChangeInWorkpackage}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Orders & Inventory Panel */}
            <div className="card-monday">
              <div className="flex items-center justify-between mb-6">
                <h2 className="h2 text-foreground">Orders & Inventory</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab('orders')}
                    variant={activeTab === 'orders' ? 'default' : 'outline'}
                    size="sm"
                    className={activeTab === 'orders' ? 'bg-brand-500 text-white' : ''}
                  >
                    Orders
                  </Button>
                  <Button
                    onClick={() => setActiveTab('inventory')}
                    variant={activeTab === 'inventory' ? 'default' : 'outline'}
                    size="sm"
                    className={activeTab === 'inventory' ? 'bg-brand-500 text-white' : ''}
                  >
                    Inventory ({inventory.length})
                  </Button>
                  {activeTab === 'inventory' && inventory.length > 0 && (
                    <Button
                      onClick={removeDuplicateInventory}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      title="Remove duplicate inventory entries"
                    >
                      Clean Duplicates
                    </Button>
                  )}
                  <Button
                    onClick={handleCreateOrder}
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                    size="sm"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </div>
              </div>

              {activeTab === 'orders' ? (
                <>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    <DroppableOrderColumn
                      status="to-order"
                      title="To Order"
                      orders={toOrderOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                    <DroppableOrderColumn
                      status="ordered"
                      title="Ordered"
                      orders={orderedOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                    <DroppableOrderColumn
                      status="received"
                      title="Received"
                      orders={receivedOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Items in &quot;Received&quot; will auto-remove after 7 days and be added to inventory
                  </p>
                </>
              ) : (
                <div className="space-y-6 overflow-x-auto">
                  {inventory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">
                      No inventory items yet. Received orders will appear here automatically.
                    </p>
                  ) : (
                    <>
                      {CATEGORIES.map((category) => {
                        const categoryItems = inventory.filter(item => item.category === category.id)
                        if (categoryItems.length === 0) return null

                        return (
                          <div key={category.id} className="space-y-2">
                            <div className="flex items-center gap-2 sticky top-0 bg-brand-500 text-white py-2 px-3 rounded-lg shadow-sm">
                              <span className="text-xl">{category.emoji}</span>
                              <h3 className="font-bold">{category.name}</h3>
                              <Badge className="ml-auto bg-white text-brand-600">{categoryItems.length}</Badge>
                            </div>
                            
                            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                              <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-border">
                                    <th className="text-left p-2 font-semibold text-foreground">Product Name</th>
                                    <th className="text-left p-2 font-semibold text-foreground hidden md:table-cell">CAT#</th>
                                    <th className="text-left p-2 font-semibold text-foreground min-w-[120px]">Level</th>
                                    <th className="text-left p-2 font-semibold text-foreground hidden lg:table-cell">Account</th>
                                    <th className="text-right p-2 font-semibold text-foreground hidden md:table-cell">Price</th>
                                    <th className="text-center p-2 font-semibold text-foreground">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categoryItems.map((item, idx) => {
                                    const account = FUNDING_ACCOUNTS.find(a => a.id === item.chargeToAccount)
                                    const levelPercentage = {
                                      empty: 0,
                                      low: 25,
                                      medium: 60,
                                      full: 100
                                    }[item.inventoryLevel]
                                    const levelColor = {
                                      empty: "#ef4444",
                                      low: "#f97316",
                                      medium: "#eab308",
                                      full: "#22c55e"
                                    }[item.inventoryLevel]
                                    
                                    return (
                                      <tr key={item.id} className={`border-b border-border hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <td className="p-2">
                                          <div className="font-medium text-foreground">{item.productName}</div>
                                          {item.subcategory && (
                                            <div className="text-xs text-muted-foreground">{item.subcategory}</div>
                                          )}
                                        </td>
                                        <td className="p-2 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.catNum}</td>
                                        <td className="p-2">
                                          <div className="space-y-1">
                                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                              <div
                                                className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                                                style={{ width: `${levelPercentage}%`, backgroundColor: levelColor }}
                                              >
                                                {levelPercentage > 20 && `${levelPercentage}%`}
                                              </div>
                                            </div>
                                            <select
                                              value={item.inventoryLevel}
                                              onChange={(e) => handleUpdateInventoryLevel(item.id, e.target.value as InventoryLevel)}
                                              className="w-full text-xs px-1 py-0.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            >
                                              <option value="empty">Empty</option>
                                              <option value="low">Low</option>
                                              <option value="medium">Medium</option>
                                              <option value="full">Full</option>
                                            </select>
                                          </div>
                                        </td>
                                        <td className="p-2 text-xs text-muted-foreground hidden lg:table-cell">
                                          {account ? `${account.name}` : "-"}
                                        </td>
                                        <td className="p-2 text-right font-semibold text-foreground hidden md:table-cell">
                                          £{item.priceExVAT?.toFixed(2) || "0.00"}
                                        </td>
                                        <td className="p-2 text-center">
                                          <Button
                                            onClick={() => handleReorder(item)}
                                            className="bg-brand-500 hover:bg-brand-600 text-white h-7 px-3"
                                            size="sm"
                                          >
                                            <Package className="h-3 w-3 mr-1" />
                                            Reorder
                                          </Button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Show uncategorized items */}
                      {inventory.filter(item => !item.category).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 sticky top-0 bg-gray-500 text-white py-2 px-3 rounded-lg shadow-sm">
                            <span className="text-xl">📦</span>
                            <h3 className="font-bold">Uncategorized</h3>
                            <Badge className="ml-auto bg-white text-gray-700">{inventory.filter(item => !item.category).length}</Badge>
                          </div>
                          
                          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                            <table className="w-full text-sm min-w-[640px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-border">
                                  <th className="text-left p-2 font-semibold text-foreground">Product Name</th>
                                  <th className="text-left p-2 font-semibold text-foreground hidden md:table-cell">CAT#</th>
                                  <th className="text-left p-2 font-semibold text-foreground min-w-[120px]">Level</th>
                                  <th className="text-left p-2 font-semibold text-foreground hidden lg:table-cell">Account</th>
                                  <th className="text-right p-2 font-semibold text-foreground hidden md:table-cell">Price</th>
                                  <th className="text-center p-2 font-semibold text-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventory.filter(item => !item.category).map((item, idx) => {
                                  const account = FUNDING_ACCOUNTS.find(a => a.id === item.chargeToAccount)
                                  const levelPercentage = {
                                    empty: 0,
                                    low: 25,
                                    medium: 60,
                                    full: 100
                                  }[item.inventoryLevel]
                                  const levelColor = {
                                    empty: "#ef4444",
                                    low: "#f97316",
                                    medium: "#eab308",
                                    full: "#22c55e"
                                  }[item.inventoryLevel]
                                  
                                  return (
                                    <tr key={item.id} className={`border-b border-border hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                      <td className="p-2 font-medium text-foreground">{item.productName}</td>
                                      <td className="p-2 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.catNum}</td>
                                      <td className="p-2">
                                        <div className="space-y-1">
                                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                            <div
                                              className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                                              style={{ width: `${levelPercentage}%`, backgroundColor: levelColor }}
                                            >
                                              {levelPercentage > 20 && `${levelPercentage}%`}
                                            </div>
                                          </div>
                                          <select
                                            value={item.inventoryLevel}
                                            onChange={(e) => handleUpdateInventoryLevel(item.id, e.target.value as InventoryLevel)}
                                            className="w-full text-xs px-1 py-0.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                          >
                                            <option value="empty">Empty</option>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="full">Full</option>
                                          </select>
                                        </div>
                                      </td>
                                      <td className="p-2 text-xs text-muted-foreground hidden lg:table-cell">
                                        {account ? `${account.name}` : "-"}
                                      </td>
                                      <td className="p-2 text-right font-semibold text-foreground hidden md:table-cell">
                                        £{item.priceExVAT?.toFixed(2) || "0.00"}
                                      </td>
                                      <td className="p-2 text-center">
                                        <Button
                                          onClick={() => handleReorder(item)}
                                          className="bg-brand-500 hover:bg-brand-600 text-white h-7 px-3"
                                          size="sm"
                                        >
                                          <Package className="h-3 w-3 mr-1" />
                                          Reorder
                                        </Button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Equipment Status Panel */}
            {currentUserProfile && (
              <EquipmentStatusPanel
                equipment={equipment}
                inventory={inventory}
                orders={orders}
                masterProjects={(currentUserProfile?.projects || []).map(pp => ({
                  id: pp.id,
                  name: pp.name,
                  description: pp.description,
                  labId: currentUserProfile?.lab || '',
                  labName: currentUserProfile?.lab || '',
                  instituteId: currentUserProfile?.institute || '',
                  instituteName: currentUserProfile?.institute || '',
                  organisationId: currentUserProfile?.organisation || '',
                  organisationName: currentUserProfile?.organisation || '',
                  grantName: pp.grantName,
                  grantNumber: pp.grantNumber,
                  totalBudget: pp.budget,
                  currency: "GBP",
                  startDate: pp.startDate,
                  endDate: pp.endDate,
                  funderId: pp.fundedBy?.[0] || '',
                  funderName: '',
                  accountIds: pp.fundedBy || [],
                  principalInvestigatorIds: pp.principalInvestigatorId ? [pp.principalInvestigatorId] : [],
                  coPIIds: [],
                  teamMemberIds: [],
                  teamRoles: {},
                  workpackageIds: [],
                  status: pp.status as any || 'active',
                  progress: 0,
                  visibility: pp.visibility as any || 'lab',
                  tags: pp.tags,
                  notes: pp.notes,
                  createdAt: new Date().toISOString(),
                  createdBy: currentUserProfile?.userId || currentUserProfile?.id || '',
                } as MasterProject))}
                currentUserProfile={currentUserProfile}
                onEquipmentUpdate={async (updatedEquipment) => {
                  try {
                    // Create or update each equipment item in Firestore
                    const promises = updatedEquipment.map(async (eq) => {
                      // Check if this is a new device (not in existing equipment array)
                      const existingDevice = equipment.find(e => e.id === eq.id)

                      if (!existingDevice) {
                        // New device - create it
                        const { id, ...deviceData } = eq
                        await createEquipment(deviceData)
                      } else {
                        // Existing device - update it
                        await updateEquipment(eq.id, eq)
                      }
                    })
                    await Promise.all(promises)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating/updating equipment:", error)
                    alert("Failed to save equipment. Please try again.")
                    // Fallback to local state
                    setEquipment(updatedEquipment)
                  }
                }}
                onInventoryUpdate={setInventory}
                onOrderCreate={(newOrder) => {
                  setOrders([...orders, newOrder])
                }}
                onTaskCreate={async (newTask) => {
                  try {
                    await createDayToDayTask(newTask)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating task:", error)
                    alert("Failed to create task. Please try again.")
                    // Fallback to local state
                    setDayToDayTasks([...dayToDayTasks, newTask])
                  }
                }}
              />
            )}
          </div>
            </>
          ) : mainView === 'people' ? (
            <PeopleView currentUserProfile={currentUserProfile} />
          ) : mainView === 'daytoday' ? (
            <DayToDayBoard
              tasks={dayToDayTasks}
              people={people}
              onCreateTask={handleCreateDayToDayTask}
              onUpdateTask={handleUpdateDayToDayTask}
              onDeleteTask={handleDeleteDayToDayTask}
              onMoveTask={handleMoveDayToDayTask}
            />
          ) : mainView === 'eln' ? (
            <ElectronicLabNotebook
              experiments={elnExperiments}
              currentUserProfile={currentUserProfile}
              onExperimentsUpdate={async (updatedExperiments) => {
                try {
                  // Update each experiment in Firestore
                  const updatePromises = updatedExperiments.map(async (exp) => {
                    if (exp.id && exp.createdBy === currentUser?.id) {
                      await updateELNExperiment(exp.id, exp)
                    } else if (!exp.id && currentUser?.id) {
                      // New experiment - create in Firestore
                      const { id, ...experimentData } = exp
                      await createELNExperiment({
                        ...experimentData,
                        createdBy: currentUser.id,
                        labId: currentUserProfile?.lab || "temp_lab_placeholder",
                        labName: currentUserProfile?.lab || "Unknown Lab",
                        // Temporary placeholders until proper project selection is implemented
                        masterProjectId: "temp_project_placeholder",
                        masterProjectName: "No Project Selected",
                      })
                    }
                  })
                  await Promise.all(updatePromises)
                  // Firestore subscription will update state
                } catch (error) {
                  console.error("Error updating ELN experiments:", error)
                  alert("Failed to save experiment. Please try again.")
                  // Fallback to local state
                  setElnExperiments(updatedExperiments)
                }
              }}
            />
          ) : mainView === 'myprofile' ? (
            <PersonalProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />
          ) : (
            <ProfileManagement currentUser={currentUser} currentUserProfile={currentUserProfile} />
          )}
        </div>

        {/* Dialogs */}
        <OrderDialog
          open={orderDialogOpen}
          order={editingOrder}
          people={people}
          onClose={() => {
            setOrderDialogOpen(false)
            setEditingOrder(undefined)
          }}
          onSave={handleSaveOrder}
        />
        <EventDialog
          open={eventDialogOpen}
          mode={editingEvent ? "edit" : "create"}
          people={people}
          defaultVisibility="lab"
          initialEvent={editingEvent ?? undefined}
          onClose={() => {
            setEventDialogOpen(false)
            setEditingEvent(null)
          }}
          onSubmit={(event) => {
            handleSaveEvent(event)
            setEventDialogOpen(false)
            setEditingEvent(null)
          }}
          onDelete={(eventId) => {
            handleDeleteEvent(eventId)
            setEventDialogOpen(false)
            setEditingEvent(null)
          }}
        />

        <DeletionConfirmationDialog
          open={deletionDialogOpen}
          impact={deletionImpact}
          onConfirm={confirmDeleteProject}
          onCancel={cancelDeleteProject}
        />

        {/* Task Detail Panel Dialog */}
        {taskDetailPanelOpen && taskDetailPanelTask && taskDetailPanelProjectId && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setTaskDetailPanelOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h1 className="text-xl font-bold text-gray-900">Task Details</h1>
                <button
                  onClick={() => setTaskDetailPanelOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <TaskDetailPanel
                  task={taskDetailPanelTask}
                  profiles={allProfiles}
                  onToggleTodo={(subtaskId, todoId) =>
                    handleToggleTodo(
                      taskDetailPanelProjectId,
                      taskDetailPanelWorkpackageId,
                      taskDetailPanelTask.id,
                      subtaskId,
                      todoId
                    )
                  }
                  onAddTodo={(subtaskId, text) =>
                    handleAddTodo(
                      taskDetailPanelProjectId,
                      taskDetailPanelWorkpackageId,
                      taskDetailPanelTask.id,
                      subtaskId,
                      text
                    )
                  }
                  onDeleteTodo={(subtaskId, todoId) =>
                    handleDeleteTodo(
                      taskDetailPanelProjectId,
                      taskDetailPanelWorkpackageId,
                      taskDetailPanelTask.id,
                      subtaskId,
                      todoId
                    )
                  }
                  onAddSubtask={(name) => {
                    handleAddSubtask(taskDetailPanelTask.id)
                    // Note: The subtask name will be "New Subtask" by default
                    // Could enhance handleAddSubtask to accept a name parameter
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <DragOverlay>
        {activeDragPerson && (
          <div className="flex items-center gap-3 p-3 border-2 border-blue-500 rounded-xl shadow-lg" style={{ background: "hsl(var(--surface-2))" }}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: activeDragPerson.color }}
            >
              {activeDragPerson.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-foreground">{activeDragPerson.name}</span>
          </div>
        )}
        {activeDragOrder && (
          <div className="p-3 rounded-lg shadow-lg border-2 border-blue-500 w-64" style={{ background: "hsl(var(--surface-2))" }}>
            <div className="font-medium text-sm text-foreground mb-1">{activeDragOrder.productName || "Unnamed Product"}</div>
            <div className="text-xs text-muted-foreground">{activeDragOrder.catNum || "No CAT#"}</div>
          </div>
        )}
      </DragOverlay>

      {/* Deliverables Widget */}
      {deliverablesWidgetTask && (
        <DeliverablesWidget
          task={deliverablesWidgetTask}
          onUpdate={(deliverables) => handleUpdateDeliverables(deliverablesWidgetTask.id, deliverables)}
          onClose={() => setDeliverablesWidgetTask(null)}
          position={deliverablesWidgetPosition}
        />
      )}

      {/* Project Creation Dialog */}
      <ProjectCreationDialog
        open={projectCreationDialogOpen}
        onClose={() => setProjectCreationDialogOpen(false)}
        onCreateRegular={handleCreateRegularProject}
        onCreateMaster={handleCreateMasterProject}
        currentUserProfileId={currentUserProfileId}
        currentUserId={currentUser?.id || ""}
        organisationId={currentUserProfile?.organisation}
      />
    </DndContext>
  )
}
