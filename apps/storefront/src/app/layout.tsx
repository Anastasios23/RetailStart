import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import type { ReactNode } from "react"

import { StoreFooter } from "@/components/store-footer"
import { StoreHeader } from "@/components/store-header"
import { getActivePresentationConfig } from "@/lib/presentation/client-bundle"

import "./globals.css"

const manrope = Manrope({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
  display: "swap",
})

const presentation = getActivePresentationConfig()

export const metadata: Metadata = {
  title: {
    default: presentation.seo.default_title,
    template: presentation.seo.title_template,
  },
  description: presentation.seo.default_description,
  robots: presentation.seo.robots,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="el" className={manrope.variable}>
      <body className="font-sans">
        <StoreHeader />
        {children}
        <StoreFooter />
      </body>
    </html>
  )
}
