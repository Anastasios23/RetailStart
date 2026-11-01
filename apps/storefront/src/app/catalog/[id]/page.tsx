import { redirect } from "next/navigation"

import { getProductByHandle } from "@/lib/medusa/products"

export const dynamic = "force-dynamic"

/**
 * Legacy Wolt-mirror PDP. Browse authority is Medusa (ADR-0154).
 * Redirect to `/products/wolt-{id}` when that handle exists, else `/products`.
 */
export default async function CatalogProductRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const normalized = id.trim().toLowerCase()

  if (normalized) {
    const handle = `wolt-${normalized}`
    try {
      const product = await getProductByHandle(handle)
      if (product?.handle) {
        redirect(`/products/${encodeURIComponent(product.handle)}`)
      }
    } catch {
      // Fall through to products index.
    }
  }

  redirect("/products")
}
