"use client"

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, Clock, FlaskConical, Package, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getInventory } from '@/lib/services/inventoryService'
import { checkConflicts } from '@/lib/services/equipmentBookingService'

export interface ResourceRequirement {
    type: 'reagent' | 'equipment' | 'sample' | 'consumable'
    id: string
    name: string
    quantityNeeded: number
    unit?: string
}

import { InventoryItem } from '@/lib/types/inventory.types'

interface EquipmentBooking {
    id: string
    equipmentId: string
    equipmentName: string
    startTime: Date
    endTime: Date
    userId: string
    userName: string
}

interface ResourceCheckResult {
    resource: ResourceRequirement
    status: 'available' | 'low' | 'unavailable' | 'booked' | 'unknown'
    available: number
    conflicts?: EquipmentBooking[]
    message?: string
}

interface ResourceAvailabilityCheckerProps {
    experimentId?: string
    protocolId?: string
    requiredResources: ResourceRequirement[]
    scheduledTime?: Date
    estimatedDuration?: number // in minutes
    onProceed?: () => void
    onCancel?: () => void
}

export function ResourceAvailabilityChecker({
    experimentId,
    protocolId,
    requiredResources,
    scheduledTime = new Date(),
    estimatedDuration = 60,
    onProceed,
    onCancel,
}: ResourceAvailabilityCheckerProps) {
    const [checking, setChecking] = useState(false)
    const [results, setResults] = useState<ResourceCheckResult[]>([])
    const [overallStatus, setOverallStatus] = useState<'pass' | 'warning' | 'fail'>('pass')

    const checkEquipmentAvailability = useCallback(async (
        resource: ResourceRequirement
    ): Promise<ResourceCheckResult> => {
        try {
            // In a real app, we would query a bookings collection.
            // For now, we'll check the equipment status from the equipment service.
            // If we had a booking service, we'd call `checkAvailability(id, time, duration)`

            // Simulating a check against the equipment list for "Maintenance" status
            // This is a placeholder for a full booking system check
            const equipmentList = await import('@/lib/services/equipmentService').then(m => m.getEquipment())
            const equipment = equipmentList.find(e => e.id === resource.id || e.name === resource.name)

            if (!equipment) {
                return {
                    resource,
                    status: 'unavailable',
                    available: 0,
                    message: 'Equipment not found'
                }
            }

            // Check if maintenance is due
            const maintenanceDue = new Date(equipment.lastMaintained).getTime() + (equipment.maintenanceDays * 86400000) < Date.now()

            if (maintenanceDue) {
                return {
                    resource,
                    status: 'unavailable',
                    available: 0,
                    message: 'Maintenance Overdue'
                }
            }

            // Check for booking conflicts
            const endTime = new Date(scheduledTime.getTime() + estimatedDuration * 60000)
            const conflicts = await checkConflicts(resource.id, scheduledTime, endTime)

            if (conflicts.length > 0) {
                return {
                    resource,
                    status: 'booked',
                    available: 0,
                    conflicts: conflicts.map(c => ({
                        id: c.id,
                        equipmentId: c.equipmentId,
                        equipmentName: c.equipmentName,
                        startTime: c.startTime,
                        endTime: c.endTime,
                        userId: c.bookedBy,
                        userName: c.bookedByName
                    })),
                    message: `Equipment booked during this time`
                }
            }

            return {
                resource,
                status: 'available',
                available: 1,
                message: 'Online & Available'
            }

        } catch (error) {
            console.error("Failed to check equipment", error)
            return {
                resource,
                status: 'unknown',
                available: 0,
                message: 'Failed to check status'
            }
        }
    }, [estimatedDuration, scheduledTime])

    const checkInventoryAvailability = useCallback(async (
        resource: ResourceRequirement
    ): Promise<ResourceCheckResult> => {
        try {
            const inventory = await getInventory()
            // Prefer ID match, fallback to name
            const item = inventory.find(i =>
                (resource.id && i.id === resource.id) ||
                i.productName.toLowerCase() === resource.name.toLowerCase()
            )

            if (!item) {
                return {
                    resource,
                    status: 'unavailable',
                    available: 0,
                    message: `Item not found in inventory`
                }
            }

            const quantityAvailable = item.currentQuantity || 0
            const hasEnough = quantityAvailable >= resource.quantityNeeded
            const isLow = quantityAvailable < (item.minQuantity || 10) && hasEnough

            let status: ResourceCheckResult['status']
            let message: string

            if (!hasEnough) {
                status = 'unavailable'
                message = `Only ${quantityAvailable} ${item.unit || 'units'} available (need ${resource.quantityNeeded})`
            } else if (isLow) {
                status = 'low'
                message = `Low stock: ${quantityAvailable} ${item.unit || 'units'} remaining`
            } else {
                status = 'available'
                message = `${quantityAvailable} ${item.unit || 'units'} available`
            }

            return {
                resource,
                status,
                available: quantityAvailable,
                message,
            }
        } catch (error) {
            console.error("Failed to check inventory", error)
            return {
                resource,
                status: 'unknown',
                available: 0,
                message: "Failed to check inventory"
            }
        }
    }, [])

    const checkResources = useCallback(async () => {
        setChecking(true)
        const checkResults: ResourceCheckResult[] = []

        try {
            for (const resource of requiredResources) {
                let result: ResourceCheckResult

                if (resource.type === 'equipment') {
                    result = await checkEquipmentAvailability(resource)
                } else {
                    result = await checkInventoryAvailability(resource)
                }

                checkResults.push(result)
            }

            setResults(checkResults)

            // Determine overall status
            const hasUnavailable = checkResults.some((r) => r.status === 'unavailable' || r.status === 'booked')
            const hasLow = checkResults.some((r) => r.status === 'low')

            if (hasUnavailable) {
                setOverallStatus('fail')
            } else if (hasLow) {
                setOverallStatus('warning')
            } else {
                setOverallStatus('pass')
            }
        } catch (error) {
            console.error('Error checking resources:', error)
        } finally {
            setChecking(false)
        }
    }, [requiredResources, checkEquipmentAvailability, checkInventoryAvailability])

    const getStatusIcon = (status: ResourceCheckResult['status']) => {
        switch (status) {
            case 'available':
                return <CheckCircle className="h-5 w-5 text-green-600" />
            case 'low':
                return <AlertCircle className="h-5 w-5 text-yellow-600" />
            case 'unavailable':
            case 'booked':
                return <XCircle className="h-5 w-5 text-red-600" />
            default:
                return <AlertCircle className="h-5 w-5 text-gray-400" />
        }
    }

    const getResourceIcon = (type: ResourceRequirement['type']) => {
        switch (type) {
            case 'equipment':
                return <FlaskConical className="h-4 w-4" />
            case 'reagent':
            case 'consumable':
                return <Package className="h-4 w-4" />
            case 'sample':
                return <Package className="h-4 w-4" />
        }
    }

    const canProceed = overallStatus !== 'fail'

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Pre-flight Resource Check
                    {checking && <Clock className="h-5 w-5 animate-spin" />}
                </CardTitle>
                <CardDescription>
                    Checking availability of required resources for this experiment
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Overall Status Alert */}
                {!checking && (
                    <>
                        {overallStatus === 'pass' && (
                            <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>All Resources Available</AlertTitle>
                                <AlertDescription>
                                    You have everything you need to proceed with this experiment.
                                </AlertDescription>
                            </Alert>
                        )}

                        {overallStatus === 'warning' && (
                            <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <AlertTitle>Low Stock Warning</AlertTitle>
                                <AlertDescription>
                                    Some resources are running low. Consider ordering more soon.
                                </AlertDescription>
                            </Alert>
                        )}

                        {overallStatus === 'fail' && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Resource Conflicts Detected</AlertTitle>
                                <AlertDescription>
                                    Some required resources are unavailable or booked. Please resolve conflicts before
                                    proceeding.
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}

                {/* Resource List */}
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {results.map((result, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                            >
                                <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getResourceIcon(result.resource.type)}
                                        <p className="font-medium text-sm">{result.resource.name}</p>
                                        <Badge variant="outline" className="text-xs">
                                            {result.resource.type}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Required: {result.resource.quantityNeeded} {result.resource.unit || 'units'}
                                    </p>
                                    <p className="text-sm">{result.message}</p>

                                    {/* Booking Conflicts */}
                                    {result.conflicts && result.conflicts.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                Booking Conflicts:
                                            </p>
                                            {result.conflicts.map((conflict) => (
                                                <div
                                                    key={conflict.id}
                                                    className="text-xs p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                                                >
                                                    <p className="font-medium">{conflict.userName}</p>
                                                    <p className="text-muted-foreground">
                                                        {conflict.startTime.toLocaleTimeString()} -{' '}
                                                        {conflict.endTime.toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" onClick={onCancel} disabled={checking}>
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={checkResources} disabled={checking}>
                            Recheck
                        </Button>
                        <Button
                            onClick={onProceed}
                            disabled={!canProceed || checking}
                            className={overallStatus === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        >
                            {overallStatus === 'warning' ? 'Proceed with Caution' : 'Proceed'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
