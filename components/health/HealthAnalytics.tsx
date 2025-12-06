"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/useAuth";
import { getHealthMetrics } from "@/lib/services/healthService";
import { HealthMetric } from "@/lib/types/health.types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from "date-fns";

export function HealthAnalytics() {
    const { currentUserProfile } = useAuth();
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            if (!currentUserProfile?.id) return;
            try {
                const data = await getHealthMetrics(currentUserProfile.id, 30);
                setMetrics(data);
            } catch (error) {
                console.error("Failed to load metrics", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUserProfile?.id) {
            loadMetrics();
        }
    }, [currentUserProfile?.id]);

    const chartData = metrics.map(m => ({
        date: format(parseISO(m.date), 'MMM d'),
        weight: m.weight,
        sleep: m.sleepHours,
        stress: m.stressLevel,
        mood: m.mood
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                <p className="text-muted-foreground">Trends over the last 30 days</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sleep">Sleep</TabsTrigger>
                    <TabsTrigger value="weight">Weight</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Sleep & Recovery</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="date" className="text-xs" />
                                            <YAxis />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            />
                                            <Line type="monotone" dataKey="sleep" stroke="#8884d8" strokeWidth={2} name="Sleep (hrs)" />
                                            <Line type="monotone" dataKey="stress" stroke="#82ca9d" strokeWidth={2} name="Stress (1-5)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Recent Logs</CardTitle>
                                <CardDescription>
                                    You logged {metrics.length} days this month.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {metrics.slice(-5).reverse().map((metric) => (
                                        <div key={metric.id} className="flex items-center">
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">{format(parseISO(metric.date), 'EEEE, MMM d')}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Sleep: {metric.sleepHours}h | Mood: {metric.mood}/5
                                                </p>
                                            </div>
                                            <div className="ml-auto font-medium">
                                                {metric.weight ? `${metric.weight} kg` : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Additional tabs can be implemented similarly */}
            </Tabs>
        </div>
    );
}
