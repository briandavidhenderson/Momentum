"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EquipmentDevice, AvailabilitySlot } from "@/lib/types"
import { getAvailability } from "@/lib/services/equipmentBookingService"
import { logger } from "@/lib/logger"
import { Calendar, AlertTriangle, Wrench } from "lucide-react"
import { addDays, format, startOfDay, endOfDay, differenceInHours } from "date-fns"

interface EquipmentAvailabilityTimelineProps {
  equipment: EquipmentDevice
  days?: number
  onSlotClick?: (start: Date, end: Date) => void
}

/**
 * Equipment Availability Timeline
 *
 * Features:
 * - Horizontal timeline showing next 7-14 days
 * - Color-coded blocks: available (green), booked (blue), maintenance (orange)
 * - Hover to see booking details
 * - Click available slot to quick-book
 */
export function EquipmentAvailabilityTimeline({
  equipment,
  days = 7,
  onSlotClick,
}: EquipmentAvailabilityTimelineProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)

  useEffect(() => {
    loadAvailability()
  }, [equipment.id, days])

  const loadAvailability = async () => {
    setLoading(true)
    setError(null)

    try {
      const startDate = startOfDay(new Date())
      const endDate = endOfDay(addDays(startDate, days - 1))

      const availability = await getAvailability(equipment.id, startDate, endDate)
      setSlots(availability)
    } catch (err) {
      logger.error("Error loading availability", err)
      setError("Failed to load availability")
    } finally {
      setLoading(false)
    }
  }

  const getDaySlots = (dayIndex: number): AvailabilitySlot[] => {
    const dayStart = startOfDay(addDays(new Date(), dayIndex))
    const dayEnd = endOfDay(dayStart)

    return slots.filter((slot) => {
      const slotStart = slot.start
      const slotEnd = slot.end

      // Check if slot overlaps with this day
      return (
        (slotStart >= dayStart && slotStart < dayEnd) ||
        (slotEnd > dayStart && slotEnd <= dayEnd) ||
        (slotStart < dayStart && slotEnd > dayEnd)
      )
    })
  }

  const getSlotColor = (type: AvailabilitySlot["type"]) => {
    switch (type) {
      case "available":
        return "bg-green-100 hover:bg-green-200 border-green-300"
      case "booked":
        return "bg-blue-100 border-blue-300"
      case "maintenance":
        return "bg-orange-100 border-orange-300"
      default:
        return "bg-gray-100 border-gray-300"
    }
  }

  const getSlotLabel = (type: AvailabilitySlot["type"]) => {
    switch (type) {
      case "available":
        return "Available"
      case "booked":
        return "Booked"
      case "maintenance":
        return "Maintenance"
      default:
        return type
    }
  }

  const renderDayTimeline = (dayIndex: number) => {
    const daySlots = getDaySlots(dayIndex)
    const dayDate = addDays(new Date(), dayIndex)

    if (daySlots.length === 0) {
      return (
        <div className="h-12 flex items-center justify-center bg-green-50 border border-green-200 rounded">
          <span className="text-xs text-green-700">Fully Available</span>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {daySlots.map((slot, idx) => {
          const duration = differenceInHours(slot.end, slot.start)
          const isClickable = slot.type === "available" && onSlotClick

          return (
            <div
              key={idx}
              className={`
                p-2 rounded border text-xs
                ${getSlotColor(slot.type)}
                ${isClickable ? "cursor-pointer" : ""}
                transition-colors
              `}
              onClick={() => {
                if (isClickable) {
                  onSlotClick(slot.start, slot.end)
                }
              }}
              title={`${getSlotLabel(slot.type)} - ${format(slot.start, "HH:mm")} to ${format(slot.end, "HH:mm")} (${duration}h)`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{getSlotLabel(slot.type)}</span>
                <span className="text-muted-foreground">
                  {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
                </span>
              </div>
              {duration >= 2 && (
                <div className="text-muted-foreground mt-1">
                  {duration} hour{duration !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading availability...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Availability Timeline
            </CardTitle>
            <CardDescription>
              Next {days} days for {equipment.name}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadAvailability}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" />
            <span>Maintenance</span>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: days }).map((_, dayIndex) => {
            const dayDate = addDays(new Date(), dayIndex)
            const isToday = dayIndex === 0

            return (
              <div key={dayIndex} className="space-y-2">
                <div
                  className={`
                    font-medium text-sm p-2 rounded
                    ${isToday ? "bg-blue-50 text-blue-700" : "bg-gray-50"}
                  `}
                >
                  {format(dayDate, "EEE, MMM d")}
                  {isToday && <span className="ml-2 text-xs">(Today)</span>}
                </div>
                {renderDayTimeline(dayIndex)}
              </div>
            )
          })}
        </div>

        {/* Equipment Maintenance Info */}
        {equipment.maintenanceDays && equipment.lastMaintained && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
            <Wrench className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-orange-900">Maintenance Schedule</p>
              <p className="text-sm text-orange-700">
                Every {equipment.maintenanceDays} days • Last maintained:{" "}
                {format(new Date(equipment.lastMaintained), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        )}

        {onSlotClick && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Click on available slots to create a booking
          </p>
        )}
      </CardContent>
    </Card>
  )
}
