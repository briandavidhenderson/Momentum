import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, addMinutes } from 'date-fns'
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { EquipmentBooking } from '@/lib/types/booking.types'
import { useBookings } from '@/lib/hooks/useBookings'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { checkEquipmentTraining } from '@/lib/services/trainingService'

const bookingSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    date: z.date(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    description: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface BookingFormProps {
    equipmentId: string
    equipmentName: string
    requiresTraining?: boolean
    onSuccess?: () => void
    onCancel?: () => void
}

export function BookingForm({ equipmentId, equipmentName, requiresTraining, onSuccess, onCancel }: BookingFormProps) {
    const { addBooking, checkConflicts } = useBookings(undefined, equipmentId)
    const { currentUserProfile, currentUser } = useAuth()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [trainingStatus, setTrainingStatus] = useState<{ allowed: boolean; reason?: string } | null>(null)

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            title: '',
            date: new Date(),
            startTime: format(new Date(), 'HH:mm'),
            endTime: format(addMinutes(new Date(), 60), 'HH:mm'),
            description: '',
        },
    })

    // Check training on mount
    React.useEffect(() => {
        async function checkTraining() {
            if (requiresTraining && currentUser && equipmentId) {
                const status = await checkEquipmentTraining(currentUser.uid, equipmentId)
                setTrainingStatus(status)
            }
        }
        checkTraining()
    }, [requiresTraining, currentUser, equipmentId])

    const onSubmit = async (data: BookingFormValues) => {
        if (!currentUser || !currentUserProfile) {
            toast({ title: 'Error', description: 'You must be logged in to book equipment', variant: 'destructive' })
            return
        }

        // Proactive check block
        if (requiresTraining && trainingStatus && !trainingStatus.allowed) {
            form.setError('root', { message: trainingStatus.reason || 'Training required.' })
            return
        }

        setIsSubmitting(true)
        try {
            // Parse dates
            const [startHour, startMinute] = data.startTime.split(':').map(Number)
            const [endHour, endMinute] = data.endTime.split(':').map(Number)

            const start = new Date(data.date)
            start.setHours(startHour, startMinute, 0, 0)

            const end = new Date(data.date)
            end.setHours(endHour, endMinute, 0, 0)

            if (end <= start) {
                form.setError('endTime', { message: 'End time must be after start time' })
                setIsSubmitting(false)
                return
            }

            // Check conflicts
            const conflicts = await checkConflicts(equipmentId, start, end)
            if (conflicts.length > 0) {
                form.setError('root', { message: 'This time slot conflicts with an existing booking.' })
                setIsSubmitting(false)
                return
            }

            // Double check training requirements (in case it wasn't loaded yet)
            if (requiresTraining) {
                const status = await checkEquipmentTraining(currentUser.uid, equipmentId)
                if (!status.allowed) {
                    form.setError('root', { message: status.reason || 'You do not have the required training to book this equipment.' })
                    setIsSubmitting(false)
                    return
                }
            }

            // Create booking
            const displayName = `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            const newBooking: EquipmentBooking = {
                id: crypto.randomUUID(),
                equipmentId,
                equipmentName,
                labId: currentUserProfile.labId || '',
                bookedBy: currentUserProfile.id,
                bookedByName: displayName,
                startTime: start,
                endTime: end,
                title: data.title,
                description: data.description,
                status: 'confirmed', // Auto-confirm for now
                createdAt: new Date(),
                updatedAt: new Date(),
                isRecurring: false,
                autoCreateCalendarEvent: true,
                createdBy: currentUser.uid,
            }

            await addBooking(newBooking)
            toast({ title: 'Booking Confirmed', description: `You have booked ${equipmentName}.` })
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to create booking', variant: 'destructive' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            {requiresTraining && trainingStatus && !trainingStatus.allowed && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-sm text-red-800">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Training Required</p>
                        <p>{trainingStatus.reason || "You must complete training before booking this equipment."}</p>
                    </div>
                </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Experiment name or purpose" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date < new Date(new Date().setHours(0, 0, 0, 0))
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-4">
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type="time" {...field} />
                                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type="time" {...field} />
                                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Additional details..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {form.formState.errors.root && (
                    <div className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {form.formState.errors.root.message}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isSubmitting || (requiresTraining && trainingStatus?.allowed === false)}
                        className={requiresTraining && trainingStatus?.allowed === false ? "opacity-50 cursor-not-allowed" : ""}
                    >
                        {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
