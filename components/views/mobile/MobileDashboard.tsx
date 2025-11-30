"use client"

import { useAppContext } from "@/lib/AppContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, CheckCircle2, AlertCircle, FlaskConical, ArrowRight } from "lucide-react"
import { format } from "date-fns"

export function MobileDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
    const {
        currentUserProfile,
        dayToDayTasks: tasks,
        bookings,
        elnExperiments
    } = useAppContext()

    // Filter for today's relevant items
    const myTasks = tasks.filter((t: any) =>
        t.assignedTo.includes(currentUserProfile?.id || "") &&
        t.status !== "Done"
    ).slice(0, 3)

    const myBookings = bookings.filter(b =>
        b.bookedBy === currentUserProfile?.id &&
        new Date(b.startTime) > new Date()
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 2)

    const myExperiments = (elnExperiments || []).filter(e =>
        e.collaborators?.includes(currentUserProfile?.id || "") ||
        e.createdBy === currentUserProfile?.id
    ).slice(0, 2)

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? "Morning" : "Afternoon"}</h1>
                    <p className="text-muted-foreground">{currentUserProfile?.displayName || "Scientist"}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                    {currentUserProfile?.displayName?.charAt(0) || "U"}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-blue-600">{myTasks.length}</span>
                        <span className="text-xs text-blue-600 font-medium uppercase mt-1">Pending Tasks</span>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-purple-600">{myBookings.length}</span>
                        <span className="text-xs text-purple-600 font-medium uppercase mt-1">Bookings</span>
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming Bookings */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-brand-500" />
                        Next Up
                    </h2>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => onNavigate("bookings")}>
                        View All
                    </Button>
                </div>
                {myBookings.length === 0 ? (
                    <Card className="border-dashed shadow-none">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                            No upcoming bookings today
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {myBookings.map(booking => (
                            <Card key={booking.id} className="overflow-hidden">
                                <div className="flex">
                                    <div className="w-1.5 bg-brand-500" />
                                    <div className="p-3 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium text-sm">{booking.equipmentName}</h3>
                                            <Badge variant="outline" className="text-[10px]">
                                                {format(new Date(booking.startTime), "HH:mm")}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Active Experiments */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-brand-500" />
                        Active Experiments
                    </h2>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => onNavigate("eln")}>
                        View All
                    </Button>
                </div>
                {myExperiments.length === 0 ? (
                    <Card className="border-dashed shadow-none">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                            No active experiments
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {myExperiments.map(exp => (
                            <Card key={exp.id} onClick={() => onNavigate(`experiment/${exp.id}`)}>
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-medium text-sm line-clamp-1">{exp.title}</h3>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-[10px]">
                                            {exp.items?.length || 0} items
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {format(new Date(exp.updatedAt || exp.createdAt), "MMM d")}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Urgent Tasks */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-brand-500" />
                        Priority Tasks
                    </h2>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => onNavigate("tasks")}>
                        View All
                    </Button>
                </div>
                {myTasks.length === 0 ? (
                    <Card className="border-dashed shadow-none">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                            All caught up!
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {myTasks.map((task: any) => (
                            <Card key={task.id}>
                                <CardContent className="p-3 flex items-start gap-3">
                                    <div className={`mt-1 h-2 w-2 rounded-full ${task.priority === "High" ? "bg-red-500" :
                                            task.priority === "Medium" ? "bg-amber-500" : "bg-blue-500"
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Due {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
