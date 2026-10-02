import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProductPurchaseForm } from "../../components/product-purchase-form"
import { getProductByHandle } from "../../../lib/medusa/products"

export const dynamic = "force-dynamic"

type ProductPageProps = {
  params: Promise<{ handle: string }>
}

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

  return (
    <main className="page-shell product-detail" aria-labelledby="product-title">
      <p className="eyebrow">Product detail</p>
      <h1 id="product-title">{product.title}</h1>

      {product.description?.trim() ? (
        <p className="product-detail__description">{product.description}</p>
      ) : null}

      <ProductPurchaseForm key={product.id} product={product} />
    </main>
  )
}
