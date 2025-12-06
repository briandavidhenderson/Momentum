"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLeaderboard } from "@/lib/services/healthCommunityService";
import { LeaderboardEntry } from "@/lib/types/health.types";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function HealthCommunity() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getLeaderboard("lab_1"); // Hardcoded labId for v1
                setLeaderboard(data);
            } catch (error) {
                console.error("Failed to load leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getTrendIcon = (trend?: "up" | "down" | "same") => {
        switch (trend) {
            case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
            case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Lab Leaderboard</CardTitle>
                            <CardDescription>Weekly activity challenge.</CardDescription>
                        </div>
                        <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center text-muted-foreground">Loading...</div>
                        ) : (
                            leaderboard.map((entry) => (
                                <div key={entry.userId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`font-bold w-6 text-center ${entry.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                                            {entry.rank}
                                        </div>
                                        <Avatar>
                                            <AvatarImage src={entry.avatarUrl} />
                                            <AvatarFallback>{entry.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{entry.displayName}</div>
                                            <div className="text-xs text-muted-foreground">Researcher</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold">{entry.points} pts</div>
                                        {getTrendIcon(entry.trend)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Active Challenges</CardTitle>
                    <CardDescription>Join a challenge to earn points.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                            <h4 className="font-semibold flex items-center gap-2">
                                <ActivityIcon className="h-4 w-4" />
                                100k Steps Challenge
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Hit 100,000 steps this month to win the "Road Runner" badge.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Ends in 12 days</span>
                                <span className="font-medium text-primary">Joined</span>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold">Morning Yoga Streak</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Complete 5 yoga sessions before 9 AM.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Starts next week</span>
                                <button className="text-primary hover:underline font-medium">Join</button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
