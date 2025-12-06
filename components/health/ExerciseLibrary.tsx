"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ExerciseLibrary() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search exercises..."
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Barbell Squat</CardTitle>
                        <CardDescription>Legs • Strength</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                            Video Placeholder
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Bench Press</CardTitle>
                        <CardDescription>Chest • Strength</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                            Video Placeholder
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Deadlift</CardTitle>
                        <CardDescription>Back • Strength</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                            Video Placeholder
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
