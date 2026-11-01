import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

const SALES_CHANNEL_ID = "sc_01M2Z57MFRYW86MF0Q0YXDB901"
const SHIPPING_PROFILE_ID = "sp_01M2Z56201DZEJ7QB2VV891EYV"

type EnsureBody = {
  id?: unknown
  title?: unknown
  brand?: unknown
  price_eur?: unknown
  image?: unknown
}

function readSecret(req: MedusaStoreRequest) {
  const header = req.headers["x-catalog-ensure-secret"]
  return typeof header === "string" ? header : ""
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null
  }

  const candidate = body as EnsureBody
  const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
  const title = typeof candidate.title === "string" ? candidate.title.trim() : ""
  const brand =
    typeof candidate.brand === "string" ? candidate.brand.trim() : ""
  const image =
    typeof candidate.image === "string" ? candidate.image.trim() : ""
  const price =
    typeof candidate.price_eur === "number"
      ? candidate.price_eur
      : typeof candidate.price_eur === "string"
        ? Number(candidate.price_eur)
        : NaN

  if (!id || !/^[a-f0-9]{16,64}$/i.test(id)) return null
  if (!title || title.length > 256) return null
  if (!Number.isFinite(price) || price <= 0 || price > 10000) return null

  return {
    id,
    title,
    brand: brand.slice(0, 120),
    image: image.slice(0, 2048),
    price_eur: Math.round(price * 100) / 100,
  }
}

function handleFor(id: string) {
  return `wolt-${id.toLowerCase()}`
}

function skuFor(id: string) {
  return `WOLT-${id.toUpperCase()}`
}

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const expected = process.env.CATALOG_ENSURE_SECRET || ""
  if (!expected || readSecret(req) !== expected) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const parsed = parseBody(req.body)
  if (!parsed) {
    res.status(400).json({ message: "Invalid catalog product payload" })
    return
  }

  const handle = handleFor(parsed.id)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const existing = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
    filters: { handle },
  })

  const existingProduct = existing.data?.[0] as
    | { id: string; handle: string; variants?: Array<{ id: string; sku?: string }> }
    | undefined

  if (existingProduct?.variants?.[0]?.id) {
    res.json({
      product_id: existingProduct.id,
      handle: existingProduct.handle,
      variant_id: existingProduct.variants[0].id,
      created: false,
    })
    return
  }

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title: parsed.title,
          handle,
          status: "published",
          subtitle: parsed.brand || undefined,
          description: parsed.brand
            ? `${parsed.brand} · διαθέσιμο για online παραγγελία`
            : "Διαθέσιμο για online παραγγελία",
          thumbnail: parsed.image || undefined,
          images: parsed.image ? [{ url: parsed.image }] : [],
          shipping_profile_id: SHIPPING_PROFILE_ID,
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: skuFor(parsed.id),
              manage_inventory: false,
              allow_backorder: false,
              options: { Default: "Default" },
              prices: [
                {
                  currency_code: "eur",
                  amount: parsed.price_eur,
                },
              ],
            },
          ],
          sales_channels: [{ id: SALES_CHANNEL_ID }],
          metadata: {
            source: "wolt-mirror",
            wolt_id: parsed.id,
          },
        },
      ],
    },
  })

  const created = result[0]
  const variantId = created?.variants?.[0]?.id

  if (!variantId) {
    // Fallback query if workflow result shape differs
    const productModule = req.scope.resolve(Modules.PRODUCT)
    const [product] = await productModule.listProducts(
      { handle },
      { relations: ["variants"] }
    )
    const fallbackVariant = product?.variants?.[0]?.id
    if (!fallbackVariant) {
      res.status(500).json({ message: "Product created without variant" })
      return
    }

    res.status(201).json({
      product_id: product.id,
      handle: product.handle,
      variant_id: fallbackVariant,
      created: true,
    })
    return
  }

  res.status(201).json({
    product_id: created.id,
    handle: created.handle,
    variant_id: variantId,
    created: true,
  })
}
