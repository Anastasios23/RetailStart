import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isPageOutOfRange, listProducts, parsePageParam } from "../../lib/medusa/products"
import { Pagination } from "../components/pagination"
import { ProductGrid } from "../components/product-grid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the current products available from Retail Starter.",
}

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const productPage = await listProducts(parsePageParam((await searchParams).page))
  if (isPageOutOfRange(productPage)) notFound()

  return (
    <main className="page-shell" aria-labelledby="products-title">
      <header className="page-heading">
        <p className="eyebrow">Catalog</p>
        <h1 id="products-title">Products</h1>
        <p className="lede">Current product information from the commerce backend.</p>
      </header>

      <ProductGrid products={productPage.products} />
      <Pagination basePath="/products" page={productPage.page} totalPages={productPage.totalPages} />
    </main>
  )
}
