'use client'

/**
 * Calendar Connections Component
 * Allows users to connect/disconnect Google Calendar and Microsoft Outlook
 * Displays connection status and manages OAuth flow
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { linkGoogleCalendar, unlinkGoogleCalendar, isGoogleCalendarLinked, getGoogleCalendarConnectionId, syncGoogleCalendar } from '@/lib/calendar/google'
import { linkMicrosoftCalendar, unlinkMicrosoftCalendar, isMicrosoftCalendarLinked, getMicrosoftCalendarConnectionId } from '@/lib/calendar/microsoft'
import { PersonProfile } from '@/lib/types'
import { logger } from '@/lib/logger'

interface CalendarConnectionsProps {
  currentUserProfile: PersonProfile | null
  onConnectionChange?: () => void
}

export function CalendarConnections({ currentUserProfile, onConnectionChange }: CalendarConnectionsProps) {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)

  const googleConnected = currentUserProfile ? isGoogleCalendarLinked(currentUserProfile) : false
  const microsoftConnected = currentUserProfile ? isMicrosoftCalendarLinked(currentUserProfile) : false

  const googleConnectionId = currentUserProfile ? getGoogleCalendarConnectionId(currentUserProfile) : null
  const microsoftConnectionId = currentUserProfile ? getMicrosoftCalendarConnectionId(currentUserProfile) : null

  const handleConnectGoogle = async () => {
    setGoogleLoading(true)
    setLoading(true)
    try {
      const success = await linkGoogleCalendar()
      if (success) {
        // Show success message
        alert('Google Calendar connected successfully!')
        // Trigger refresh of user profile
        onConnectionChange?.()
      } else {
        alert('Failed to connect Google Calendar')
      }
    } catch (error: any) {
      logger.error('Error connecting Google Calendar', error)
      alert(error.message || 'Failed to connect Google Calendar')
    } finally {
      setGoogleLoading(false)
      setLoading(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!googleConnectionId) return

    if (!confirm('Are you sure you want to disconnect Google Calendar? This will stop syncing events from Google Calendar.')) {
      return
    }

    setGoogleLoading(true)
    setLoading(true)
    try {
      await unlinkGoogleCalendar(googleConnectionId)
      alert('Google Calendar disconnected')
      onConnectionChange?.()
    } catch (error: any) {
      logger.error('Error disconnecting Google Calendar', error)
      alert(error.message || 'Failed to disconnect Google Calendar')
    } finally {
      setGoogleLoading(false)
      setLoading(false)
    }
  }

  const handleSyncGoogle = async () => {
    if (!googleConnectionId) return

    setGoogleLoading(true)
    setLoading(true)
    try {
      await syncGoogleCalendar(googleConnectionId)
      alert('Google Calendar synced successfully!')
      onConnectionChange?.()
    } catch (error: any) {
      logger.error('Error syncing Google Calendar', error)
      alert(error.message || 'Failed to sync Google Calendar')
    } finally {
      setGoogleLoading(false)
      setLoading(false)
    }
  }

  const handleConnectMicrosoft = async () => {
    setMicrosoftLoading(true)
    setLoading(true)
    try {
      const success = await linkMicrosoftCalendar()
      if (success) {
        alert('Microsoft Calendar connected successfully!')
        onConnectionChange?.()
      } else {
        alert('Failed to connect Microsoft Calendar')
      }
    } catch (error: any) {
      logger.error('Error connecting Microsoft Calendar', error)
      alert(error.message || 'Microsoft Calendar integration coming in Phase 5')
    } finally {
      setMicrosoftLoading(false)
      setLoading(false)
    }
  }

  const handleDisconnectMicrosoft = async () => {
    if (!microsoftConnectionId) return

    if (!confirm('Are you sure you want to disconnect Microsoft Calendar? This will stop syncing events from Microsoft Calendar.')) {
      return
    }

    setMicrosoftLoading(true)
    setLoading(true)
    try {
      await unlinkMicrosoftCalendar(microsoftConnectionId)
      alert('Microsoft Calendar disconnected')
      onConnectionChange?.()
    } catch (error: any) {
      logger.error('Error disconnecting Microsoft Calendar', error)
      alert(error.message || 'Failed to disconnect Microsoft Calendar')
    } finally {
      setMicrosoftLoading(false)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Calendar Connections</h2>
        <p className="text-sm text-muted-foreground">
          Connect your external calendars to automatically sync events with Momentum.
        </p>
      </div>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sync events from your Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {googleConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="default" className="bg-green-500">Connected</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="secondary">Not Connected</Badge>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {googleConnected ? (
                <>
                  <Button
                    onClick={handleSyncGoogle}
                    disabled={loading || googleLoading}
                    variant="default"
                  >
                    {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sync Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnectGoogle}
                    disabled={loading || googleLoading}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectGoogle}
                  disabled={loading || googleLoading}
                >
                  {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </div>
          {googleConnected && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>✓ Events are being synced from Google Calendar</p>
              <p className="text-xs mt-1">Syncs automatically every hour</p>
              <p className="text-xs mt-1">Connection ID: {googleConnectionId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microsoft Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Microsoft Outlook
          </CardTitle>
          <CardDescription>
            Sync events from your Outlook/Office 365 calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {microsoftConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="default" className="bg-green-500">Connected</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="secondary">Not Connected</Badge>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {microsoftConnected ? (
                <Button
                  variant="outline"
                  onClick={handleDisconnectMicrosoft}
                  disabled={loading || microsoftLoading}
                >
                  {microsoftLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleConnectMicrosoft}
                  disabled={loading || microsoftLoading}
                  variant="outline"
                >
                  {microsoftLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect Outlook Calendar
                </Button>
              )}
            </div>
          </div>
          {microsoftConnected && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>✓ Events are being synced from Microsoft Calendar</p>
              <p className="text-xs mt-1">Connection ID: {microsoftConnectionId}</p>
            </div>
          )}
          {!microsoftConnected && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p className="text-xs">Coming in Phase 5 of calendar integration</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <p className="font-semibold">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Connect your calendar using OAuth (secure authorization)</li>
              <li>Events are automatically imported from your external calendar</li>
              <li>External events appear alongside your Momentum events</li>
              <li>You can disconnect at any time</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
