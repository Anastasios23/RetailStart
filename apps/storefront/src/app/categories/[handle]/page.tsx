import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "../../../lib/medusa/categories"
import { isPageOutOfRange, listProductsByCategory, parsePageParam } from "../../../lib/medusa/products"
import { Pagination } from "../../components/pagination"
import { ProductGrid } from "../../components/product-grid"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Category products" }

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const { handle } = await params
  const page = parsePageParam((await searchParams).page)
  const category = await getCategoryByHandle(handle)
  if (!category) notFound()
  const productPage = await listProductsByCategory(category.id, page)
  if (isPageOutOfRange(productPage)) notFound()

  return (
    <main className="page-shell" aria-labelledby="category-title">
      <header className="page-heading">
        <Link className="text-link" href="/categories">All categories</Link>
        <h1 id="category-title">{category.name}</h1>
        <p className="lede">Products directly assigned to this category.</p>
      </header>
      <ProductGrid products={productPage.products} emptyMessage="No products are available in this category right now." />
      <Pagination basePath={`/categories/${encodeURIComponent(category.handle)}`} page={productPage.page} totalPages={productPage.totalPages} />
    </main>
  )
}
