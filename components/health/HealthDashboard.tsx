"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Flame, Moon, Footprints, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getHealthMetrics, getUpcomingSessions } from "@/lib/services/healthService";
import { HealthMetric, WorkoutSession } from "@/lib/types/health.types";
import { format } from "date-fns";
import { LogWellnessDialog } from "./LogWellnessDialog";

interface HealthDashboardProps {
    onNavigate: (tab: string) => void;
}

export function HealthDashboard({ onNavigate }: HealthDashboardProps) {
    const { currentUserProfile } = useAuth();
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [upcomingSessions, setUpcomingSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogDialog, setShowLogDialog] = useState(false);

    const loadData = React.useCallback(async () => {
        if (!currentUserProfile?.id) return;
        try {
            const [fetchedMetrics, fetchedSessions] = await Promise.all([
                getHealthMetrics(currentUserProfile.id, 7), // Last 7 days
                getUpcomingSessions(currentUserProfile.id)
            ]);
            setMetrics(fetchedMetrics);
            setUpcomingSessions(fetchedSessions);
        } catch (error) {
            console.error("Failed to load health data", error);
        } finally {
            setLoading(false);
        }
    }, [currentUserProfile?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate stats
    const weeklyWorkouts = metrics.filter(m => m.notes?.includes("workout") || false).length; // Placeholder until we link sessions to metrics

    // Sleep Avg
    const sleepMetrics = metrics.filter(m => m.sleepHours !== undefined);
    const avgSleep = sleepMetrics.length > 0
        ? sleepMetrics.reduce((acc, curr) => acc + (curr.sleepHours || 0), 0) / sleepMetrics.length
        : 0;

    // Water Today
    const today = new Date().toISOString().split('T')[0];
    const todayMetric = metrics.find(m => m.date === today);
    const waterToday = todayMetric?.waterIntakeLitres || 0;
    const waterGoal = 2.5;
    const waterProgress = Math.min((waterToday / waterGoal) * 100, 100);

    // Recovery Score (Simple Algorithm)
    // Base 100. -10 per stress point > 2. -10 per hour of sleep < 7.
    const lastMetric = metrics[metrics.length - 1];
    let recoveryScore = 100;
    let recoveryStatus = "Unknown";
    let recoveryColor = "bg-gray-500";

    if (lastMetric) {
        const stress = lastMetric.stressLevel || 3;
        const sleep = lastMetric.sleepHours || 7;

        if (stress > 2) recoveryScore -= (stress - 2) * 15;
        if (sleep < 7) recoveryScore -= (7 - sleep) * 10;

        if (recoveryScore >= 80) {
            recoveryStatus = "Ready to Train";
            recoveryColor = "bg-green-500";
        } else if (recoveryScore >= 50) {
            recoveryStatus = "Moderate Fatigue";
            recoveryColor = "bg-yellow-500";
        } else {
            recoveryStatus = "Needs Rest";
            recoveryColor = "bg-red-500";
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <LogWellnessDialog
                open={showLogDialog}
                onOpenChange={setShowLogDialog}
                onSaved={loadData}
            />

            {/* Quick Stats Cards */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{upcomingSessions.length} scheduled</div>
                    <p className="text-xs text-muted-foreground">Keep it up!</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Sleep</CardTitle>
                    <Moon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgSleep.toFixed(1)} hrs</div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Calories Burned</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">Requires wearable sync</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Steps (Avg)</CardTitle>
                    <Footprints className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">Requires wearable sync</p>
                </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="col-span-2 lg:col-span-3 grid gap-6">
                <Card className="col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Upcoming Workouts</CardTitle>
                            <CardDescription>Your scheduled sessions for this week.</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onNavigate("planner")}>
                            <Plus className="h-4 w-4 mr-2" /> Plan Workout
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {upcomingSessions.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingSessions.map((session) => (
                                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <Activity className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{session.name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(session.scheduledAt), "EEEE, MMM d 'at' h:mm a")}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">Start</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No upcoming workouts scheduled.
                                <br />
                                <Button variant="link" className="mt-2" onClick={() => onNavigate("planner")}>Plan a workout</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar / Recommendations */}
            <div className="col-span-2 lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Goal</CardTitle>
                        <CardDescription>Drink {waterGoal}L of water</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{waterToday}L consumed</span>
                                <span>{Math.round(waterProgress)}%</span>
                            </div>
                            <Progress value={waterProgress} />
                        </div>
                        <Button
                            className="w-full mt-4"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowLogDialog(true)}
                        >
                            Log Water & Wellness
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recovery Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lastMetric ? (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={`h-3 w-3 rounded-full ${recoveryColor}`} />
                                    <span className="font-medium">{recoveryStatus}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Based on your last log ({lastMetric.sleepHours}h sleep, Stress: {lastMetric.stressLevel}/5).
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-4">
                                Log your sleep and stress to see recovery status.
                            </p>
                        )}

                        <Button variant="outline" className="w-full" onClick={() => setShowLogDialog(true)}>
                            Update Status <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
