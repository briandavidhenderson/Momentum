'use client'

/**
 * Calendar Settings Component
 * Allows users to select which calendars to sync and view sync status
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Calendar, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CalendarConnection, ConnectedCalendar } from '@/lib/types'
import { updateCalendarConnection } from '@/lib/services'
import { syncGoogleCalendar } from '@/lib/calendar/google'
import { syncMicrosoftCalendar } from '@/lib/calendar/microsoft'
import { logger } from '@/lib/logger'
import { useToast } from "@/components/ui/toast"

interface CalendarSettingsProps {
  connection: CalendarConnection
  onUpdate?: () => void
}

export function CalendarSettings({ connection, onUpdate }: CalendarSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [calendars, setCalendars] = useState<ConnectedCalendar[]>(connection.calendars)
  const [syncing, setSyncing] = useState(false)

  const handleToggleCalendar = async (calendarId: string) => {
    setLoading(true)
    try {
      const updatedCalendars = calendars.map(cal =>
        cal.id === calendarId ? { ...cal, isSelected: !cal.isSelected } : cal
      )

      setCalendars(updatedCalendars)

      // Update in Firestore
      await updateCalendarConnection(connection.id, {
        calendars: updatedCalendars
      })

      onUpdate?.()
    } catch (error) {
      logger.error('Error updating calendar selection', error)
      logger.error('Error updating calendar selection', error)
      toast({ title: 'Failed to update calendar selection', variant: 'destructive' })
      // Revert on error
      setCalendars(connection.calendars)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      if (connection.provider === 'google') {
        await syncGoogleCalendar(connection.id)
        toast({ title: 'Calendar synced successfully!' })
        onUpdate?.()
      } else if (connection.provider === 'microsoft') {
        await syncMicrosoftCalendar(connection.id)
        toast({ title: 'Calendar synced successfully!' })
        onUpdate?.()
      }
    } catch (error: any) {
      logger.error('Error syncing calendar', error)
      logger.error('Error syncing calendar', error)
      toast({ title: error.message || 'Failed to sync calendar', variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  const selectedCount = calendars.filter(c => c.isSelected).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {connection.providerAccountName}
            </CardTitle>
            <CardDescription>
              {connection.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} • {selectedCount} of {calendars.length} calendars selected
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connection.status === 'active' && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {connection.status === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing || loading}
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sync Status */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
            <span>Sync Direction:</span>
            <Badge variant="secondary">{connection.syncDirection}</Badge>
          </div>
          {connection.lastSyncedAt && (
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b">
              <span>Last Synced:</span>
              <span>{new Date(connection.lastSyncedAt).toLocaleString()}</span>
            </div>
          )}
          {connection.syncError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {connection.syncError}
            </div>
          )}

          {/* Calendar Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select calendars to sync:</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                >
                  <Checkbox
                    id={`calendar-${calendar.id}`}
                    checked={calendar.isSelected}
                    onCheckedChange={() => handleToggleCalendar(calendar.id)}
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`calendar-${calendar.id}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      {calendar.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: calendar.color }}
                        />
                      )}
                      <span>{calendar.name}</span>
                      {calendar.isPrimary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                    </Label>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground ml-5 mt-1">
                        {calendar.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {calendar.accessRole}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>• Selected calendars will sync automatically every hour</p>
            <p>• External events are read-only and cannot be edited in Momentum</p>
            <p>• Changes in Google Calendar will be reflected here after sync</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
