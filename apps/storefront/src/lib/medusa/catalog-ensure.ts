import type { DemoProduct } from "@/lib/presentation/demo-catalog"

import { StorefrontConfigurationError } from "./client"

export type EnsuredCatalogVariant = {
  product_id: string
  handle: string
  variant_id: string
  created: boolean
}

function backendConfig() {
  const backendUrl = process.env.MEDUSA_BACKEND_URL?.trim()
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY?.trim()
  const ensureSecret = process.env.CATALOG_ENSURE_SECRET?.trim()

  if (!backendUrl || !publishableKey || !ensureSecret) {
    throw new StorefrontConfigurationError(
      "Missing MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, or CATALOG_ENSURE_SECRET"
    )
  }

  return { backendUrl, publishableKey, ensureSecret }
}

export async function ensureCatalogVariant(
  product: Pick<DemoProduct, "id" | "title" | "brand" | "price_eur" | "image">
): Promise<EnsuredCatalogVariant> {
  const { backendUrl, publishableKey, ensureSecret } = backendConfig()

  const response = await fetch(`${backendUrl}/store/catalog/ensure`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-publishable-api-key": publishableKey,
      "x-catalog-ensure-secret": ensureSecret,
    },
    body: JSON.stringify({
      id: product.id,
      title: product.title,
      brand: product.brand,
      price_eur: product.price_eur,
      image: product.image,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      `Could not prepare product for cart (${response.status})${detail ? `: ${detail}` : ""}`
    )
  }

  return (await response.json()) as EnsuredCatalogVariant
}
