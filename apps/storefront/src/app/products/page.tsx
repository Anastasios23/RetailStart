import type { Metadata } from "next"
import { listProducts } from "../../lib/medusa/products"
import { ProductGrid } from "../components/product-grid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the current products available from Retail Starter.",
}

export default async function ProductsPage() {
  const products = await listProducts()

  return (
    <main className="page-shell" aria-labelledby="products-title">
      <header className="page-heading">
        <p className="eyebrow">Catalog</p>
        <h1 id="products-title">Products</h1>
        <p className="lede">Current product information from the commerce backend.</p>
      </header>

      <ProductGrid products={products} />
    </main>
  )
}
