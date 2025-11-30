"use client"

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar as CalendarIcon, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { useAppContext } from '@/lib/AppContext'
import { Task, CalendarEvent, EquipmentBooking as Booking, ELNExperiment as Experiment } from '@/lib/types'

export default function DailyAgendaView() {
    const [viewMode, setViewMode] = React.useState<'my' | 'team'>('my')
    const {
        dayToDayTasks,
        events,
        bookings, // Use full bookings list
        elnExperiments,
        currentUserProfile,
        people // Use people list for avatars
    } = useAppContext()

    // Filter for Today's Items
    const todayItems = useMemo(() => {
        const today = new Date()

        // Tasks due today or overdue
        const tasks = dayToDayTasks.filter(task => {
            if (task.status === 'done') return false

            // Filter by assignee based on view mode
            if (viewMode === 'my') {
                if (!task.assigneeIds?.includes(currentUserProfile?.id || '')) return false
            }
            // In team mode, show all tasks for the lab (already filtered by hook)

            if (!task.dueDate) return false
            const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)
            return isToday(dueDate) || dueDate < today
        }).map(t => ({ ...t, type: 'task' as const }))

        // Events today
        const todaysEvents = events.filter(event => {
            const start = new Date(event.start)
            return isToday(start)
        }).map(e => ({ ...e, type: 'event' as const }))

        // Bookings today
        const todaysBookings = bookings.filter(booking => {
            const start = new Date(booking.startTime)
            return isToday(start)
        }).filter(booking => {
            if (viewMode === 'my') {
                return booking.bookedBy === currentUserProfile?.id
            }
            return true
        }).map(b => ({ ...b, type: 'booking' as const }))

        // Experiments (active)
        const activeExperiments = elnExperiments.filter(exp =>
            exp.status === 'in-progress'
        ).filter(exp => {
            if (viewMode === 'my') {
                return exp.createdBy === currentUserProfile?.id
            }
            return true
        }).map(e => ({ ...e, type: 'experiment' as const }))

        // Combine and sort by time/priority
        return [
            ...tasks,
            ...todaysEvents,
            ...todaysBookings,
            ...activeExperiments
        ].sort((a, b) => {
            // Simple sort logic: Events/Bookings by time, Tasks by priority (mock), Experiments last
            const getTime = (item: any) => {
                if (item.type === 'event') return new Date(item.start).getTime()
                if (item.type === 'booking') return new Date(item.startTime).getTime()
                if (item.type === 'task') return new Date(item.dueDate).getTime()
                return 0
            }
            return getTime(a) - getTime(b)
        })
    }, [dayToDayTasks, events, bookings, elnExperiments, currentUserProfile, viewMode])

    const getIcon = (type: string) => {
        switch (type) {
            case 'task': return <CheckSquare className="h-4 w-4 text-blue-500" />
            case 'event': return <CalendarIcon className="h-4 w-4 text-purple-500" />
            case 'booking': return <Clock className="h-4 w-4 text-orange-500" />
            case 'experiment': return <AlertCircle className="h-4 w-4 text-emerald-500" />
            default: return <AlertCircle className="h-4 w-4" />
        }
    }

    const getTimeLabel = (item: any) => {
        if (item.type === 'event') return format(new Date(item.start), 'HH:mm')
        if (item.type === 'booking') return `${format(new Date(item.startTime), 'HH:mm')} - ${format(new Date(item.endTime), 'HH:mm')}`
        if (item.type === 'task') return 'Due ' + format(new Date(item.dueDate), 'HH:mm')
        return 'All Day'
    }

    const getOwnerName = (item: any) => {
        if (viewMode === 'my') return null

        let userId = ''
        if (item.type === 'task') userId = item.assigneeIds?.[0]
        if (item.type === 'booking') userId = item.bookedBy
        if (item.type === 'experiment') userId = item.createdBy

        if (!userId) return null
        const person = people.find(p => p.id === userId)
        return person ? person.name : 'Unknown'
    }

    return (
        <Card className="h-full flex flex-col border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2 py-3 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-indigo-600" />
                        {viewMode === 'my' ? 'My Daily Agenda' : 'Team Agenda'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(), 'EEEE, MMMM do')}
                    </p>
                </div>
                <div className="flex bg-muted rounded-lg p-0.5">
                    <button
                        onClick={() => setViewMode('my')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'my' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        My View
                    </button>
                    <button
                        onClick={() => setViewMode('team')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'team' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Team View
                    </button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="divide-y">
                        {todayItems.length > 0 ? (
                            todayItems.map((item: any, index) => (
                                <div key={`${item.type}-${item.id}`} className="p-3 hover:bg-accent/50 transition-colors flex gap-3 items-start">
                                    <div className="mt-1">{getIcon(item.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-medium text-sm truncate">
                                                {item.title || item.equipmentName || item.productName || 'Untitled'}
                                            </div>
                                            {viewMode === 'team' && getOwnerName(item) && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                                    {getOwnerName(item)}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm">
                                                {item.type.toUpperCase()}
                                            </Badge>
                                            <span>{getTimeLabel(item)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No items scheduled for today.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
