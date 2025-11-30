"use client"

import React, { useMemo, useState } from 'react'
import { useAppContext } from '@/lib/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Activity,
    Calendar as CalendarIcon,
    BrainCircuit,
    FlaskConical,
    Layout,
    Package,
    Presentation,
    Users,
    Wrench,
    ChevronDown,
    BarChart3,
    ShieldAlert,
    ChevronLeft,
    TestTube
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { DashboardTile } from './DashboardTile'
import { TodayOverview } from './TodayOverview'
import { TaskKanban } from './TaskKanban'
import DailyAgendaView from '@/components/DailyAgendaView'
import { ProtocolBenchMode } from '@/components/ProtocolBenchMode'
import { ProjectExplorerView } from '@/components/projects/ProjectExplorerView'
import { Task } from '@/lib/types'

import { TaskDetailsPanel } from '@/components/projects/TaskDetailsPanel'
import { subscribeToLabActiveExecutions } from '@/lib/services/protocolExecutionService'
import { ProtocolExecution } from '@/lib/types'
import { DashboardRiskWidget } from './DashboardRiskWidget'
import { MyWeeklyDigest } from './MyWeeklyDigest'
import { Sample } from '@/lib/types/sample.types'
import { LabPulseWidget } from '@/components/dashboard/LabPulseWidget'

export function HomeDashboard() {
    const {
        // Projects
        projects,
        workpackages: allWorkpackages,

        // Tasks
        dayToDayTasks,

        // Lab
        orders,
        equipment,

        // People
        allProfiles,

        // ELN & Whiteboards
        elnExperiments,
        whiteboards,

        // Other
        events,
        userBookings,
        currentUserProfile,
        mainView,
        setMainView,

        // Actions
        handleUpdateWorkpackage
    } = useAppContext()

    const researchBoards = whiteboards
        .map(board => {
            const owner = allProfiles.find(profile => profile.id === board.createdBy)
            const updatedAt = board.updatedAt?.toDate
                ? (board.updatedAt?.toDate ? board.updatedAt.toDate() : new Date(board.updatedAt || Date.now()))
                : board.updatedAt instanceof Date
                    ? board.updatedAt
                    : board.createdAt?.toDate
                        ? (board.createdAt?.toDate ? board.createdAt.toDate() : new Date(board.createdAt || Date.now()))
                        : board.createdAt instanceof Date
                            ? board.createdAt
                            : new Date()

            return {
                ...board,
                ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown owner',
                status: (board.shapes?.length || 0) > 8 ? 'Active' : (board.shapes?.length || 0) > 0 ? 'Draft' : 'New',
                updatedAt
            }
        })
        .sort((a, b) => (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0))

    // State for selected project & task
    const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [activeExecutions, setActiveExecutions] = useState<ProtocolExecution[]>([])

    // Sample Management State
    const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
    const [sampleViewMode, setSampleViewMode] = useState<'list' | 'detail' | 'storage'>('list')

    React.useEffect(() => {
        if (!currentUserProfile?.labId) return
        const unsubscribe = subscribeToLabActiveExecutions(currentUserProfile.labId, (executions) => {
            setActiveExecutions(executions)
        })
        return () => unsubscribe()
    }, [currentUserProfile?.labId])


    const labProfiles = useMemo(() => {
        const profiles = allProfiles || []
        if (!currentUserProfile?.labId) return profiles.slice(0, 5)
        return profiles.filter(p => p.labId === currentUserProfile.labId).slice(0, 5)
    }, [allProfiles, currentUserProfile?.labId])

    const getMemberTasks = (profileId: string) =>
        dayToDayTasks.filter(task => {
            const assignees = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : []
            return assignees.includes(profileId) && task.status !== 'done'
        })

    const getPresenceStatus = (profileId: string) => {
        const activeExecution = activeExecutions.find(e => e.performedBy === profileId)
        if (activeExecution) {
            return {
                label: `Running ${activeExecution.protocolTitle} (Step ${activeExecution.currentStepIndex + 1})`,
                className: 'bg-green-100 text-green-700 border-green-200 animate-pulse'
            }
        }

        const tasks = getMemberTasks(profileId)
        if (tasks.some(task => task.status === 'working')) {
            return { label: 'In lab', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        }
        if (tasks.some(task => task.status === 'todo')) {
            return { label: 'Available', className: 'bg-sky-100 text-sky-700 border-sky-200' }
        }
        return { label: 'Offline', className: 'bg-slate-100 text-slate-600 border-slate-200' }
    }

    const getCurrentAssignment = (profileId: string) => {
        const tasks = getMemberTasks(profileId)
        const priorityTask = tasks.find(task => task.status === 'working') || tasks[0]
        return priorityTask?.title || 'No active assignments'
    }

    const getInitials = (firstName?: string, lastName?: string) => `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim() || 'TM'

    // Local helper to delete task since it's not in context
    const handleDeleteTask = async (workpackageId: string, taskId: string) => {
        const workpackage = allWorkpackages.find(wp => wp.id === workpackageId)
        if (!workpackage) return

        const updatedTasks = (workpackage.tasks || []).filter(t => t.id !== taskId)
        await handleUpdateWorkpackage(workpackageId, { tasks: updatedTasks })
    }

    // Handle Task Updates from Panel
    const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
        if (!selectedTask || !selectedTask.workpackageId) return

        const workpackage = allWorkpackages.find(wp => wp.id === selectedTask.workpackageId)
        if (!workpackage) return

        const updatedTasks = (workpackage.tasks || []).map(t =>
            t.id === taskId ? { ...t, ...updates } : t
        )

        await handleUpdateWorkpackage(workpackage.id, { tasks: updatedTasks })

        // Update local state if needed
        if (selectedTask.id === taskId) {
            setSelectedTask({ ...selectedTask, ...updates })
        }
    }

    const handleTaskDeleteWrapper = async (taskId: string) => {
        if (!selectedTask || !selectedTask.workpackageId) return
        const workpackage = allWorkpackages.find(wp => wp.id === selectedTask.workpackageId)
        if (workpackage) {
            await handleDeleteTask(workpackage.id, taskId)
            setSelectedTask(null)
        }
    }

    const safeFormatDate = (value: unknown) => {
        if (!value) return 'No date'
        const date = value instanceof Date ? value : new Date(value as any)
        return isNaN(date.getTime()) ? 'No date' : format(date, 'PPP')
    }

    const safeFormatTime = (value: unknown) => {
        if (!value) return '—'
        const date = value instanceof Date ? value : new Date(value as any)
        return isNaN(date.getTime()) ? '—' : format(date, 'HH:mm')
    }



    return (
        <div className="space-y-6">
            {/* Top Section: Welcome */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        Welcome back, {currentUserProfile?.firstName || 'User'}
                    </h2>
                    <p className="text-muted-foreground">
                        Get your team in motion!
                    </p>
                </div>
            </div>

            {/* Daily Agenda Row (New Phase 2 Feature) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[350px]">
                <div className="md:col-span-2 h-full">
                    <DailyAgendaView />
                </div>
                <div className="h-full">
                    <ProtocolBenchMode />
                </div>
            </div>

            {/* Main Dashboard Grid - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                {/* Left Column (20%): Navigation & Status */}
                <div className="md:col-span-3 space-y-6">
                    {/* Quick Actions (New Phase 3) */}
                    <Card>
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4 text-indigo-500" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2">
                            <div onClick={() => setMainView('equipment')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <CalendarIcon className="h-5 w-5 mb-1 text-purple-500" />
                                <span className="text-[10px] font-medium">Book</span>
                            </div>
                            <div onClick={() => setMainView('projects')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <Layout className="h-5 w-5 mb-1 text-blue-500" />
                                <span className="text-[10px] font-medium">New Project</span>
                            </div>
                            <div onClick={() => setMainView('eln')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <FlaskConical className="h-5 w-5 mb-1 text-emerald-500" />
                                <span className="text-[10px] font-medium">Experiment</span>
                            </div>
                            <div onClick={() => setMainView('dashboard')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <BarChart3 className="h-5 w-5 mb-1 text-orange-500" />
                                <span className="text-[10px] font-medium">Reports</span>
                            </div>
                            <div onClick={() => setMainView('dashboard')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <ShieldAlert className="h-5 w-5 mb-1 text-red-500" />
                                <span className="text-[10px] font-medium">Safety</span>
                            </div>
                            <div onClick={() => setMainView('samples')} className="flex flex-col items-center justify-center p-2 bg-muted/30 hover:bg-muted rounded border text-center transition-colors cursor-pointer">
                                <TestTube className="h-5 w-5 mb-1 text-pink-500" />
                                <span className="text-[10px] font-medium">Samples</span>
                            </div>
                        </CardContent>
                    </Card>
                    {/* Experiments Widget */}
                    <Card className="h-[240px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-emerald-500" />
                                Experiments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-1">
                                    {elnExperiments.length > 0 ? (
                                        elnExperiments.slice(0, 5).map(experiment => (
                                            <DashboardTile
                                                key={experiment.id}
                                                href={`/eln?experimentId=${experiment.id}`}
                                                className="p-2 text-sm border-b last:border-0 rounded-none hover:bg-muted/50"
                                            >
                                                <div className="font-medium truncate">{experiment.title}</div>
                                                {experiment.status && (
                                                    <Badge variant="outline" className="text-[10px] mt-1 h-4">{experiment.status}</Badge>
                                                )}
                                            </DashboardTile>
                                        ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No active experiments</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Whiteboards Widget */}
                    <Card className="h-[200px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Presentation className="h-4 w-4 text-blue-500" />
                                Whiteboards
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-1">
                                    {whiteboards.length > 0 ? (
                                        whiteboards.slice(0, 3).map(whiteboard => (
                                            <DashboardTile
                                                key={whiteboard.id}
                                                href={`/whiteboard?whiteboardId=${whiteboard.id}`}
                                                className="p-2 text-sm border-b last:border-0 rounded-none hover:bg-muted/50"
                                            >
                                                <div className="font-medium truncate">{whiteboard.name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {whiteboard.shapes?.length || 0} shapes
                                                </div>
                                            </DashboardTile>
                                        ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No whiteboards</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Team Widget (Moved from Right) */}
                    <Card className="h-[360px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4 text-amber-500" />
                                    Team
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setMainView('people')}>
                                    View All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {labProfiles.length > 0 ? (
                                        labProfiles.map(profile => {
                                            const presence = getPresenceStatus(profile.id)
                                            return (
                                                <div key={profile.id} className="p-2 border rounded-lg bg-card/60 flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-xs">{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-xs truncate">
                                                            {profile.firstName} {profile.lastName}
                                                        </div>
                                                        <Badge variant="outline" className={`text-[9px] h-4 px-1 ${presence.className} border-0`}>
                                                            {presence.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No team members</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Equipment Health (Moved from Bottom) */}
                    <Card>
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-slate-500" />
                                Equipment Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="space-y-2">
                                {equipment.slice(0, 3).map(eq => {
                                    const lastMaint = new Date(eq.lastMaintained)
                                    const nextMaint = new Date(lastMaint)
                                    nextMaint.setDate(nextMaint.getDate() + eq.maintenanceDays)
                                    const daysUntil = Math.ceil((nextMaint.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    const isOperational = daysUntil > 0

                                    return (
                                        <div key={eq.id} className="flex items-center justify-between text-xs border p-2 rounded">
                                            <span className="truncate max-w-[120px]">{eq.name}</span>
                                            <div className={`h-2 w-2 rounded-full ${isOperational ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Center Column (60%): Active Work */}
                <div className="md:col-span-6 space-y-6">

                    {/* Risk Widget (New Phase 2) */}
                    <DashboardRiskWidget projects={projects} tasks={dayToDayTasks} orders={orders} />

                    {/* Projects Grid */}
                    <Card>
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Layout className="h-4 w-4 text-indigo-500" />
                                Projects
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                                {projects.slice(0, 4).map(project => (
                                    <div
                                        key={project.id}
                                        className={`p-4 border rounded-xl transition-all cursor-pointer ${selectedProject?.id === project.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200'
                                            : 'bg-card hover:bg-accent/50 hover:shadow-sm'
                                            }`}
                                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                                    >
                                        <div className="font-bold text-lg truncate mb-1">{project.name}</div>
                                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                                            <span>{project.status || 'Active'}</span>
                                            <span>{project.progress || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${selectedProject?.id === project.id ? 'bg-indigo-600' : 'bg-indigo-500'}`}
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Link href={`/projects/${project.id}/explorer`} className="text-xs text-indigo-600 hover:underline">
                                                View Project
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task Kanban Board */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Card className="h-full">
                                <CardHeader className="pb-2 py-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-orange-500" />
                                        Task Board
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMainView('mytasks')}>
                                        Full Board
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-4 pt-0">
                                        <TaskKanban
                                            tasks={dayToDayTasks}
                                            onTaskClick={setSelectedTask}
                                            onTaskUpdate={handleTaskUpdate}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        {/* Task Details Panel (Overlay) */}
                        {selectedTask && (
                            <TaskDetailsPanel
                                task={selectedTask}
                                workpackageId={selectedTask.workpackageId || ''}
                                onClose={() => setSelectedTask(null)}
                                onSave={handleTaskUpdate}
                                onDelete={handleTaskDeleteWrapper}
                                availablePeople={allProfiles}
                            />
                        )}
                    </div>

                    {/* Embedded Project Details (Miller Column) */}
                    {selectedProject && (
                        <div className="relative animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Visual connector arrow */}
                            <div className="flex justify-center -mt-6 mb-2">
                                <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg z-10">
                                    <ChevronDown className="h-6 w-6" />
                                </div>
                            </div>

                            <Card className="border-2 border-indigo-100 shadow-lg overflow-hidden">
                                <CardHeader className="bg-indigo-50/50 pb-2 py-3 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-900">
                                            <Layout className="h-4 w-4" />
                                            Project Details: {selectedProject.name}
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>Close</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 h-[600px]">
                                    {/* Embed the Miller Column View */}
                                    <ProjectExplorerView project={selectedProject} />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Right Column (20%): Resources */}
                <div className="md:col-span-3 space-y-6">
                    {/* Lab Pulse Widget (NEW) */}
                    <div className="h-[350px]">
                        <LabPulseWidget />
                    </div>

                    {/* Weekly Digest (New Phase 2) */}
                    {currentUserProfile && (
                        <div className="h-[400px]">
                            <MyWeeklyDigest
                                userId={currentUserProfile.id}
                                tasks={dayToDayTasks}
                                bookings={userBookings}
                                events={events}
                            />
                        </div>
                    )}

                    {/* Today Overview Widget */}
                    <TodayOverview />

                    {/* Upcoming Events Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-rose-500" />
                                    Upcoming Events
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setMainView('calendar')}>
                                    View Calendar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {events && events.length > 0 ? (
                                        events
                                            .filter(e => new Date(e.start) >= new Date())
                                            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                                            .slice(0, 5)
                                            .map(event => (
                                                <div key={event.id} className="p-2 border rounded-md text-sm bg-muted/20">
                                                    <div className="font-medium truncate">{event.title}</div>
                                                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                                                        <span>{format(new Date(event.start), 'MMM d, HH:mm')}</span>
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-0 bg-white/50">
                                                            {event.type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No upcoming events</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Bookings Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-purple-500" />
                                Bookings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {userBookings.slice(0, 5).map(booking => (
                                        <div key={booking.id} className="p-2 border rounded-md text-sm bg-muted/20">
                                            <div className="font-medium truncate">{booking.equipmentName}</div>
                                            <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                                                <span>{safeFormatTime(booking.startTime)}</span>
                                                <span>{safeFormatTime(booking.endTime)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {userBookings.length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-4">No bookings today</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Inventory Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                Inventory
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {orders
                                        .filter(o => o.status === 'to-order' || o.status === 'ordered')
                                        .slice(0, 5)
                                        .map(order => (
                                            <div key={order.id} className="p-2 border rounded-md text-sm flex justify-between items-center bg-muted/20">
                                                <div className="truncate flex-1 text-xs font-medium">{order.productName}</div>
                                                <Badge variant="outline" className="text-[9px] h-4 px-1">{order.status}</Badge>
                                            </div>
                                        ))}
                                    {orders.length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-4">No pending orders</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Knowledge Graph (Research Boards) */}
                    <Card className="h-[260px] flex flex-col">
                        <CardHeader className="pb-2 py-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-indigo-500" />
                                Knowledge Graph
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {researchBoards.slice(0, 5).map(board => (
                                        <div
                                            key={board.id}
                                            onClick={() => setMainView('research')}
                                            className="w-full text-left p-2 border rounded-md text-sm hover:bg-accent transition-colors cursor-pointer"
                                        >
                                            <div className="font-medium truncate text-xs">{board.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                                    {board.ownerName}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {researchBoards.length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-4">
                                            No graphs yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
