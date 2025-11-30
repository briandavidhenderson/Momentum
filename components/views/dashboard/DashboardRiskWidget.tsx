import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, AlertCircle, Clock } from 'lucide-react'
import { Project } from '@/lib/types'
import { DayToDayTask } from '@/lib/dayToDayTypes'
import { differenceInDays, isPast } from 'date-fns'
import Link from 'next/link'

interface DashboardRiskWidgetProps {
    projects: Project[]
    tasks: DayToDayTask[]
    orders: any[] // Using any for now to avoid circular deps, but should be Order[]
}

export function DashboardRiskWidget({ projects, tasks, orders }: DashboardRiskWidgetProps) {
    // Identify At-Risk Projects
    const atRiskProjects = projects.filter(project => {
        // 1. Health Status
        if (project.health === 'at-risk' || project.health === 'warning') return true

        // 2. Overdue Tasks (High Priority)
        const projectTasks = tasks.filter(t => t.linkedProjectId === project.id)
        const hasOverdueHighPriority = projectTasks.some(t =>
            t.status !== 'done' &&
            (t.priority === 'high' || t.priority === 'critical') &&
            t.dueDate &&
            isPast(new Date(t.dueDate))
        )
        if (hasOverdueHighPriority) return true

        return false
    })

    // Identify Overdue Tasks across all projects
    const overdueTasks = tasks.filter(t =>
        t.status !== 'done' &&
        t.dueDate &&
        isPast(new Date(t.dueDate))
    ).sort((a, b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : 0)

    // Identify Blocked Tasks
    const blockedTasks = tasks.filter(t => t.status === 'blocked')

    // Identify Low Stock Orders (Simulated by 'to-order' status for now, or if we had inventory levels)
    // For now, let's just show urgent orders
    const urgentOrders = orders.filter(o => o.priority === 'urgent' && o.status !== 'received')

    if (atRiskProjects.length === 0 && overdueTasks.length === 0 && blockedTasks.length === 0 && urgentOrders.length === 0) {
        return null // Don't show if everything is fine
    }

    return (
        <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-2 py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    Attention Required
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                        {/* Projects at Risk */}
                        {atRiskProjects.length > 0 && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-2">Projects at Risk</h4>
                                {atRiskProjects.map(project => (
                                    <Link key={project.id} href={`/projects/${project.id}/explorer`}>
                                        <div className="p-2 bg-white border border-orange-100 rounded-md hover:shadow-sm transition-shadow cursor-pointer mb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium text-sm truncate">{project.name}</div>
                                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                                    {project.health === 'at-risk' ? 'At Risk' : 'Warning'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {project.description?.substring(0, 60)}...
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Overdue Tasks */}
                        {overdueTasks.length > 0 && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-2 mt-4">Overdue Tasks</h4>
                                {overdueTasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 p-2 bg-white border border-red-100 rounded-md text-sm">
                                        <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-medium">{task.title}</div>
                                            <div className="text-xs text-red-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Due {task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0} days ago
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Blocked Tasks */}
                        {blockedTasks.length > 0 && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-2 mt-4">Blocked Tasks</h4>
                                {blockedTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 p-2 bg-white border border-red-100 rounded-md text-sm">
                                        <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-medium">{task.title}</div>
                                            <div className="text-xs text-red-500">Blocked</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Urgent Orders */}
                        {urgentOrders.length > 0 && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-2 mt-4">Urgent Orders</h4>
                                {urgentOrders.slice(0, 3).map(order => (
                                    <div key={order.id} className="flex items-center gap-2 p-2 bg-white border border-orange-100 rounded-md text-sm">
                                        <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-medium">{order.productName}</div>
                                            <div className="text-xs text-orange-500">Urgent Order</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
