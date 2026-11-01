import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Pagination } from "@/app/components/pagination"
import { ProductGrid } from "@/app/components/product-grid"
import { MedusaCategoryRow } from "@/components/medusa-category-row"
import { Badge } from "@/components/ui/badge"
import { listCategories } from "@/lib/medusa/categories"
import {
  isPageOutOfRange,
  listProducts,
  parsePageParam,
  searchProducts,
  StorefrontCatalogError,
} from "@/lib/medusa/products"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Προϊόντα",
  description: "Κατάλογος προϊόντων personal care, wellness και καλλυντικών.",
}

function parseQueryParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim()
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim()
  return ""
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>
}) {
  const params = await searchParams
  const query = parseQueryParam(params.q)
  const page = parsePageParam(params.page)

  let productPage
  let categories: Awaited<ReturnType<typeof listCategories>> = []

  try {
    ;[productPage, categories] = await Promise.all([
      query ? searchProducts(query, page) : listProducts(page),
      listCategories(),
    ])
  } catch (error) {
    if (error instanceof StorefrontCatalogError) {
      return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Προϊόντα</h1>
          <p className="text-sm text-muted-foreground">
            Ο κατάλογος δεν είναι διαθέσιμος προσωρινά. Δοκιμάστε ξανά σε λίγο.
          </p>
        </main>
      )
    }
    throw error
  }

  if (isPageOutOfRange(productPage)) notFound()

  const basePath = query ? `/products?q=${encodeURIComponent(query)}` : "/products"

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="products-title">
      <header className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
          Κατάλογος
        </Badge>
        <h1 id="products-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Προϊόντα
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {query
            ? `${productPage.count} αποτελέσματα για «${query}».`
            : `${productPage.count.toLocaleString("el-CY")} προϊόντα από το κατάστημα.`}
        </p>
      </header>

      <MedusaCategoryRow categories={categories} />

      <ProductGrid
        products={productPage.products}
        emptyMessage={
          query
            ? "Δεν βρέθηκαν προϊόντα για αυτή την αναζήτηση."
            : "Δεν υπάρχουν προϊόντα αυτή τη στιγμή."
        }
      />
      <Pagination
        basePath={basePath}
        page={productPage.page}
        totalPages={productPage.totalPages}
      />
    </main>
  )
}
