import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EquipmentDevice } from "@/lib/types"
import { EquipmentBookingCalendar } from "./EquipmentBookingCalendar"
import { BookingForm } from "./BookingForm"
import { useBookings } from "@/lib/hooks/useBookings"

interface BookingDialogProps {
    device: EquipmentDevice | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BookingDialog({ device, open, onOpenChange }: BookingDialogProps) {
    const [activeTab, setActiveTab] = useState<"calendar" | "book">("calendar")

    // We only fetch if device is present
    const { bookings, loading } = useBookings(undefined, device?.id)

    if (!device) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Book {device.name}</DialogTitle>
                    <DialogDescription>
                        Check availability and book time slots for this equipment.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="calendar">Calendar & Availability</TabsTrigger>
                        <TabsTrigger value="book">New Booking</TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar" className="mt-4">
                        <EquipmentBookingCalendar
                            bookings={bookings}
                            loading={loading}
                            onSelectSlot={(start, end) => {
                                // TODO: Pre-fill form with selected slot
                                setActiveTab("book")
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="book" className="mt-4">
                        <BookingForm
                            equipmentId={device.id}
                            equipmentName={device.name}
                            requiresTraining={device.bookingSettings?.requiresTraining}
                            onSuccess={() => {
                                setActiveTab("calendar")
                                // Optional: Close dialog or show success message
                                // onOpenChange(false) 
                            }}
                            onCancel={() => setActiveTab("calendar")}
                        />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
