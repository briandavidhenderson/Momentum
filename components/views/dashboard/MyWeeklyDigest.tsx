import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, CheckSquare, GraduationCap, AlertCircle } from 'lucide-react'
import { DayToDayTask } from '@/lib/dayToDayTypes'
import { EquipmentBooking } from '@/lib/types/booking.types'
import { TrainingRecord } from '@/lib/types/training.types'
import { subscribeToUserTraining } from '@/lib/services/trainingService'
import { format, isSameDay, addDays, isWithinInterval, parseISO } from 'date-fns'

interface MyWeeklyDigestProps {
    userId: string
    tasks: DayToDayTask[]
    bookings: EquipmentBooking[]
}

export function MyWeeklyDigest({ userId, tasks, bookings }: MyWeeklyDigestProps) {
    const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([])

    useEffect(() => {
        if (!userId) return
        const unsubscribe = subscribeToUserTraining(userId, (records) => {
            setTrainingRecords(records)
        })
        return () => unsubscribe()
    }, [userId])

    // 1. Tasks Due This Week
    const today = new Date()
    const nextWeek = addDays(today, 7)

    const dueThisWeek = tasks.filter(t => {
        if (t.status === 'done' || !t.dueDate) return false
        const date = new Date(t.dueDate)
        return isWithinInterval(date, { start: today, end: nextWeek })
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

    // 2. Upcoming Bookings (Next 7 Days)
    const upcomingBookings = bookings.filter(b => {
        const date = b.startTime instanceof Date ? b.startTime : new Date(b.startTime)
        return date >= today && date <= nextWeek
    }).sort((a, b) => (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))

    // 3. Expiring Training (Next 30 Days or Expired)
    const expiringTraining = trainingRecords.filter(r => {
        if (!r.expiryDate) return false
        const expiry = new Date(r.expiryDate)
        const daysUntil = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        return daysUntil < 30 // Expired or expiring in 30 days
    })

    return (
        <Card className="h-full border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2 py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    My Weekly Digest
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-4">

                {/* Tasks Section */}
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        Due This Week
                    </h4>
                    {dueThisWeek.length > 0 ? (
                        <div className="space-y-1">
                            {dueThisWeek.slice(0, 3).map(task => (
                                <div key={task.id} className="flex justify-between items-center text-sm p-1.5 bg-muted/30 rounded">
                                    <span className="truncate flex-1">{task.title}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {task.dueDate && format(new Date(task.dueDate), 'EEE')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No tasks due this week.</p>
                    )}
                </div>

                {/* Bookings Section */}
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Upcoming Bookings
                    </h4>
                    {upcomingBookings.length > 0 ? (
                        <div className="space-y-1">
                            {upcomingBookings.slice(0, 3).map(booking => (
                                <div key={booking.id} className="flex justify-between items-center text-sm p-1.5 bg-muted/30 rounded">
                                    <span className="truncate flex-1">{booking.equipmentName}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {format(new Date(booking.startTime), 'EEE HH:mm')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No upcoming bookings.</p>
                    )}
                </div>

                {/* Training Alerts */}
                {expiringTraining.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            Training Alerts
                        </h4>
                        <div className="space-y-1">
                            {expiringTraining.map(record => (
                                <div key={record.id} className="flex items-center gap-2 text-xs p-1.5 bg-red-50 text-red-700 rounded border border-red-100">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{record.title} expires {record.expiryDate && format(new Date(record.expiryDate), 'MMM d')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>
    )
}
