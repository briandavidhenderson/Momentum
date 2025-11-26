"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, GraduationCap, Users, Beer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodayBlockProps {
    title: string
    subtitle: string
    time: string
    icon: React.ElementType
    colorClass: string
    bgClass: string
}

function TodayBlock({ title, subtitle, time, icon: Icon, colorClass, bgClass }: TodayBlockProps) {
    return (
        <div className={cn("flex flex-col p-3 rounded-xl min-w-[140px] flex-1", bgClass)}>
            <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">{title}</div>
                <Icon className={cn("h-4 w-4", colorClass)} />
            </div>
            <div className="mt-auto">
                <div className="font-semibold text-sm leading-tight">{subtitle}</div>
                <div className="text-xs text-muted-foreground mt-1">{time}</div>
            </div>
        </div>
    )
}

export function TodayOverview() {
    // Mock data based on wireframe
    const blocks = [
        {
            title: "Event Details",
            subtitle: "Coffee morning",
            time: "9am - 10am",
            icon: Calendar,
            colorClass: "text-orange-600",
            bgClass: "bg-orange-50/80 hover:bg-orange-100/80 transition-colors cursor-pointer"
        },
        {
            title: "Training Details",
            subtitle: "Safety Briefing",
            time: "12pm - 1pm",
            icon: GraduationCap,
            colorClass: "text-blue-600",
            bgClass: "bg-blue-50/80 hover:bg-blue-100/80 transition-colors cursor-pointer"
        },
        {
            title: "Meeting",
            subtitle: "Team Sync",
            time: "2pm - 4pm",
            icon: Users,
            colorClass: "text-emerald-600",
            bgClass: "bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors cursor-pointer"
        },
        {
            title: "Event",
            subtitle: "Pub Social",
            time: "9pm",
            icon: Beer,
            colorClass: "text-purple-600",
            bgClass: "bg-purple-50/80 hover:bg-purple-100/80 transition-colors cursor-pointer"
        }
    ]

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
                <div className="flex flex-wrap gap-3">
                    {blocks.map((block, index) => (
                        <TodayBlock key={index} {...block} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
