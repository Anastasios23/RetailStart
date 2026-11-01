import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Pagination } from "@/app/components/pagination"
import { ProductGrid } from "@/app/components/product-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  isPageOutOfRange,
  parsePageParam,
  searchProducts,
  StorefrontCatalogError,
} from "@/lib/medusa/products"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Αναζήτηση",
  description: "Αναζήτηση προϊόντων στον κατάλογο του φαρμακείου.",
}

function parseQueryParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim()
  return ""
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>
}) {
  const resolvedParams = await searchParams
  const query = parseQueryParam(resolvedParams.q)
  const page = parsePageParam(resolvedParams.page)

  let productPage: Awaited<ReturnType<typeof searchProducts>> | null = null
  let catalogUnavailable = false

  if (query) {
    try {
      productPage = await searchProducts(query, page)
      if (isPageOutOfRange(productPage)) notFound()
    } catch (error) {
      if (error instanceof StorefrontCatalogError) {
        catalogUnavailable = true
      } else {
        throw error
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="search-title">
      <header className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
          Αναζήτηση
        </Badge>
        <h1 id="search-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Αναζήτηση προϊόντων
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Βρείτε προϊόντα με λέξη-κλειδί στον κατάλογο του φαρμακείου.
        </p>
      </header>

      <form action="/search" method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="search-input" className="text-sm font-medium">
            Αναζήτηση προϊόντων
          </label>
          <Input
            id="search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="π.χ. Magnelon, sunscreen…"
            required
            className="h-11 rounded-xl"
          />
        </div>
        <Button type="submit" className="sm:mb-0.5">
          Αναζήτηση
        </Button>
      </form>

      {catalogUnavailable ? (
        <p className="text-sm text-muted-foreground">
          Η αναζήτηση δεν είναι διαθέσιμη προσωρινά. Δοκιμάστε ξανά σε λίγο.
        </p>
      ) : !query ? (
        <p className="text-sm text-muted-foreground">Πληκτρολογήστε μια λέξη για να δείτε αποτελέσματα.</p>
      ) : productPage && productPage.products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Δεν βρέθηκαν προϊόντα για «{query}».
        </p>
      ) : productPage ? (
        <section className="flex flex-col gap-4" aria-label="Αποτελέσματα αναζήτησης">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {productPage.count}{" "}
            {productPage.count === 1 ? "προϊόν" : "προϊόντα"} για «{query}»
          </p>
          <ProductGrid products={productPage.products} />
          <Pagination
            basePath={`/search?q=${encodeURIComponent(query)}`}
            page={productPage.page}
            totalPages={productPage.totalPages}
          />
        </section>
      ) : null}
    </main>
  )
}
