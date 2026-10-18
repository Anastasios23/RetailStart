import type { Metadata } from "next"

import { getPublicPresentationConfig } from "../lib/presentation/config"
import { SiteHeader } from "./components/site-header"
import "./globals.css"

const presentation = getPublicPresentationConfig()

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
