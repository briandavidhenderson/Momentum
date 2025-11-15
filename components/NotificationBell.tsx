"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { getFirebaseDb } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from "firebase/firestore"
import { Bell, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logger } from "@/lib/logger"

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  priority: "high" | "medium" | "low"
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: any
  read: boolean
  actionUrl?: string
}

export function NotificationBell() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!currentUser) return

    const db = getFirebaseDb()
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Notification[]
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n) => !n.read).length)
    })

    return () => unsubscribe()
  }, [currentUser])

  const markAsRead = async (notificationId: string) => {
    const db = getFirebaseDb()
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true })
    } catch (error) {
      logger.error("Error marking notification as read", error)
    }
  }

  const markAllAsRead = async () => {
    const db = getFirebaseDb()
    try {
      const unreadNotifs = notifications.filter((n) => !n.read)
      await Promise.all(unreadNotifs.map((n) => markAsRead(n.id)))
    } catch (error) {
      logger.error("Error marking all as read", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return "Just now"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${!notification.read ? "bg-blue-50" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {notification.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">
                        High
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
