"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, AlertTriangle, CheckCircle2, FlaskConical, Timer } from "lucide-react"
import { useAppContext } from "@/lib/AppContext"
import { useMemo } from "react"

export function LabPulseWidget() {
    const {
        equipment,
        activeExecutions = [], // Assuming this is available or we mock it for now if not in context
        dayToDayTasks
    } = useAppContext()

    // 1. Active Protocols (Mock data if not fully available in context yet)
    // In a real scenario, we'd filter activeExecutions from protocolExecutionService
    const activeProtocols = useMemo(() => {
        // Fallback to some dummy data if activeExecutions is empty for visualization
        if (activeExecutions.length > 0) return activeExecutions
        return [
            { id: '1', name: 'Standard DNA Extraction', user: 'Priya Nair', status: 'running', phase: 'Incubation', timeRemaining: '12m' },
            { id: '2', name: 'Western Blot', user: 'Mateo Rossi', status: 'running', phase: 'Blocking', timeRemaining: '45m' },
        ]
    }, [activeExecutions])

    // 2. Equipment Status
    const equipmentStatus = useMemo(() => {
        if (!equipment) return []

        return equipment.map(eq => {
            let status = 'available'
            // Check maintenance
            const lastMaintained = new Date(eq.lastMaintained)
            const nextMaintenance = new Date(lastMaintained.getTime() + eq.maintenanceDays * 24 * 60 * 60 * 1000)
            const now = new Date()

            if (now > nextMaintenance) {
                status = 'maintenance'
            } else if (eq.currentBookingId) {
                status = 'in-use'
            }

            return { ...eq, status }
        })
            .filter(eq => eq.status !== 'available')
            .slice(0, 5)
    }, [equipment])

    // 3. High Priority Alerts
    const alerts = useMemo(() => {
        if (!dayToDayTasks) return []
        return dayToDayTasks.filter(t => t.priority === 'high' && t.status !== 'done').slice(0, 3)
    }, [dayToDayTasks])

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-brand-600" />
                        Lab Pulse
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">
                        Live
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">

                    {/* Active Protocols Section */}
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                            Active Experiments
                        </h4>
                        <div className="space-y-3">
                            {activeProtocols.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No active protocols running.</p>
                            ) : (
                                activeProtocols.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <FlaskConical className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.user} • {p.phase}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                            <Timer className="h-3 w-3" />
                                            {p.timeRemaining}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Equipment Status Section */}
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                            Equipment Status
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {equipmentStatus.length === 0 ? (
                                <div className="col-span-2 text-sm text-muted-foreground italic flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> All systems nominal
                                </div>
                            ) : (
                                equipmentStatus.map((eq) => (
                                    <div key={eq.id} className="flex items-center gap-2 text-sm p-1.5 rounded border bg-white">
                                        <div className={`h-2 w-2 rounded-full ${eq.status === 'maintenance' ? 'bg-red-500' : 'bg-amber-500'
                                            }`} />
                                        <span className="truncate font-medium">{eq.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Alerts Section */}
                    {alerts.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                                Critical Actions
                            </h4>
                            <div className="space-y-2">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{alert.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    )
}
