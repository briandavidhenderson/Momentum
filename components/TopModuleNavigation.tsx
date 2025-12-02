"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FlaskConical,
  CircleUser,
  Share2,
  ChevronDown,
  Calendar,
  Shield,
  ListTodo,
  FileText,
  Activity,
  CreditCard,
  Users,
  Server,
  Package,
  Wrench,
  Presentation,
  Wallet,
  DollarSign,
  BrainCircuit,
  Search,
  LucideIcon
} from "lucide-react"
import { QRCodeScanner } from "./QRCodeScanner"
import { NotificationBell } from "./notifications/NotificationBell"
import { useAppContext } from "@/lib/AppContext"

// Type definitions
type SubItem = {
  id: string
  label: string
  icon: LucideIcon
  roleRestricted?: boolean
  adminOnly?: boolean
}

type NavCategory = {
  id: string
  label: string
  activeColor: string
  hoverColor: string
  icon: LucideIcon
  subItems: SubItem[]
  actionId?: string
}

// Refined, Subtle Color Palette
export const NAV_ITEMS: NavCategory[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    // Neutral / Brand Color
    activeColor: "text-slate-900 bg-slate-100 border-slate-200",
    hoverColor: "hover:bg-slate-50 hover:text-slate-900",
    icon: LayoutDashboard,
    subItems: [],
    actionId: "dashboard"
  },
  {
    id: "project",
    label: "Project",
    // Subtle Blue-Grey for Projects
    activeColor: "text-blue-600 bg-blue-50 border-blue-200",
    hoverColor: "hover:bg-blue-50/50 hover:text-blue-600",
    icon: Activity,
    subItems: [],
    actionId: "projects"
  },
  {
    id: "lab",
    label: "Lab",
    // Muted Emerald for Lab
    activeColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    hoverColor: "hover:bg-emerald-50/50 hover:text-emerald-600",
    icon: FlaskConical,
    subItems: [
      { id: "equipment", label: "Equipment", icon: Wrench },
      { id: "orders", label: "Orders", icon: Package },
      { id: "eln", label: "Experiments", icon: FlaskConical },
      { id: "groups", label: "Groups", icon: Users },
      { id: "funding", label: "Funding", icon: DollarSign, roleRestricted: true },
    ]
  },
  {
    id: "me",
    label: "Me",
    // Soft Violet for Personal
    activeColor: "text-violet-600 bg-violet-50 border-violet-200",
    hoverColor: "hover:bg-violet-50/50 hover:text-violet-600",
    icon: CircleUser,
    subItems: [
      { id: "daytoday", label: "Day to Day", icon: Activity },
      { id: "mytasks", label: "My Tasks", icon: ListTodo },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "bookings", label: "My Bookings", icon: Calendar },
      { id: "training", label: "My Training", icon: Shield },
      { id: "privacy", label: "Privacy", icon: Shield },
    ]
  },
  {
    id: "network",
    label: "Network",
    // Neutral Slate for Network
    activeColor: "text-slate-700 bg-slate-100 border-slate-200",
    hoverColor: "hover:bg-slate-50 hover:text-slate-900",
    icon: Share2,
    subItems: [
      { id: "people", label: "People", icon: Users },
      { id: "whiteboard", label: "Whiteboard", icon: Presentation },
      { id: "research", label: "Research Board", icon: BrainCircuit },
      { id: "explore", label: "Explore", icon: Search },
      { id: "profiles", label: "All Profiles", icon: Users, adminOnly: true },
    ]
  }
]

interface TopModuleNavigationProps {
  activeModule?: string
  onSelect?: (moduleId: string) => void
  className?: string
  isAdmin?: boolean
  hasRoleRestriction?: boolean
}

export function TopModuleNavigation({
  activeModule,
  onSelect,
  className,
  isAdmin = false,
  hasRoleRestriction = false
}: TopModuleNavigationProps) {
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const { setCommandPaletteOpen } = useAppContext()

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null)
    } else {
      setSelectedCategory(categoryId)
    }
  }

  return (
    <div className={cn("w-full flex flex-col items-center z-50 select-none text-sm", className)}>
      {/* Navigation Container */}
      <div className="flex flex-wrap justify-center gap-2 p-2 w-full max-w-5xl">
        {NAV_ITEMS.map((category) => {
          const isActive = selectedCategory === category.id || hoveredCategory === category.id
          const isSubItemActive = category.subItems.some(sub => sub.id === activeModule)
          const Icon = category?.icon || Activity // Fallback icon

          // Filter subItems based on permissions
          const visibleSubItems = category.subItems.filter(item => {
            if (item.adminOnly && !isAdmin) return false
            if (item.roleRestricted && !hasRoleRestriction) return false
            return true
          })

          // Don't render category if no visible subitems and not a direct link
          if (visibleSubItems.length === 0 && !category.actionId) return null

          // Direct Link Rendering
          if (category.actionId) {
            const isActive = activeModule === category.actionId
            return (
              <button
                key={category.id}
                onClick={() => onSelect?.(category.actionId!)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-1.5 rounded-md transition-all duration-200 border border-transparent",
                  "font-medium text-slate-500",
                  category.hoverColor,
                  isActive && cn(category.activeColor, "shadow-sm")
                )}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            )
          }

          return (
            <div
              key={category.id}
              className="relative group"
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {/* Main Pill Button - Smaller and subtler */}
              <button
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-1.5 rounded-md transition-all duration-200 border border-transparent",
                  "font-medium text-slate-500",
                  category.hoverColor,
                  // Active State: Subtle background and color shift
                  (isActive || isSubItemActive) && cn(category.activeColor, "shadow-sm")
                )}
              >
                <Icon className="w-4 h-4" />
                {category.label}
                <ChevronDown className={cn(
                  "w-3 h-3 ml-0.5 transition-transform duration-200 opacity-50",
                  isActive ? "rotate-180" : "rotate-0"
                )} />
              </button>

              {/* Mega Menu / Dropdown - Smaller, tighter, cleaner */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 top-full pt-1.5 w-max min-w-[160px] transition-all duration-200 origin-top z-20",
                  isActive
                    ? "opacity-100 translate-y-0 visible scale-100"
                    : "opacity-0 -translate-y-1 invisible scale-95 pointer-events-none"
                )}
              >
                {/* Dropdown Content - Clean white card with shadow */}
                <div className="bg-white rounded-lg p-1 shadow-lg border border-slate-100 flex flex-col gap-0.5">
                  {visibleSubItems.map((item) => {
                    const isItemActive = activeModule === item.id
                    const ItemIcon = item.icon || Activity // Fallback icon

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelect?.(item.id)
                          setSelectedCategory(null)
                          setHoveredCategory(null)
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors text-left",
                          isItemActive
                            ? "bg-slate-50 text-slate-900 font-medium"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <ItemIcon className={cn(
                          "w-3.5 h-3.5",
                          isItemActive ? "text-slate-700" : "text-slate-400"
                        )} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        <div className="ml-2 flex items-center gap-1 pl-2 border-l border-slate-200">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4" />
          </button>
          <NotificationBell />
          <QRCodeScanner />
        </div>
      </div>
    </div>
  )
}

export default TopModuleNavigation
