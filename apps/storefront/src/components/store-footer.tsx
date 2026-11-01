import Link from "next/link"

import { Separator } from "@/components/ui/separator"
import {
  CLIENT_STORE,
  getActivePresentationConfig,
} from "@/lib/presentation/client-bundle"

export function StoreFooter() {
  const presentation = getActivePresentationConfig()
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLIENT_STORE.maps_query)}`

  return (
    <footer className="mt-10 border-t border-border bg-secondary/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold">{presentation.branding.name}</p>
          <p className="text-sm text-muted-foreground">{presentation.branding.tagline}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Επικοινωνία</p>
          <a className="text-muted-foreground hover:text-foreground" href={`tel:${CLIENT_STORE.phone_tel}`}>
            {CLIENT_STORE.phone}
          </a>
          <a className="text-muted-foreground hover:text-foreground" href={`mailto:${CLIENT_STORE.email}`}>
            {CLIENT_STORE.email}
          </a>
          <a
            className="text-muted-foreground hover:text-foreground"
            href={mapsHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {CLIENT_STORE.address_lines.join(", ")}
          </a>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Ωράριο</p>
          {CLIENT_STORE.hours.map((row) => (
            <p key={row.label} className="text-muted-foreground">
              <span className="text-foreground">{row.label}:</span> {row.value}
            </p>
          ))}
        </div>
      </div>

      <Separator />

      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-4 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Κατάλογος
        </Link>
        <a href={CLIENT_STORE.social.instagram} rel="noopener noreferrer" target="_blank" className="hover:text-foreground">
          Instagram
        </a>
        <a href={CLIENT_STORE.social.facebook} rel="noopener noreferrer" target="_blank" className="hover:text-foreground">
          Facebook
        </a>
        <a href={CLIENT_STORE.social.wolt} rel="noopener noreferrer" target="_blank" className="hover:text-foreground">
          Παράδοση Wolt
        </a>
      </div>
    </footer>
  )
}
