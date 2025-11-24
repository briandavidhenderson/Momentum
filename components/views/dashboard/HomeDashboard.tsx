"use client"

import React, { useState } from 'react'
import { useAppContext } from '@/lib/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Activity,
    Calendar as CalendarIcon,
    BrainCircuit,
    FlaskConical,
    Layout,
    Package,
    Presentation,
    Users,
    Wrench
} from 'lucide-react'
import { format } from 'date-fns'
import { DashboardTile } from './DashboardTile'

export function HomeDashboard() {
    const {
        // Projects
        projects,

        // Tasks
        dayToDayTasks,

        // Lab
        orders,
        equipment,

        // ELN & Whiteboards
        elnExperiments,
        whiteboards,

        // Other
        userBookings,
        currentUserProfile,
        setMainView,
        allProfiles
    } = useAppContext()

    const researchBoards = whiteboards
        .map(board => {
            const owner = allProfiles.find(profile => profile.id === board.createdBy)
            const updatedAt = board.updatedAt?.toDate
                ? board.updatedAt.toDate()
                : board.updatedAt instanceof Date
                    ? board.updatedAt
                    : board.createdAt?.toDate
                        ? board.createdAt.toDate()
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

    // State for selected project
    const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null)

    // Filter for "Today" items (placeholder logic)
    const today = new Date()
    const todaysBookings = userBookings.filter(b => {
        const bookingDate = new Date(b.startTime)
        return bookingDate.toDateString() === today.toDateString()
    })

    return (
        <div className="space-y-6">
            {/* Top Section: Welcome & Today's Overview */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        Welcome back, {currentUserProfile?.firstName || 'User'}
                    </h2>
                    <p className="text-muted-foreground">
                        Here's what's happening in the lab today.
                    </p>
                </div>

                {/* Today's Schedule / Quick Stats */}
                <Card className="w-full md:w-auto min-w-[300px]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {todaysBookings.length > 0 ? (
                                todaysBookings.map(booking => (
                                    <div key={booking.id} className="bg-muted/50 p-3 rounded-lg min-w-[120px] text-sm">
                                        <div className="font-medium">{booking.equipmentName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground">No bookings today</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column: Experiments & Whiteboards (3 cols) */}
                <div className="md:col-span-3 space-y-6">
                    {/* Experiments Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-emerald-500" />
                                Active Experiments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {elnExperiments.length > 0 ? (
                                        elnExperiments.slice(0, 5).map(experiment => (
                                            <DashboardTile
                                                key={experiment.id}
                                                href={`/eln?experimentId=${experiment.id}`}
                                                aria-label={`Open experiment ${experiment.title}`}
                                                className="p-2 text-sm"
                                            >
                                                <div className="font-medium truncate group-hover:text-primary transition-colors">
                                                    {experiment.title}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {experiment.description || 'No description'}
                                                </div>
                                                {experiment.status && (
                                                    <Badge variant="outline" className="text-[10px] mt-1">{experiment.status}</Badge>
                                                )}
                                            </DashboardTile>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4">No active experiments</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Whiteboards Widget */}
                    <Card className="h-[200px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Presentation className="h-4 w-4 text-blue-500" />
                                Whiteboards
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {whiteboards.length > 0 ? (
                                        whiteboards.slice(0, 3).map(whiteboard => (
                                            <DashboardTile
                                                key={whiteboard.id}
                                                href={`/whiteboard?whiteboardId=${whiteboard.id}`}
                                                aria-label={`Open whiteboard ${whiteboard.name}`}
                                                className="p-2 text-sm"
                                            >
                                                <div className="font-medium truncate group-hover:text-primary transition-colors">
                                                    {whiteboard.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {whiteboard.shapes?.length || 0} shapes
                                                </div>
                                            </DashboardTile>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4">No whiteboards</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Center Column: Projects & Tasks (6 cols) */}
                <div className="md:col-span-6 space-y-6">
                    {/* Projects Grid */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Layout className="h-4 w-4 text-indigo-500" />
                                Active Projects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                {projects.slice(0, 4).map(project => (
                                    <div
                                        key={project.id}
                                        className="p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow cursor-pointer"
                                        onClick={() => setSelectedProject(project)}
                                    >
                                        <div className="font-bold truncate">{project.name}</div>
                                        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500"
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Kanban / Tasks Overview */}
                    <Card className="min-h-[300px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4 text-orange-500" />
                                My Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 h-full">
                                {['To Do', 'In Progress', 'Done'].map(status => (
                                    <div key={status} className="bg-muted/30 rounded-lg p-2">
                                        <div className="text-xs font-semibold mb-2 text-center">{status}</div>
                                        <div className="space-y-2">
                                            {dayToDayTasks
                                                .filter(t => t.status === status.toLowerCase().replace(' ', '-')) // Approximate mapping
                                                .slice(0, 3)
                                                .map(task => (
                                                    <div key={task.id} className="bg-background p-2 rounded border text-xs shadow-sm">
                                                        {task.title}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Details / Deliverables (Bottom Center) */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Project Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedProject ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedProject.name}</h3>
                                        {selectedProject.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{selectedProject.description}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Status</div>
                                            <Badge variant="outline" className="mt-1">{selectedProject.status || 'Active'}</Badge>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Progress</div>
                                            <div className="font-medium mt-1">{selectedProject.progress || 0}%</div>
                                        </div>
                                    </div>
                                    {selectedProject.startDate && (
                                        <div>
                                            <div className="text-xs text-muted-foreground">Start Date</div>
                                            <div className="text-sm mt-1">{format(new Date(selectedProject.startDate), 'MMM d, yyyy')}</div>
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setSelectedProject(null)}>
                                        Close
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    Select a project to view details
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Bookings, Inventory & Research Boards (3 cols) */}
                <div className="md:col-span-3 space-y-6">
                    {/* Bookings Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-purple-500" />
                                Upcoming Bookings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {userBookings.slice(0, 5).map(booking => (
                                        <div key={booking.id} className="p-2 border rounded-md text-sm">
                                            <div className="font-medium">{booking.equipmentName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(booking.startTime), 'MMM d, HH:mm')}
                                            </div>
                                        </div>
                                    ))}
                                    {userBookings.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">No upcoming bookings</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Inventory / Orders Widget */}
                    <Card className="h-[300px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                To Order / Low Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {orders
                                        .filter(o => o.status === 'to-order' || o.status === 'ordered')
                                        .slice(0, 5)
                                        .map(order => (
                                            <div key={order.id} className="p-2 border rounded-md text-sm flex justify-between items-center">
                                                <div className="truncate flex-1">{order.productName}</div>
                                                <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                                            </div>
                                        ))}
                                    {orders.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">No pending orders</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Research Boards Snapshot */}
                    <Card className="h-[260px] flex flex-col">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-indigo-500" />
                                Research Boards
                            </CardTitle>
                            <Button variant="link" className="h-auto px-0 text-xs" onClick={() => setMainView('research')}>
                                Open boards
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-2">
                                    {researchBoards.slice(0, 5).map(board => (
                                        <button
                                            key={board.id}
                                            onClick={() => setMainView('research')}
                                            className="w-full text-left p-2 border rounded-md text-sm hover:bg-accent transition-colors"
                                        >
                                            <div className="font-medium truncate">{board.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] capitalize">
                                                    {board.status}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {board.ownerName}
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-1">
                                                Updated {format(board.updatedAt, 'MMM d')}
                                            </div>
                                        </button>
                                    ))}
                                    {researchBoards.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No research boards yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Equipment Health */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-slate-500" />
                        Equipment Health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {equipment.slice(0, 6).map(eq => {
                            // Calculate status based on maintenance
                            const lastMaint = new Date(eq.lastMaintained)
                            const nextMaint = new Date(lastMaint)
                            nextMaint.setDate(nextMaint.getDate() + eq.maintenanceDays)
                            const daysUntil = Math.ceil((nextMaint.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            const isOperational = daysUntil > 0

                            return (
                                <div key={eq.id} className="min-w-[150px] p-3 border rounded-lg">
                                    <div className="font-medium text-sm truncate">{eq.name}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`h-2 w-2 rounded-full ${isOperational ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-xs text-muted-foreground capitalize">{isOperational ? 'Operational' : 'Maintenance Due'}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
