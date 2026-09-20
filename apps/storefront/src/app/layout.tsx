import type { Metadata } from "next"

import { SiteHeader } from "./components/site-header"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Retail Starter",
    template: "%s | Retail Starter",
  },
  description: "A server-rendered product catalog powered by Medusa.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
