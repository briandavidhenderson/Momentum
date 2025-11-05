import type { Metadata } from "next"
import "./globals.css"
import "./gantt-custom.css"

export const metadata: Metadata = {
  title: "Momentum",
  description: "Offline-first application",
}


import { AppWrapper } from "@/lib/AppContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  )
}
