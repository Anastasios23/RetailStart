import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getCalculatedPrice,
  getInventoryStatus,
  getPrimaryVariant,
  getProductByHandle,
} from "../../../lib/medusa/products"
import { formatMoney } from "../../../lib/money"

export const dynamic = "force-dynamic"

type ProductPageProps = {
  params: Promise<{ handle: string }>
}

const displayLocale = "en-CY"

const inventoryLabels = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  unavailable: "Availability unavailable",
} as const

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    return {
      title: "Product unavailable",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: product.title,
    description:
      product.description?.trim() ||
      `View current details and availability for ${product.title}.`,
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    notFound()
  }

  const variant = getPrimaryVariant(product)
  const price = getCalculatedPrice(variant)
  const inventoryStatus = getInventoryStatus(variant)

  return (
    <main className="page-shell product-detail" aria-labelledby="product-title">
      <p className="eyebrow">Product detail</p>
      <h1 id="product-title">{product.title}</h1>

      {product.description?.trim() ? (
        <p className="product-detail__description">{product.description}</p>
      ) : null}

      <section className="product-detail__summary" aria-labelledby="summary-title">
        <h2 id="summary-title" className="sr-only">
          Product summary
        </h2>
        <p className="price price--large">
          {price
            ? formatMoney(price.amount, price.currencyCode, displayLocale)
            : "Price unavailable"}
        </p>
        <p className={`stock stock--${inventoryStatus}`}>
          {inventoryLabels[inventoryStatus]}
        </p>
      </section>

      {variant ? (
        <section className="variant-details" aria-labelledby="variant-title">
          <h2 id="variant-title">Variant</h2>
          <dl className="facts-list">
            {variant.title ? (
              <div>
                <dt>Name</dt>
                <dd>{variant.title}</dd>
              </div>
            ) : null}
            {variant.sku ? (
              <div>
                <dt>SKU</dt>
                <dd>{variant.sku}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="empty-state">Variant details are currently unavailable.</p>
      )}
    </main>
  )
}
