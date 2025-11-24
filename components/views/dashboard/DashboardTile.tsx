"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { ComponentProps, ReactNode } from "react"

interface DashboardTileProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string
  children: ReactNode
  className?: string
  "aria-label"?: string
}

export function DashboardTile({ href, children, className, ...linkProps }: DashboardTileProps) {
  return (
    <Link
      href={href}
      {...linkProps}
      className={cn(
        "group block rounded-md border bg-card/80 p-3 transition-colors hover:bg-accent/40 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
        "shadow-sm", // subtle elevation
        className
      )}
    >
      {children}
    </Link>
  )
}
