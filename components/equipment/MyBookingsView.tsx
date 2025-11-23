"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EquipmentBooking, BookingStatus } from "@/lib/types"
import {
  getUserBookings,
  cancelBooking,
  checkOut,
  checkIn,
} from "@/lib/services/equipmentBookingService"
import { useAppContext } from "@/lib/AppContext"
import { logger } from "@/lib/logger"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  StopCircle,
  AlertTriangle,
  Package,
} from "lucide-react"
import { formatDistanceToNow, isPast, isFuture, isWithinInterval } from "date-fns"

interface MyBookingsViewProps {
  onBookingClick?: (booking: EquipmentBooking) => void
  onRecordSupply?: (booking: EquipmentBooking) => void
}

/**
 * My Bookings View
 *
 * Features:
 * - List/Grid view of user's bookings
 * - Filter by status (upcoming, in-progress, completed)
 * - Quick actions: Cancel, Check-in/out, Record supply usage
 * - Status indicators and time remaining
 */
export function MyBookingsView({ onBookingClick, onRecordSupply }: MyBookingsViewProps) {
  const { currentUserProfile, currentUser } = useAppContext()

  const [bookings, setBookings] = useState<EquipmentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"upcoming" | "active" | "completed">("upcoming")

  const loadBookings = useCallback(async () => {
    if (!currentUserProfile) return

    setLoading(true)
    setError(null)

    try {
      const allBookings = await getUserBookings(currentUserProfile.id)
      setBookings(allBookings.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()))
    } catch (err) {
      logger.error("Error loading bookings", err)
      setError("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }, [currentUserProfile])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleCancel = async (bookingId: string) => {
    if (!currentUser || !confirm("Are you sure you want to cancel this booking?")) return

    try {
      await cancelBooking(bookingId, currentUser.uid)
      await loadBookings()
    } catch (err) {
      logger.error("Error cancelling booking", err)
      setError("Failed to cancel booking")
    }
  }

  const handleCheckOut = async (bookingId: string) => {
    if (!currentUser) return

    try {
      await checkOut(bookingId, currentUser.uid)
      await loadBookings()
    } catch (err) {
      logger.error("Error checking out equipment", err)
      setError("Failed to check out equipment")
    }
  }

  const handleCheckIn = async (bookingId: string) => {
    if (!currentUser) return

    try {
      await checkIn(bookingId, currentUser.uid)
      await loadBookings()
    } catch (err) {
      logger.error("Error checking in equipment", err)
      setError("Failed to check in equipment")
    }
  }

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>
      case "confirmed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Confirmed</Badge>
      case "in_progress":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">In Progress</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Completed</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Cancelled</Badge>
      case "no_show":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">No Show</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTimeInfo = (booking: EquipmentBooking) => {
    const now = new Date()
    const start = booking.startTime
    const end = booking.endTime

    if (booking.status === "completed" || booking.status === "cancelled") {
      return <span className="text-sm text-muted-foreground">{start.toLocaleDateString()}</span>
    }

    if (isPast(end)) {
      return (
        <span className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </span>
      )
    }

    if (isWithinInterval(now, { start, end })) {
      return (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <PlayCircle className="w-3 h-3" />
          In progress - ends {formatDistanceToNow(end, { addSuffix: true })}
        </span>
      )
    }

    if (isFuture(start)) {
      return (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Starts {formatDistanceToNow(start, { addSuffix: true })}
        </span>
      )
    }

    return null
  }

  const upcomingBookings = bookings.filter(
    b => (b.status === "confirmed" || b.status === "pending") && isFuture(b.startTime)
  )

  const activeBookings = bookings.filter(
    b => b.status === "in_progress" || (b.status === "confirmed" && !isFuture(b.startTime) && !isPast(b.endTime))
  )

  const completedBookings = bookings.filter(
    b => b.status === "completed" || b.status === "cancelled" || b.status === "no_show"
  )

  const renderBookingCard = (booking: EquipmentBooking) => (
    <Card key={booking.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{booking.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Package className="w-4 h-4" />
              {booking.equipmentName}
            </CardDescription>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Time Information */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleString()}
            </span>
          </div>

          {getTimeInfo(booking)}

          {/* Description */}
          {booking.description && (
            <p className="text-sm text-muted-foreground">{booking.description}</p>
          )}

          {/* Expected Supply Usage */}
          {booking.expectedSupplyUsage && booking.expectedSupplyUsage.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Expected supplies: </span>
              {booking.expectedSupplyUsage.map((s, i) => (
                <span key={i}>
                  {s.inventoryItemName} ({s.estimatedQuantity})
                  {i < booking.expectedSupplyUsage!.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {booking.status === "confirmed" && isFuture(booking.startTime) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBookingClick?.(booking)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancel(booking.id)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}

            {booking.status === "confirmed" && !isFuture(booking.startTime) && !booking.checkedOutAt && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleCheckOut(booking.id)}
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                Check Out
              </Button>
            )}

            {booking.status === "in_progress" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleCheckIn(booking.id)}
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Check In
                </Button>
                {onRecordSupply && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecordSupply(booking)}
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Record Supplies
                  </Button>
                )}
              </>
            )}

            {booking.status === "completed" && booking.actualSupplyUsage && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Supplies recorded
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading bookings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Equipment Bookings</h2>
          <p className="text-muted-foreground">
            Manage your equipment reservations
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {bookings.length} bookings
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No upcoming bookings
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map(renderBookingCard)
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active bookings
              </CardContent>
            </Card>
          ) : (
            activeBookings.map(renderBookingCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed bookings
              </CardContent>
            </Card>
          ) : (
            completedBookings.map(renderBookingCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
