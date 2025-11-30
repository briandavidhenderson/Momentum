import type { Metadata } from "next"
import "./globals.css"
import "./gantt-custom.css"

export const metadata: Metadata = {
  title: "Momentum",
  description: "Offline-first application",
}


import { AppWrapper } from "@/lib/AppContext";
import { ToastProvider } from "@/components/ui/toast";

import ClientErrorLogger from "@/components/ClientErrorLogger";

import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileFAB } from "@/components/layout/MobileFAB";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ClientErrorLogger />
        <ToastProvider>
          <AppWrapper>
            <CommandPalette />
            <MobileFAB />
            {children}
          </AppWrapper>
        </ToastProvider>
      </body>
    </html>
  )
}
