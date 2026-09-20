import type { Metadata } from "next"
import Link from "next/link"

import {
  getCalculatedPrice,
  getInventoryStatus,
  getPrimaryVariant,
  listProducts,
} from "../../lib/medusa/products"
import { formatMoney } from "../../lib/money"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the current products available from Retail Starter.",
}

const displayLocale = "en-CY"

const inventoryLabels = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  unavailable: "Availability unavailable",
} as const

export default async function ProductsPage() {
  const products = await listProducts()

  return (
    <main className="page-shell" aria-labelledby="products-title">
      <header className="page-heading">
        <p className="eyebrow">Catalog</p>
        <h1 id="products-title">Products</h1>
        <p className="lede">Current product information from the commerce backend.</p>
      </header>

      <ProductList products={products} />
    </main>
  )
}

function ProductList({ products }: { products: Awaited<ReturnType<typeof listProducts>> }) {
  return (
    <>
      {products.length === 0 ? (
        <p className="empty-state">No products are available right now.</p>
      ) : (
        <ul className="product-grid">
          {products.map((product) => {
            const variant = getPrimaryVariant(product)
            const price = getCalculatedPrice(variant)
            const inventoryStatus = getInventoryStatus(variant)

            return (
              <li className="product-card" key={product.id}>
                <div className="product-card__content">
                  <p className="product-card__eyebrow">Physical product</p>
                  <h2>
                    {product.handle ? (
                      <Link href={`/products/${product.handle}`}>{product.title}</Link>
                    ) : (
                      product.title
                    )}
                  </h2>
                  {product.subtitle ? <p>{product.subtitle}</p> : null}
                  <div className="product-card__facts">
                    <p className="price">
                      {price
                        ? formatMoney(price.amount, price.currencyCode, displayLocale)
                        : "Price unavailable"}
                    </p>
                    <p className={`stock stock--${inventoryStatus}`}>
                      {inventoryLabels[inventoryStatus]}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
