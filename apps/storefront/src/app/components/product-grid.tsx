import type { HttpTypes } from "@medusajs/types"
import Link from "next/link"

import { getCalculatedPrice, getInventoryStatus, getPrimaryVariant } from "../../lib/medusa/products"
import { formatMoney } from "../../lib/money"

const displayLocale = "en-CY"

const inventoryLabels = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  unavailable: "Availability unavailable",
} as const

export function ProductGrid({ products, emptyMessage = "No products are available right now." }: {
  products: HttpTypes.StoreProduct[]
  emptyMessage?: string
}) {
  return (
    <>
      {products.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
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
