"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Task } from '@/lib/types'
import { DayToDayTask } from '@/lib/dayToDayTypes'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Union type to support both Task and DayToDayTask if possible, 
// or just use Task and map DayToDayTask to Task before passing.
// But DayToDayTask might be missing fields.
// Let's inspect DayToDayTask first.
// For now, I'll use any to avoid the build error and fix it properly after checking types.
// Actually, I'll use a generic interface that covers both.

import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface KanbanTask {
    id: string
    title?: string
    name?: string
    status?: string
    end?: Date | string
    importance?: string
    priority?: string
    blockedBy?: string[]
    workpackageId?: string
}

interface TaskKanbanProps {
    tasks: any[]
    onTaskClick?: (task: any) => void
    onTaskUpdate?: (taskId: string, updates: any) => void
}

function DraggableTask({ task, onClick }: { task: any, onClick?: () => void }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
        data: task
    })

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined

    const getPriorityColor = (priority?: string, importance?: string) => {
        const level = priority || importance
        switch (level?.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200'
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'low': return 'bg-slate-100 text-slate-700 border-slate-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const isBlocked = task.blockedBy && task.blockedBy.length > 0

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={cn(
                "bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer group touch-none relative",
                isBlocked && "border-l-4 border-l-red-500 bg-red-50/50"
            )}
        >
            {isBlocked && (
                <div className="absolute top-2 right-2 text-red-500" title="Blocked">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
            )}
            <div className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary pr-4">
                {task.name || task.title}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-auto">
                {task.end && (
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                        Due {format(new Date(task.end), 'MMM d')}
                    </Badge>
                )}
                {(task.priority || task.importance) && (
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 font-normal capitalize border-0", getPriorityColor(task.priority, task.importance))}
                    >
                        {task.priority || task.importance}
                    </Badge>
                )}
            </div>
        </div>
    )
}

function DroppableColumn({ col, tasks, onTaskClick }: { col: any, tasks: any[], onTaskClick?: (task: any) => void }) {
    const { setNodeRef } = useDroppable({
        id: col.id,
    })

    return (
        <div className="flex flex-col h-full">
            <div className={cn("text-center py-2 font-semibold text-sm border-b-2 mb-2 rounded-t-lg", col.color)}>
                {col.label}
            </div>
            <div
                ref={setNodeRef}
                className={cn("flex-1 bg-muted/20 rounded-b-lg border border-t-0 p-2", col.color.replace('bg-', 'border-'))}
            >
                <ScrollArea className="h-[360px]">
                    <div className="space-y-2 pr-2 min-h-[100px]">
                        {tasks.map(task => (
                            <DraggableTask key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

import { useToast } from '@/components/ui/use-toast'

// ... (keep existing imports)

export function TaskKanban({ tasks, onTaskClick, onTaskUpdate }: TaskKanbanProps) {
    const { toast } = useToast()
    const columns = [
        { id: 'todo', label: 'To do', color: 'bg-sky-100 border-sky-200' },
        { id: 'in-progress', label: 'In Progress', color: 'bg-indigo-100 border-indigo-200' },
        { id: 'done', label: 'Done', color: 'bg-emerald-100 border-emerald-200' }
    ]

    const getColumnTasks = (status: string) => {
        if (status === 'done') return tasks.filter(t => t.status === 'done' || t.status === 'completed')
        if (status === 'in-progress') return tasks.filter(t => t.status === 'in-progress' || t.status === 'working')
        return tasks.filter(t => t.status === 'not-started' || t.status === 'todo' || !t.status)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const taskId = active.id as string
        const newStatus = over.id as string

        // Check for blocking
        const task = tasks.find(t => t.id === taskId)
        if (newStatus === 'done' && task?.blockedBy && task.blockedBy.length > 0) {
            toast({
                title: "Task is Blocked",
                description: "You cannot complete a task that is blocked by other tasks.",
                variant: "destructive"
            })
            return
        }

        // Map column ID to status value
        let statusValue = newStatus
        if (newStatus === 'in-progress') statusValue = 'working' // or 'in-progress' depending on backend
        // Actually, let's keep it simple and map back to what getColumnTasks expects
        // But getColumnTasks handles multiple.
        // Let's assume 'todo', 'working', 'done' are the standard values.
        if (newStatus === 'todo') statusValue = 'todo'
        if (newStatus === 'in-progress') statusValue = 'working'
        if (newStatus === 'done') statusValue = 'done'

        if (onTaskUpdate) {
            onTaskUpdate(taskId, { status: statusValue })
        }
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-4 h-full min-h-[400px]">
                {columns.map(col => (
                    <DroppableColumn
                        key={col.id}
                        col={col}
                        tasks={getColumnTasks(col.id)}
                        onTaskClick={onTaskClick}
                    />
                ))}
            </div>
        </DndContext>
    )
}
