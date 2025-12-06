"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, BarChart2, Users, Plus } from "lucide-react";
import { HealthDashboard } from "@/components/health/HealthDashboard";
import { WorkoutPlanner } from "@/components/health/WorkoutPlanner";
import { WorkoutLogger } from "@/components/health/WorkoutLogger";
import { HealthAnalytics } from "@/components/health/HealthAnalytics";
import { HealthCommunity } from "@/components/health/HealthCommunity";

export function HealthWellbeingView() {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Health & Wellbeing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Balance your research with physical and mental wellness.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setActiveTab("log")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Log Workout
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
                    <TabsTrigger value="dashboard">
                        <Activity className="mr-2 h-4 w-4" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="planner">
                        <Calendar className="mr-2 h-4 w-4" />
                        Planner
                    </TabsTrigger>
                    <TabsTrigger value="log">
                        <BarChart2 className="mr-2 h-4 w-4" />
                        Log
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <BarChart2 className="mr-2 h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="community">
                        <Users className="mr-2 h-4 w-4" />
                        Community
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6">
                    <HealthDashboard onNavigate={setActiveTab} />
                </TabsContent>

                <TabsContent value="planner" className="space-y-6">
                    <WorkoutPlanner />
                </TabsContent>

                <TabsContent value="log" className="space-y-6">
                    <WorkoutLogger />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                    <HealthAnalytics />
                </TabsContent>

                <TabsContent value="community" className="space-y-6">
                    <HealthCommunity />
                </TabsContent>
            </Tabs>
        </div>
    );
}
