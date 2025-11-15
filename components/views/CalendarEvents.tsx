"use client"

import { useState } from "react"
import { useAppContext } from "@/lib/AppContext"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users, Plus, Edit2, Trash2 } from "lucide-react"
import { CalendarEvent } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { EventDialog } from "@/components/EventDialog"

export function CalendarEvents() {
  const {
    events,
    people,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    people = [],  // Fix Bug #9: Get people from context for event attendees
  } = useAppContext()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Fix Bug #9: Add dialog state for event creation
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined)

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'deadline': return 'bg-red-100 text-red-800 border-red-300'
      case 'milestone': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'training': return 'bg-green-100 text-green-800 border-green-300'
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return <Users className="h-4 w-4" />
      case 'deadline': return <Clock className="h-4 w-4" />
      case 'milestone': return <Calendar className="h-4 w-4" />
      case 'training': return <Calendar className="h-4 w-4" />
      case 'other': return <MapPin className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const sortedEvents = events
    ? [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    : []

  const upcomingEvents = sortedEvents.filter(
    event => new Date(event.start) >= new Date()
  ).slice(0, 10)

  const pastEvents = sortedEvents.filter(
    event => new Date(event.start) < new Date()
  ).slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar & Events</h1>
          <p className="text-muted-foreground mt-1">
            Manage lab meetings, deadlines, experiments, and equipment bookings
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEvent(null)
            setIsEventDialogOpen(true)
          }}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* View Mode Toggle - Disabled until calendar grid views are implemented */}
      {/* <div className="flex gap-2 border-b border-border">
        <Button
          onClick={() => setViewMode('day')}
          variant={viewMode === 'day' ? 'default' : 'ghost'}
          className={viewMode === 'day' ? 'bg-brand-500 text-white' : ''}
        >
          Day
        </Button>
        <Button
          onClick={() => setViewMode('week')}
          variant={viewMode === 'week' ? 'default' : 'ghost'}
          className={viewMode === 'week' ? 'bg-brand-500 text-white' : ''}
        >
          Week
        </Button>
        <Button
          onClick={() => setViewMode('month')}
          variant={viewMode === 'month' ? 'default' : 'ghost'}
          className={viewMode === 'month' ? 'bg-brand-500 text-white' : ''}
        >
          Month
        </Button>
      </div> */}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {events?.filter((e: CalendarEvent) => e.type === 'meeting').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Meetings</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded">
              <Clock className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {events?.filter((e: CalendarEvent) => e.type === 'deadline').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Deadlines</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {events?.filter((e: CalendarEvent) => e.type === 'milestone').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Milestones</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded">
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {events?.filter((e: CalendarEvent) => e.type === 'training').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Training</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </h2>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-4 ${getEventTypeColor(event.type)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventTypeIcon(event.type)}
                      <h3 className="font-semibold">{event.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent?.(event.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(event.start).toLocaleString()}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees.length} attendee(s)</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming events. Click &quot;New Event&quot; to create one.
              </div>
            )}
          </div>
        </div>

        {/* Past Events */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Past Events
          </h2>
          <div className="space-y-3">
            {pastEvents.length > 0 ? (
              pastEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-2 rounded-lg p-4 bg-muted/50 border-border opacity-75"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventTypeIcon(event.type)}
                      <h3 className="font-semibold text-muted-foreground">{event.title}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(event.start).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No past events to display.
              </div>
            )}
          </div>
        </div>
      </div>

      <EventDialog
        open={isEventDialogOpen}
        mode={editingEvent ? "edit" : "create"}
        people={people || []}
        onClose={() => {
          setIsEventDialogOpen(false)
          setEditingEvent(null)
        }}
        onSubmit={(event) => {
          if (editingEvent) {
            handleUpdateEvent?.(editingEvent.id, event)
          } else {
            handleCreateEvent?.(event)
          }
          setIsEventDialogOpen(false)
          setEditingEvent(null)
        }}
        initialEvent={editingEvent || undefined}
        onDelete={(eventId) => {
          handleDeleteEvent?.(eventId)
          setIsEventDialogOpen(false)
          setEditingEvent(null)
        }}
      />
    </div>
  )
}
