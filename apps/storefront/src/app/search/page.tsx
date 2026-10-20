import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isPageOutOfRange, parsePageParam, searchProducts } from "../../lib/medusa/products"
import { Pagination } from "../components/pagination"
import { ProductGrid } from "../components/product-grid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Search",
  description: "Search products in the Retail Starter catalog.",
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

  let productPage = null
  if (query) {
    productPage = await searchProducts(query, page)
    if (isPageOutOfRange(productPage)) {
      notFound()
    }
  }

  return (
    <main className="page-shell" aria-labelledby="search-title">
      <header className="page-heading">
        <p className="eyebrow">Catalog</p>
        <h1 id="search-title">Search</h1>
        <p className="lede">Find products by keyword across the current catalog.</p>
      </header>

      <form action="/search" method="GET" className="search-form" role="search">
        <label htmlFor="search-input" className="search-label">
          Search products
        </label>
        <div className="search-form__input-group">
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search products..."
            className="search-input"
            required
          />
          <button type="submit" className="button button--primary search-button">
            Search
          </button>
        </div>
      </form>

      {!query ? (
        <section className="search-status" aria-live="polite">
          <p className="search-prompt">Enter a keyword to search the product catalog.</p>
        </section>
      ) : productPage && productPage.products.length === 0 ? (
        <section className="search-status" aria-live="polite">
          <p className="empty-state">No products found matching &ldquo;{query}&rdquo;.</p>
        </section>
      ) : productPage ? (
        <section className="search-results" aria-label="Search results">
          <p className="search-count" aria-live="polite">
            Found {productPage.count} {productPage.count === 1 ? "product" : "products"} for &ldquo;{query}&rdquo;
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
