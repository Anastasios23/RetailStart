import { Phone, Search, ShoppingBag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CLIENT_STORE,
  getActivePresentationConfig,
} from "@/lib/presentation/client-bundle"

async function searchAction(formData: FormData) {
  "use server"
  const q = String(formData.get("q") ?? "").trim()
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
}

export function StoreHeader() {
  const presentation = getActivePresentationConfig()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex min-h-0 items-center gap-2.5">
            <Image
              src="/brand/logo.jpg"
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-xl object-cover"
              priority
            />
            <span className="text-sm font-semibold leading-tight text-foreground sm:text-base">
              {presentation.branding.name}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <a href={`tel:${CLIENT_STORE.phone_tel}`} aria-label="Τηλέφωνο">
                <Phone />
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href="/cart" aria-label="Καλάθι">
                <ShoppingBag />
              </Link>
            </Button>
          </div>
        </div>

        <form action={searchAction} className="relative" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <label className="sr-only" htmlFor="store-search">
            Αναζήτηση προϊόντων
          </label>
          <Input
            id="store-search"
            name="q"
            type="search"
            placeholder="Τι ψάχνεις σήμερα;"
            className="bg-secondary pl-11"
            autoComplete="off"
          />
        </form>
      </div>
    </header>
  )
}
