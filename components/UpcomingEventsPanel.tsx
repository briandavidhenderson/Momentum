"use client"

import { useMemo, useState } from "react"
import { CalendarEvent } from "@/lib/types"
import { Calendar, Clock, Download, ExternalLink, RefreshCcw, Users, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRecurrenceSummary, buildICSForEvent, buildICSForEvents } from "@/lib/utils"
import { useDroppable } from "@dnd-kit/core"

type RangeKey = "today" | "week" | "month"

interface UpcomingEventsPanelProps {
  events: CalendarEvent[]
  onCreateEvent: () => void
  onSelectEvent?: (event: CalendarEvent) => void
  onExportCalendar?: (icsContent: string) => void
  getPersonName: (personId?: string) => string
}

const statusMeta: Record<string, { label: string; status: string }> = {
  meeting: { label: "Meeting", status: "in-progress" },
  deadline: { label: "Deadline", status: "at-risk" },
  milestone: { label: "Milestone", status: "not-started" },
  training: { label: "Training", status: "in-progress" },
  other: { label: "General", status: "not-started" },
}

export function UpcomingEventsPanel({
  events,
  onCreateEvent,
  onSelectEvent,
  onExportCalendar,
  getPersonName,
}: UpcomingEventsPanelProps) {
  const [activeRange, setActiveRange] = useState<RangeKey>("today")

  const startOfToday = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const boundaries = useMemo<Record<RangeKey, Date>>(() => ({
    today: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
    week: new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000),
    month: new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000),
  }), [startOfToday])

  const filtered = useMemo(() => {
    const boundary = boundaries[activeRange]
    return events
      .filter((event) => event.start >= startOfToday && event.start <= boundary)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [events, activeRange, startOfToday, boundaries])

  const viewICS = useMemo(() => buildICSForEvents(filtered), [filtered])

  function handleRangeChange(range: RangeKey) {
    setActiveRange(range)
  }

  function handleExportCalendar() {
    const ics = buildICSForEvents(events)
    if (onExportCalendar) {
      onExportCalendar(ics)
      return
    }
    initiateDownload(ics, "momentum-calendar.ics")
  }

  function handleExportView() {
    initiateDownload(viewICS, `momentum-${activeRange}.ics`)
  }

  return (
    <div className="card-monday">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-brand-500" aria-hidden />
          <div>
            <h2 className="h2 text-foreground">Upcoming events</h2>
            <p className="text-sm text-muted-foreground">Keep track of meetings, deadlines, and lab milestones.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCalendar}>
            <Download className="h-4 w-4" />
            Export all (.ics)
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportView} disabled={filtered.length === 0}>
            <RefreshCcw className="h-4 w-4" />
            Export view
          </Button>
          <Button className="bg-brand-500 text-white hover:bg-brand-600 gap-2" onClick={onCreateEvent}>
            <Plus className="h-4 w-4" />
            Create event
          </Button>
        </div>
      </header>

      <div className="flex gap-2 mb-4">
        {([
          { key: "today", label: "Today" },
          { key: "week", label: "This week" },
          { key: "month", label: "This month" },
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={activeRange === key ? "default" : "outline"}
            className={activeRange === key ? "bg-brand-500 text-white" : ""}
            onClick={() => handleRangeChange(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-2 max-h-[50vh] md:max-h-[420px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <EmptyState range={activeRange} />
        ) : (
          filtered.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              getPersonName={getPersonName}
              onSelect={onSelectEvent}
            />
          ))
        )}
      </div>
    </div>
  )
}

function EventRow({
  event,
  getPersonName,
  onSelect,
}: {
  event: CalendarEvent
  getPersonName: (personId?: string) => string
  onSelect?: (event: CalendarEvent) => void
}) {
  const recurrenceSummary = getRecurrenceSummary(event.recurrence)
  const handleOpen = () => onSelect?.(event)
  const { setNodeRef, isOver } = useDroppable({
    id: `event-${event.id}`,
    data: { type: "event", event },
  })
  const typeMeta = event.type ? statusMeta[event.type] ?? statusMeta.other : undefined

  return (
    <button
      ref={setNodeRef}
      onClick={handleOpen}
      className={`w-full rounded-2xl border ${
        isOver ? "border-brand-500 shadow-lg" : "border-border"
      } bg-background px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground truncate" title={event.title}>
              {event.title}
            </h3>
            {event.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs capitalize">
                {tag}
              </Badge>
            ))}
            {typeMeta && (
              <span className="status-chip" data-status={typeMeta.status}>
                {typeMeta.label}
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDateLabel(event.start)}</span>
            <span>•</span>
            <span>
              {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –
              {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {event.location}
              </span>
            )}
            {event.recurrence && event.recurrence.frequency !== "none" && (
              <span className="inline-flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" />
                {recurrenceSummary}
              </span>
            )}
          </div>
          {event.attendees?.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-foreground">
                <Users className="h-3 w-3" />
                {event.attendees.length} attendee{event.attendees.length > 1 ? "s" : ""}
              </span>
              {event.attendees.slice(0, 3).map((attendee) => (
                <Badge key={attendee.personId} variant="secondary" className="text-xs">
                  {getPersonName(attendee.personId)}
                </Badge>
              ))}
              {event.attendees.length > 3 && (
                <span>+{event.attendees.length - 3} more</span>
              )}
              <span className="status-chip" data-status="in-progress">
                Workload ≈ {event.attendees.length}h shared
              </span>
            </div>
          ) : null}
        </div>
        <aside className="flex flex-col gap-2 text-right text-xs text-muted-foreground">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={(eventClick) => {
              eventClick.stopPropagation()
              const ics = buildICSForEvent(event)
              initiateDownload(ics, `${event.title.replace(/\s+/g, "-")}.ics`)
            }}
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
          {event.visibility && <span className="capitalize">{event.visibility}</span>}
        </aside>
      </div>
    </button>
  )
}

function EmptyState({ range }: { range: RangeKey }) {
  const copy: Record<RangeKey, string> = {
    today: "No upcoming events today.",
    week: "No upcoming events this week.",
    month: "No upcoming events in this period.",
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
      <Clock className="mb-3 h-12 w-12 opacity-50" />
      <p className="font-medium">{copy[range]}</p>
      <p className="text-sm">Create an event to bring the team together.</p>
    </div>
  )
}

function formatDateLabel(date: Date) {
  const today = new Date()
  const sameDay = today.toDateString() === date.toDateString()
  if (sameDay) return "Today"

  const diffInDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffInDays === 1) return "Tomorrow"

  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

function initiateDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


