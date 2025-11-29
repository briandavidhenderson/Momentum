import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    addDays,
    addHours,
    differenceInMinutes,
    format,
    isSameDay,
    startOfDay,
    startOfWeek,
    parseISO
} from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { EquipmentBooking } from "@/lib/types/booking.types"
import { cn } from "@/lib/utils"

interface EquipmentBookingCalendarProps {
    bookings: EquipmentBooking[]
    onSelectSlot?: (start: Date, end: Date) => void
    onSelectBooking?: (booking: EquipmentBooking) => void
    loading?: boolean
}

export function EquipmentBookingCalendar({
    bookings,
    onSelectSlot,
    onSelectBooking,
    loading
}: EquipmentBookingCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 })
        return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }, [currentDate])

    const headerTitle = useMemo(() => {
        const s = startOfWeek(currentDate, { weekStartsOn: 1 })
        const e = addDays(s, 6)
        return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`
    }, [currentDate])

    const goPrev = () => setCurrentDate(d => addDays(d, -7))
    const goNext = () => setCurrentDate(d => addDays(d, 7))
    const goToday = () => setCurrentDate(new Date())

    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 06:00–21:00

    return (
        <Card className="rounded-3xl shadow-sm border-slate-200 overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-900">Availability</h3>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={goPrev}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium w-32 text-center">{headerTitle}</span>
                    <Button variant="ghost" size="icon" onClick={goNext}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToday} className="ml-2">
                        Today
                    </Button>
                </div>
            </div>

            <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/50">
                        <div className="p-2" />
                        {weekDays.map(day => (
                            <div key={day.toISOString()} className={cn(
                                "p-2 text-center border-l border-slate-100",
                                isSameDay(day, new Date()) && "bg-indigo-50/50"
                            )}>
                                <div className="text-xs font-medium text-slate-500">{format(day, "EEE")}</div>
                                <div className={cn(
                                    "text-sm font-bold",
                                    isSameDay(day, new Date()) ? "text-indigo-600" : "text-slate-900"
                                )}>{format(day, "d")}</div>
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                        {/* Time labels */}
                        <div className="border-r border-slate-100 bg-slate-50/30">
                            {hours.map(h => (
                                <div key={h} className="h-14 text-[10px] text-slate-400 text-right pr-2 pt-1 border-b border-slate-50">
                                    {format(addHours(startOfDay(new Date()), h), "HH:00")}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        {weekDays.map(day => {
                            const dayBookings = bookings.filter(b =>
                                isSameDay(b.startTime, day) || isSameDay(b.endTime, day)
                            )

                            return (
                                <div key={day.toISOString()} className="relative border-r border-slate-100 min-h-[896px]">
                                    {/* Grid lines */}
                                    {hours.map(h => (
                                        <div key={h} className="h-14 border-b border-slate-50" />
                                    ))}

                                    {/* Bookings */}
                                    <AnimatePresence>
                                        {dayBookings.map(booking => (
                                            <BookingBlock
                                                key={booking.id}
                                                booking={booking}
                                                day={day}
                                                onClick={() => onSelectBooking?.(booking)}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {/* Clickable overlay for creating new bookings could go here */}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface BookingBlockProps {
    booking: EquipmentBooking
    day: Date
    onClick?: () => void
}

function BookingBlock({ booking, day, onClick }: BookingBlockProps) {
    const dayStart = addHours(startOfDay(day), 6) // Start at 06:00
    const dayEnd = addHours(dayStart, 16) // End at 22:00 (16 hours)

    // Clamp booking to viewable hours
    const start = booking.startTime < dayStart ? dayStart : booking.startTime
    const end = booking.endTime > dayEnd ? dayEnd : booking.endTime

    if (end <= start) return null

    const topMins = differenceInMinutes(start, dayStart)
    const durMins = differenceInMinutes(end, start)

    // 14px * 4 = 56px per hour (approx) -> let's say h-14 is 3.5rem = 56px
    // So 56px / 60min = 0.933 px/min
    const pxPerMin = 56 / 60

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, zIndex: 10 }}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
            className={cn(
                "absolute left-1 right-1 rounded-md border px-2 py-1 text-xs cursor-pointer overflow-hidden shadow-sm",
                booking.status === 'confirmed' ? "bg-indigo-100 border-indigo-200 text-indigo-900" :
                    booking.status === 'pending' ? "bg-amber-100 border-amber-200 text-amber-900" :
                        "bg-slate-100 border-slate-200 text-slate-600"
            )}
            style={{
                top: Math.max(0, topMins * pxPerMin),
                height: Math.max(20, durMins * pxPerMin),
            }}
        >
            <div className="font-semibold truncate">
                {booking.title || 'Booking'}
            </div>
            <div className="text-[10px] opacity-80">
                {format(booking.startTime, "HH:mm")} - {format(booking.endTime, "HH:mm")}
            </div>
        </motion.div>
    )
}
