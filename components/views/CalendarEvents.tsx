"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { Calendar } from "lucide-react"
import { CalendarConnections } from "@/components/CalendarConnections"
import { CalendarView } from "./CalendarView"

export function CalendarEvents() {
  const { currentUserProfile: profile } = useAuth()

  return (
    <div className="space-y-6">
      {/* Calendar View */}
      <CalendarView />

      {/* Calendar Connections */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          External Calendar Connections
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your Google or Microsoft calendar to sync events automatically.
        </p>
        <CalendarConnections
          currentUserProfile={profile}
          onConnectionChange={() => {
            window.location.reload()
          }}
        />
      </div>
    </div>
  )
}
