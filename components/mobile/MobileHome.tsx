"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { useAppContext } from '@/lib/AppContext'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, Calendar, CheckSquare, QrCode, LogOut, Menu } from 'lucide-react'
import { format } from 'date-fns'

export function MobileHome() {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { dayToDayTasks, activeExecutions, currentUserProfile, setMainView } = useAppContext()

    // 1. Next Task
    const nextTask = dayToDayTasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => (a.priority === 'critical' ? -1 : 1))[0]

    // 2. Active Experiments
    const myActiveExecutions = activeExecutions.filter(e => e.performedBy === currentUserProfile?.id)

    // Mock next booking for now
    const nextBooking: any = null

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Mobile Header */}
            <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="font-bold text-lg">Momentum</h1>
                    <p className="text-xs text-muted-foreground">Welcome, {currentUserProfile?.firstName}</p>
                </div>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Active Protocol Card */}
                {myActiveExecutions.length > 0 && (
                    <Card className="border-green-200 bg-green-50/50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 animate-pulse" />
                                Now Running
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myActiveExecutions.map(exec => (
                                <div key={exec.id} className="space-y-2">
                                    <div className="font-bold text-lg">{exec.protocolTitle}</div>
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline" className="bg-white">Step {exec.currentStepIndex + 1}</Badge>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setMainView('bench')}>
                                            Resume
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Up Next Widget */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Up Next</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {nextBooking ? (
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <Calendar className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <div className="font-medium text-sm">{nextBooking.equipmentName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(nextBooking.startTime), 'HH:mm')} - {format(new Date(nextBooking.endTime), 'HH:mm')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">No upcoming bookings</div>
                        )}

                        {nextTask && (
                            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <CheckSquare className="h-5 w-5 text-orange-600" />
                                <div>
                                    <div className="font-medium text-sm">{nextTask.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Priority: {nextTask.priority}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 bg-white" onClick={() => setMainView('scan')}>
                        <QrCode className="h-8 w-8 text-slate-700" />
                        Scan QR
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 bg-white" onClick={() => setMainView('bench')}>
                        <FlaskConical className="h-8 w-8 text-emerald-600" />
                        New Run
                    </Button>
                </div>
            </div>

            {/* Bottom Tab Bar */}
            <div className="bg-white border-t p-2 grid grid-cols-4 gap-1 safe-area-bottom">
                <Button variant="ghost" className="flex flex-col gap-1 h-14" onClick={() => setMainView('mobile_home')}>
                    <div className="h-5 w-5 bg-primary/20 rounded-full" />
                    <span className="text-[10px]">Home</span>
                </Button>
                <Button variant="ghost" className="flex flex-col gap-1 h-14" onClick={() => setMainView('mytasks')}>
                    <CheckSquare className="h-5 w-5" />
                    <span className="text-[10px]">Tasks</span>
                </Button>
                <Button variant="ghost" className="flex flex-col gap-1 h-14" onClick={() => setMainView('calendar')}>
                    <Calendar className="h-5 w-5" />
                    <span className="text-[10px]">Plan</span>
                </Button>
                <Button variant="ghost" className="flex flex-col gap-1 h-14 text-red-500" onClick={() => {/* Logout logic */ }}>
                    <LogOut className="h-5 w-5" />
                    <span className="text-[10px]">Exit</span>
                </Button>
            </div>
        </div>
    )
}
