"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EquipmentDevice, BookingFormData, EquipmentBooking } from "@/lib/types"
import { createBooking, checkConflicts, BookingConflictError } from "@/lib/services/equipmentBookingService"
import { useAppContext } from "@/lib/AppContext"
import { logger } from "@/lib/logger"
import { Calendar, Clock, AlertTriangle } from "lucide-react"

interface QuickBookingDialogProps {
  open: boolean
  onClose: () => void
  equipment: EquipmentDevice | null
  allEquipment: EquipmentDevice[]
  onBookingCreated?: (booking: EquipmentBooking) => void
  defaultStartTime?: Date
  defaultEndTime?: Date
}

/**
 * Quick Booking Dialog
 *
 * Features:
 * - Equipment selector with availability indicator
 * - Date/time picker with conflict highlighting
 * - Optional task linking
 * - Auto-create calendar event toggle
 * - Conflict detection and warnings
 */
export function QuickBookingDialog({
  open,
  onClose,
  equipment: initialEquipment,
  allEquipment,
  onBookingCreated,
  defaultStartTime,
  defaultEndTime,
}: QuickBookingDialogProps) {
  const { currentUserProfile, currentUser } = useAppContext()

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDevice | null>(initialEquipment)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [autoCreateCalendarEvent, setAutoCreateCalendarEvent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<EquipmentBooking[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Initialize default times
  useEffect(() => {
    if (defaultStartTime) {
      setStartTime(formatDateTimeLocal(defaultStartTime))
    } else {
      // Default to next hour
      const nextHour = new Date()
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
      setStartTime(formatDateTimeLocal(nextHour))
    }

    if (defaultEndTime) {
      setEndTime(formatDateTimeLocal(defaultEndTime))
    } else {
      // Default to 2 hours from start
      const twoHoursLater = new Date()
      twoHoursLater.setHours(twoHoursLater.getHours() + 3, 0, 0, 0)
      setEndTime(formatDateTimeLocal(twoHoursLater))
    }
  }, [defaultStartTime, defaultEndTime, open])

  // Update selected equipment when prop changes
  useEffect(() => {
    setSelectedEquipment(initialEquipment)
  }, [initialEquipment])

  // Check for conflicts when times or equipment changes
  useEffect(() => {
    if (selectedEquipment && startTime && endTime) {
      checkForConflicts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEquipment, startTime, endTime])

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const checkForConflicts = async () => {
    if (!selectedEquipment || !startTime || !endTime) return

    setCheckingConflicts(true)
    setConflicts([])

    try {
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)

      if (startDate >= endDate) {
        setError("End time must be after start time")
        setCheckingConflicts(false)
        return
      }

      const foundConflicts = await checkConflicts(
        selectedEquipment.id,
        startDate,
        endDate
      )

      setConflicts(foundConflicts)
      if (foundConflicts.length > 0) {
        setError(`${foundConflicts.length} conflict(s) found for this time slot`)
      } else {
        setError(null)
      }
    } catch (err) {
      logger.error("Error checking conflicts", err)
    } finally {
      setCheckingConflicts(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedEquipment || !currentUserProfile || !currentUser) {
      setError("Missing required information")
      return
    }

    if (!title.trim()) {
      setError("Please enter a booking title")
      return
    }

    if (!startTime || !endTime) {
      setError("Please select start and end times")
      return
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (startDate >= endDate) {
      setError("End time must be after start time")
      return
    }

    if (conflicts.length > 0) {
      setError("Please resolve conflicts before booking")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const bookingData: Omit<EquipmentBooking, 'id' | 'createdAt' | 'updatedAt'> = {
        equipmentId: selectedEquipment.id,
        equipmentName: selectedEquipment.name,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDate,
        endTime: endDate,
        bookedBy: currentUserProfile.id,
        bookedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
        labId: currentUserProfile.labId || '',
        status: 'pending',
        autoCreateCalendarEvent,
        isRecurring: false,
        createdBy: currentUser.uid,
      }

      const bookingId = await createBooking(bookingData, {
        checkConflicts: true,
        autoApprove: !selectedEquipment.bookingSettings?.requireApproval,
        createCalendarEvent: autoCreateCalendarEvent,
      })

      logger.info("Booking created successfully", { bookingId })

      // Notify parent
      if (onBookingCreated) {
        onBookingCreated({ ...bookingData, id: bookingId, createdAt: new Date() })
      }

      // Reset form and close
      resetForm()
      onClose()
    } catch (err) {
      if (err instanceof BookingConflictError) {
        setError(`Booking conflicts detected: ${err.message}`)
        setConflicts(err.conflicts)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to create booking")
      }
      logger.error("Error creating booking", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setError(null)
    setConflicts([])
    setAutoCreateCalendarEvent(true)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Filter bookable equipment
  const bookableEquipment = allEquipment.filter(
    eq => eq.bookingSettings?.bookingEnabled
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Equipment</DialogTitle>
          <DialogDescription>
            Reserve equipment for your experiment or task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Selection */}
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment</Label>
            <Select
              value={selectedEquipment?.id || ""}
              onValueChange={(value) => {
                const equipment = allEquipment.find(eq => eq.id === value)
                setSelectedEquipment(equipment || null)
              }}
            >
              <SelectTrigger id="equipment">
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                {bookableEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name} ({eq.make} {eq.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEquipment?.bookingSettings?.requireApproval && (
              <p className="text-sm text-muted-foreground">
                This equipment requires approval before use
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Booking Title *</Label>
            <Input
              id="title"
              placeholder="e.g., RNA extraction for Project X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this booking..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">
              <Calendar className="inline w-4 h-4 mr-1" />
              Start Time *
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime">
              <Clock className="inline w-4 h-4 mr-1" />
              End Time *
            </Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          {/* Calendar Event Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="calendarEvent"
              checked={autoCreateCalendarEvent}
              onCheckedChange={(checked) => setAutoCreateCalendarEvent(checked === true)}
            />
            <Label htmlFor="calendarEvent" className="text-sm font-normal">
              Add to my calendar
            </Label>
          </div>

          {/* Conflicts Warning */}
          {checkingConflicts && (
            <Alert>
              <AlertDescription>Checking for conflicts...</AlertDescription>
            </Alert>
          )}

          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Conflicts detected:</strong>
                <ul className="mt-2 space-y-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id} className="text-sm">
                      {conflict.title} ({new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && !conflicts.length && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || conflicts.length > 0 || !selectedEquipment}
          >
            {isSubmitting ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
