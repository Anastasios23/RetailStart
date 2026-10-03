import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "../../../lib/medusa/categories"
import { listProductsByCategory } from "../../../lib/medusa/products"
import { ProductGrid } from "../../components/product-grid"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Category products" }

export default async function CategoryPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) notFound()
  const products = await listProductsByCategory(category.id)

  return (
    <main className="page-shell" aria-labelledby="category-title">
      <header className="page-heading">
        <Link className="text-link" href="/categories">All categories</Link>
        <h1 id="category-title">{category.name}</h1>
        <p className="lede">Products directly assigned to this category.</p>
      </header>
      <ProductGrid products={products} emptyMessage="No products are available in this category right now." />
    </main>
  )
}
