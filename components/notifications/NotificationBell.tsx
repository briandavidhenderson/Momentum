"use client"

import { useState, useEffect } from "react"
import { Bell, Check, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { Notification } from "@/lib/types"
import {
    subscribeToNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "@/lib/services/notificationService"
import { cn } from "@/lib/utils"

export function NotificationBell() {
    const { currentUser } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!currentUser) return

        const unsubscribe = subscribeToNotifications(currentUser.uid, (data) => {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.isRead).length)
        })

        return () => unsubscribe()
    }, [currentUser])

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            await markNotificationAsRead(notification.id)
        }

        if (notification.link) {
            setIsOpen(false)
            router.push(notification.link)
        }
    }

    const handleMarkAllRead = async () => {
        if (!currentUser) return
        await markAllNotificationsAsRead(currentUser.uid)
    }

    if (!currentUser) return null

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-500" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={handleMarkAllRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-slate-50 cursor-pointer transition-colors",
                                        !notification.isRead && "bg-blue-50/50"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground pt-1">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
