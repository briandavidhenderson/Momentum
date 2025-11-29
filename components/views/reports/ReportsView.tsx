"use client"

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppContext } from '@/lib/AppContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react'

export function ReportsView() {
    const { userBookings, projects } = useAppContext()

    // 1. Equipment Usage Data
    const equipmentUsage = useMemo(() => {
        const usageMap: Record<string, number> = {}
        userBookings.forEach(booking => {
            const durationHours = (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60)
            usageMap[booking.equipmentName] = (usageMap[booking.equipmentName] || 0) + durationHours
        })

        return Object.entries(usageMap)
            .map(([name, hours]) => ({ name, hours }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5) // Top 5
    }, [userBookings])

    // 2. Project Status Data
    const projectStatus = useMemo(() => {
        const statusMap: Record<string, number> = {}
        projects.forEach(p => {
            const status = p.status || 'active'
            statusMap[status] = (statusMap[status] || 0) + 1
        })

        return Object.entries(statusMap).map(([name, value]) => ({ name, value }))
    }, [projects])

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

    return (
        <div className="space-y-6 p-6">
            <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground">Overview of lab activity and project health.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Equipment Usage Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            Equipment Usage (Hours)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {equipmentUsage.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={equipmentUsage} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="hours" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No booking data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Project Status Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <PieChartIcon className="h-4 w-4 text-emerald-500" />
                            Project Status Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {projectStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {projectStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No project data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
