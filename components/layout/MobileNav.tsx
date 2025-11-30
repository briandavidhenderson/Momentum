"use client"

import { Home, ListTodo, CalendarClock, QrCode, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    currentView: string
    onNavigate: (view: string) => void
}

export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
    const navItems = [
        { id: "dashboard", label: "My Day", icon: Home },
        { id: "tasks", label: "Tasks", icon: ListTodo },
        { id: "bookings", label: "Bookings", icon: CalendarClock },
        { id: "scan", label: "Scan", icon: QrCode },
        { id: "menu", label: "Menu", icon: Menu },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-safe-area-inset-bottom z-50 md:hidden">
            <div className="flex items-center justify-around p-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentView === item.id

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-16",
                                isActive
                                    ? "text-brand-600 bg-brand-50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className={cn("h-6 w-6 mb-1", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
