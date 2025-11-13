'use client'

/**
 * Calendar Event Card Component
 * Displays a calendar event with visual distinction for external events
 */

import { CalendarEvent } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Link2, Lock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventCardProps {
  event: CalendarEvent
  onClick?: () => void
  className?: string
}

export function CalendarEventCard({ event, onClick, className }: CalendarEventCardProps) {
  const isExternal = event.calendarSource && event.calendarSource !== 'manual'
  const isGoogleEvent = event.calendarSource === 'google'
  const isMicrosoftEvent = event.calendarSource === 'microsoft'

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        isExternal && "border-l-4",
        isGoogleEvent && "border-l-blue-500",
        isMicrosoftEvent && "border-l-indigo-500",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="space-y-2">
          {/* Header with title and badges */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base flex-1 line-clamp-2">
              {event.title}
            </h3>
            <div className="flex flex-col gap-1">
              {isExternal && (
                <Badge variant="outline" className="text-xs">
                  {isGoogleEvent && (
                    <>
                      <Calendar className="h-3 w-3 mr-1" />
                      Google
                    </>
                  )}
                  {isMicrosoftEvent && (
                    <>
                      <Calendar className="h-3 w-3 mr-1" />
                      Outlook
                    </>
                  )}
                </Badge>
              )}
              {event.isReadOnly && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Read-only
                </Badge>
              )}
              {event.type && (
                <Badge variant="default" className="text-xs capitalize">
                  {event.type}
                </Badge>
              )}
            </div>
          </div>

          {/* Date and time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDate(event.start)}</span>
            <span>•</span>
            <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* External link */}
          {event.externalUrl && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <ExternalLink className="h-4 w-4" />
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View in {isGoogleEvent ? 'Google Calendar' : isMicrosoftEvent ? 'Outlook' : 'external calendar'}
              </a>
            </div>
          )}

          {/* Description preview */}
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
              {event.description}
            </p>
          )}

          {/* Sync status for external events */}
          {isExternal && event.syncStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              {event.syncStatus === 'synced' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Synced {event.lastSyncedAt && `• ${new Date(event.lastSyncedAt).toLocaleString()}`}</span>
                </>
              )}
              {event.syncStatus === 'pending' && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span>Sync pending</span>
                </>
              )}
              {event.syncStatus === 'error' && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Sync error: {event.syncError}</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
