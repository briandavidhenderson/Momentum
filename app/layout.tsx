import type { Metadata } from "next"
import "./globals.css"
import "./gantt-custom.css"

export const metadata: Metadata = {
  title: "Momentum",
  description: "Offline-first application",
}


import { AppWrapper } from "@/lib/AppContext";
import { ToastProvider } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider>
          <AppWrapper>{children}</AppWrapper>
        </ToastProvider>
      </body>
    </html>
  )
}
