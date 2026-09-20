import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Retail Starter",
  description: "Retail Starter storefront shell",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
