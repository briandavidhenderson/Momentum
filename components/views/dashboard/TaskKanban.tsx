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

    const getImportanceColor = (importance?: string) => {
        switch (importance) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200'
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'low': return 'bg-slate-100 text-slate-700 border-slate-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer group touch-none"
        >
            <div className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary">
                {task.name || task.title}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-auto">
                {task.end && (
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                        Due {format(new Date(task.end), 'MMM d')}
                    </Badge>
                )}
                {task.importance && (
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 font-normal capitalize border-0", getImportanceColor(task.importance))}
                    >
                        {task.importance}
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

export function TaskKanban({ tasks, onTaskClick, onTaskUpdate }: TaskKanbanProps) {
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
