"use client"

import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  addDays,
  addHours,
  addMonths,
  subMonths,
  differenceInMinutes,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Plus,
  Timer,
  Microscope,
} from "lucide-react"
import { CalendarEvent } from "@/lib/types"
import { useAppContext } from "@/lib/AppContext"
import { EventDialog } from "@/components/EventDialog"
import { personProfilesToPeople } from "@/lib/personHelpers"
import { useProfiles } from "@/lib/useProfiles"
import { useAuth } from "@/lib/hooks/useAuth"

/**
 * Calendar View Component
 * Day / Week / Month views with countdowns panel
 * Integrated with existing CalendarEvent type and AppContext
 */

// Event type mapping from CalendarEvent to component format
type ComponentEventType = "meeting" | "deadline" | "training" | "event" | "focus" | "equipment_mine" | "equipment_others" | "abstract-submission"

interface ComponentEvent {
  id: string
  title: string
  start: string // ISO string
  end: string // ISO string
  type: ComponentEventType
  important: boolean
  location?: string
}

const CATEGORY_META: Record<ComponentEventType, { label: string; color: string }> = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-900 border-blue-200" },
  deadline: { label: "Deadline", color: "bg-rose-100 text-rose-900 border-rose-200" },
  training: { label: "Training", color: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  event: { label: "Event", color: "bg-amber-100 text-amber-900 border-amber-200" },
  focus: { label: "Focus", color: "bg-violet-100 text-violet-900 border-violet-200" },
  equipment_mine: { label: "My Equipment", color: "bg-indigo-100 text-indigo-900 border-indigo-300 ring-1 ring-indigo-300" },
  equipment_others: { label: "Other Bookings", color: "bg-slate-100 text-slate-600 border-slate-200 opacity-80" },
  "abstract-submission": { label: "Abstract Submission", color: "bg-purple-100 text-purple-900 border-purple-200" },
}

const VIEW_TABS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
]

function classNames(...xs: (string | boolean | undefined)[]): string {
  return xs.filter(Boolean).join(" ")
}

/**
 * Transform CalendarEvent to component event format
 */
function transformEvent(event: CalendarEvent): ComponentEvent {
  // Map event types
  let type: ComponentEventType = "event"

  if (event.type === "equipment" || event.relatedIds?.equipmentBookingId) {
    // Check ownership if currentUserId is available (will be handled in the component via useMemo)
    // For now, default to generic event, but we'll override this in the component
    type = "equipment_others"
  }
  else if (event.type === "meeting") type = "meeting"
  else if (event.type === "deadline") type = "deadline"
  else if (event.type === "training") type = "training"
  else if (event.type === "abstract-submission") type = "abstract-submission"
  else if (event.type === "milestone" || event.type === "other") type = "event"
  // Check for focus tag
  else if (event.tags?.includes("focus")) type = "focus"

  // Determine important flag
  const important =
    event.type === "deadline" ||
    (event.reminders && event.reminders.length > 0) ||
    (event.tags && event.tags.includes("important")) ||
    false

  return {
    id: event.id,
    title: event.title,
    start: event.start instanceof Date ? event.start.toISOString() : event.start,
    end: event.end instanceof Date ? event.end.toISOString() : event.end,
    type,
    important,
    location: event.location,
  }
}

/**
 * Parse event for component use
 */
function parseEvent(e: ComponentEvent) {
  return {
    ...e,
    startDate: parseISO(e.start),
    endDate: parseISO(e.end)
  }
}

function minutesFromStartOfDay(d: Date): number {
  const s = startOfDay(d)
  return differenceInMinutes(d, s)
}

function formatCountdown(toDate: Date): string {
  const now = new Date()
  const mins = differenceInMinutes(toDate, now)
  if (mins <= 0) return "Now"
  const days = Math.floor(mins / (60 * 24))
  const hours = Math.floor((mins % (60 * 24)) / 60)
  const minutes = mins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarView({ onEventClick }: CalendarViewProps) {
  const {
    events,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  } = useAppContext()

  const { currentUserProfile: profile } = useAuth()
  const allProfiles = useProfiles(profile?.labId || null)
  const people = personProfilesToPeople(allProfiles)

  const [view, setView] = useState<"day" | "week" | "month">("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filters, setFilters] = useState<Record<ComponentEventType, boolean>>({
    meeting: true,
    deadline: true,
    training: true,
    event: true,
    focus: true,
    equipment_mine: true,
    equipment_others: true,
    "abstract-submission": true,
  })
  const [showEquipment, setShowEquipment] = useState(true)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Transform events to component format
  const componentEvents = useMemo(() => {
    if (!events) return []
    return events.map(event => {
      const transformed = transformEvent(event)

      // Handle equipment ownership logic here where we have access to profile
      if (event.type === "equipment" || event.relatedIds?.equipmentBookingId) {
        const isMine = event.attendees?.some(a => a.personId === profile?.id) || event.createdBy === profile?.userId || event.ownerId === profile?.id
        transformed.type = isMine ? "equipment_mine" : "equipment_others"
      }

      return transformed
    })
  }, [events, profile])

  const filteredEvents = useMemo(
    () => componentEvents.filter((e) => {
      // Filter out equipment if toggle is off
      if (!showEquipment && (e.type === "equipment_mine" || e.type === "equipment_others")) {
        return false
      }
      // Otherwise use category filters
      // Note: We need to make sure new types are in filters or handled gracefully
      if (e.type === "equipment_mine" || e.type === "equipment_others") return true

      return filters[e.type]
    }),
    [componentEvents, filters, showEquipment]
  )

  const parsedEvents = useMemo(
    () => filteredEvents.map(parseEvent),
    [filteredEvents]
  )

  const monthMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    const days: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    return days
  }, [currentDate])

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const dayEvents = (day: Date) =>
    parsedEvents.filter(
      (e) => isSameDay(e.startDate, day) || isSameDay(e.endDate, day)
    )

  const upcomingImportant = useMemo(() => {
    const now = new Date()
    return parsedEvents
      .filter((e) => e.important && isAfter(e.startDate, now))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 8)
  }, [parsedEvents])

  const headerTitle = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy")
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 })
      const e = addDays(s, 6)
      return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`
    }
    return format(currentDate, "EEEE, d MMM yyyy")
  }, [currentDate, view])

  const goPrev = () => {
    setCurrentDate((d) => {
      if (view === "month") return subMonths(d, 1)
      if (view === "week") return addDays(d, -7)
      return addDays(d, -1)
    })
  }

  const goNext = () => {
    setCurrentDate((d) => {
      if (view === "month") return addMonths(d, 1)
      if (view === "week") return addDays(d, 7)
      return addDays(d, 1)
    })
  }

  const handleEventClick = (eventId: string) => {
    const originalEvent = events?.find((e) => e.id === eventId)
    if (originalEvent) {
      if (onEventClick) {
        onEventClick(originalEvent)
      } else {
        setEditingEvent(originalEvent)
        setShowEventDialog(true)
      }
    }
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    setShowEventDialog(true)
  }

  const handleEventSubmit = async (event: CalendarEvent) => {
    if (editingEvent) {
      await handleUpdateEvent?.(event.id, event)
    } else {
      await handleCreateEvent?.(event)
    }
    setShowEventDialog(false)
    setEditingEvent(null)
  }

  const handleEventDelete = async (eventId: string) => {
    await handleDeleteEvent?.(eventId)
    setShowEventDialog(false)
    setEditingEvent(null)
  }

  return (
    <>
      <div className="w-full h-full min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        {/* Top bar */}
        <div className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-slate-700" />
                <h1 className="text-lg font-semibold tracking-tight">Momentum Calendar</h1>
              </div>
              <Separator orientation="vertical" className="h-6 mx-2 hidden md:block" />
              <div className="flex items-center gap-1">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Previous">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="icon" onClick={goNext} aria-label="Next">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </motion.div>
                <div className="px-2 text-base font-medium">{headerTitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-between md:justify-end">
              <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")} className="">
                <TabsList className="bg-slate-100/80 rounded-2xl">
                  {VIEW_TABS.map((t) => (
                    <TabsTrigger
                      key={t.key}
                      value={t.key}
                      className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <motion.div whileTap={{ scale: 0.96 }}>
                <Button
                  variant={showEquipment ? "secondary" : "outline"}
                  className={classNames(
                    "rounded-2xl gap-2 transition-colors",
                    showEquipment ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-slate-500"
                  )}
                  onClick={() => setShowEquipment(!showEquipment)}
                >
                  <Microscope className="w-4 h-4" />
                  {showEquipment ? "Hide Equipment" : "Show Equipment"}
                </Button>
              </motion.div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="outline" className="rounded-2xl gap-2">
                      <Filter className="w-4 h-4" /> Filters
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {Object.keys(CATEGORY_META).map((k) => (
                    <DropdownMenuCheckboxItem
                      key={k}
                      checked={filters[k as ComponentEventType]}
                      onCheckedChange={(v) => setFilters((f) => ({ ...f, [k]: !!v }))}
                    >
                      {CATEGORY_META[k as ComponentEventType].label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <motion.div whileTap={{ scale: 0.96 }}>
                <Button className="rounded-2xl gap-2" onClick={handleAddEvent}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Calendar view */}
          <Card className="rounded-3xl shadow-sm border-slate-200 overflow-hidden">
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {view === "month" && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MonthView
                      monthDays={monthMatrix}
                      currentDate={currentDate}
                      dayEvents={dayEvents}
                      onSelectDay={(d) => {
                        setCurrentDate(d)
                        setView("day")
                      }}
                      onEventClick={handleEventClick}
                    />
                  </motion.div>
                )}

                {view === "week" && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <WeekView weekDays={weekDays} events={parsedEvents} onEventClick={handleEventClick} />
                  </motion.div>
                )}

                {view === "day" && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DayView day={currentDate} events={parsedEvents} onEventClick={handleEventClick} />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            <Card className="rounded-3xl shadow-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-slate-700" />
                    <h2 className="font-semibold">Countdowns</h2>
                  </div>
                  <span className="text-xs text-slate-500">Important events</span>
                </div>
                <ScrollArea className="h-[280px] pr-2">
                  {upcomingImportant.length === 0 && (
                    <div className="text-sm text-slate-500">No important upcoming items.</div>
                  )}
                  <div className="space-y-2">
                    {upcomingImportant.map((e) => {
                      const originalEvent = componentEvents.find((ev) => ev.id === e.id)
                      return (
                        <motion.div
                          key={e.id}
                          whileHover={{ y: -1 }}
                          className={classNames(
                            "p-3 rounded-2xl border flex items-start gap-3 bg-white cursor-pointer",
                            CATEGORY_META[e.type].color
                          )}
                          onClick={() => handleEventClick(e.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium truncate">{e.title}</div>
                              <div className="text-xs font-semibold whitespace-nowrap">
                                {formatCountdown(e.startDate)}
                              </div>
                            </div>
                            <div className="text-xs opacity-80 mt-1">
                              {format(e.startDate, "EEE d MMM, HH:mm")}
                            </div>
                            {originalEvent?.location && (
                              <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                                <MapPin className="w-3 h-3" /> {originalEvent.location}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Today</h3>
                <div className="text-sm text-slate-600 mb-3">
                  {format(new Date(), "EEEE, d MMM yyyy")}
                </div>
                <div className="space-y-2">
                  {dayEvents(new Date()).length === 0 ? (
                    <div className="text-sm text-slate-500">No events today.</div>
                  ) : (
                    dayEvents(new Date()).map((e) => (
                      <EventRow key={e.id} e={e} compact onEventClick={handleEventClick} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        mode={editingEvent ? "edit" : "create"}
        people={people}
        defaultVisibility="lab"
        onClose={() => {
          setShowEventDialog(false)
          setEditingEvent(null)
        }}
        onSubmit={handleEventSubmit}
        initialEvent={editingEvent || undefined}
        onDelete={handleEventDelete}
      />
    </>
  )
}

interface MonthViewProps {
  monthDays: Date[]
  currentDate: Date
  dayEvents: (day: Date) => Array<{ id: string; title: string; type: ComponentEventType; startDate: Date; endDate: Date }>
  onSelectDay: (day: Date) => void
  onEventClick: (eventId: string) => void
}

function MonthView({ monthDays, currentDate, dayEvents, onSelectDay, onEventClick }: MonthViewProps) {
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return (
    <div className="p-3">
      <div className="grid grid-cols-7 text-xs font-medium text-slate-500 px-2 pb-2">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-center">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day) => {
          const inMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())
          const items = dayEvents(day).slice(0, 3)

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectDay(day)}
              className={classNames(
                "min-h-[104px] rounded-2xl border p-2 text-left bg-white transition-shadow",
                inMonth ? "border-slate-200" : "border-dashed border-slate-100 opacity-60",
                isToday && "ring-2 ring-slate-900/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={classNames(
                  "text-sm font-semibold",
                  inMonth ? "text-slate-900" : "text-slate-400"
                )}>
                  {format(day, "d")}
                </div>
                {items.length > 0 && (
                  <div className="text-[10px] text-slate-500">{items.length}/{dayEvents(day).length}</div>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {items.map((e) => (
                  <EventChip key={e.id} e={e} onEventClick={onEventClick} />
                ))}
                {dayEvents(day).length > 3 && (
                  <div className="text-[10px] text-slate-500">+{dayEvents(day).length - 3} more</div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

interface WeekViewProps {
  weekDays: Date[]
  events: Array<{ id: string; title: string; type: ComponentEventType; startDate: Date; endDate: Date; location?: string }>
  onEventClick: (eventId: string) => void
}

function WeekView({ weekDays, events, onEventClick }: WeekViewProps) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 06:00–21:00
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
          <div />

          {weekDays.map((d) => (
            <div key={d.toISOString()} className="p-2 text-sm font-medium text-center">
              <div className="text-slate-700">{format(d, "EEE")}</div>
              <div className="text-slate-900">{format(d, "d")}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time labels */}
          <div className="border-r border-slate-200">
            {hours.map((h) => (
              <div key={h} className="h-16 text-[11px] text-slate-500 text-right pr-2 pt-1">
                {format(addHours(startOfDay(new Date()), h), "HH:00")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvts = events.filter(
              (e) => isSameDay(e.startDate, day) || isSameDay(e.endDate, day)
            )
            return (
              <div key={day.toISOString()} className="relative border-r border-slate-100">
                {hours.map((h) => (
                  <div key={h} className="h-16 border-b border-slate-100" />
                ))}

                {dayEvts.map((e) => (
                  <TimedEventBlock key={e.id} e={e} day={day} dayStartHour={6} hoursCount={16} onEventClick={onEventClick} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface DayViewProps {
  day: Date
  events: Array<{ id: string; title: string; type: ComponentEventType; startDate: Date; endDate: Date; location?: string }>
  onEventClick: (eventId: string) => void
}

function DayView({ day, events, onEventClick }: DayViewProps) {
  const hours = Array.from({ length: 18 }, (_, i) => i + 5) // 05:00–22:00
  const dayEvts = events.filter(
    (e) => isSameDay(e.startDate, day) || isSameDay(e.endDate, day)
  )

  return (
    <div className="p-3">
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="font-semibold text-slate-800">{format(day, "EEEE, d MMM")}</div>
        <div className="text-xs text-slate-500">{dayEvts.length} items</div>
      </div>

      <div className="grid grid-cols-[70px_1fr]">
        <div className="border-r border-slate-200">
          {hours.map((h) => (
            <div key={h} className="h-16 text-[11px] text-slate-500 text-right pr-2 pt-1">
              {format(addHours(startOfDay(day), h), "HH:00")}
            </div>
          ))}
        </div>

        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="h-16 border-b border-slate-100" />
          ))}
          {dayEvts.map((e) => (
            <TimedEventBlock key={e.id} e={e} day={day} dayStartHour={5} hoursCount={18} onEventClick={onEventClick} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface TimedEventBlockProps {
  e: { id: string; title: string; type: ComponentEventType; startDate: Date; endDate: Date; location?: string }
  day: Date
  dayStartHour: number
  hoursCount: number
  onEventClick: (eventId: string) => void
}

function TimedEventBlock({ e, day, dayStartHour, hoursCount, onEventClick }: TimedEventBlockProps) {
  const dayStart = addHours(startOfDay(day), dayStartHour)
  const dayEnd = addHours(dayStart, hoursCount)

  // Clamp to day bounds
  const start = e.startDate < dayStart ? dayStart : e.startDate
  const end = e.endDate > dayEnd ? dayEnd : e.endDate
  const topMins = differenceInMinutes(start, dayStart)
  const durMins = Math.max(15, differenceInMinutes(end, start))

  const pxPerMin = (hoursCount * 64) / (hoursCount * 60) // 64px per hour cell

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      className={classNames(
        "absolute left-1 right-1 rounded-xl border px-2 py-1 shadow-sm cursor-pointer",
        CATEGORY_META[e.type].color
      )}
      style={{
        top: topMins * pxPerMin + 2,
        height: durMins * pxPerMin - 4,
      }}
      title={`${e.title} (${format(e.startDate, "HH:mm")}-${format(e.endDate, "HH:mm")})`}
      onClick={() => onEventClick(e.id)}
    >
      <div className="text-xs font-semibold truncate">{e.title}</div>
      <div className="text-[10px] opacity-80 truncate">
        {format(e.startDate, "HH:mm")}–{format(e.endDate, "HH:mm")}
      </div>
      {e.location && (
        <div className="flex items-center gap-1 text-[10px] opacity-80 truncate mt-1">
          <MapPin className="w-3 h-3" /> {e.location}
        </div>
      )}
    </motion.div>
  )
}

interface EventChipProps {
  e: { id: string; title: string; type: ComponentEventType }
  onEventClick: (eventId: string) => void
}

function EventChip({ e, onEventClick }: EventChipProps) {
  return (
    <div
      className={classNames(
        "text-[11px] leading-tight px-1.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer",
        CATEGORY_META[e.type].color
      )}
      onClick={(ev) => {
        ev.stopPropagation()
        onEventClick(e.id)
      }}
    >
      <span className="font-medium truncate">{e.title}</span>
    </div>
  )
}

interface EventRowProps {
  e: { id: string; title: string; type: ComponentEventType; startDate: Date; endDate: Date; location?: string }
  compact?: boolean
  onEventClick: (eventId: string) => void
}

function EventRow({ e, compact, onEventClick }: EventRowProps) {
  return (
    <div
      className={classNames(
        "p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer",
        CATEGORY_META[e.type].color
      )}
      onClick={() => onEventClick(e.id)}
    >
      <div className="min-w-0">
        <div className={classNames(compact ? "text-sm" : "text-base", "font-medium truncate")}>
          {e.title}
        </div>
        <div className="text-xs opacity-80">
          {format(e.startDate, "HH:mm")}–{format(e.endDate, "HH:mm")}
          {differenceInCalendarDays(e.startDate, new Date()) === 0 ? " • Today" : ""}
        </div>
      </div>
      <div className="text-[10px] font-semibold whitespace-nowrap px-2">
        {CATEGORY_META[e.type].label}
      </div>
    </div>
  )
}

