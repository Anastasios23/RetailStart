import type { HttpTypes } from "@medusajs/types"

import { getMedusaClient, getMedusaPricingContext } from "./client"

export { getCalculatedPrice, getInventoryStatus } from "./product-variants"
export type { InventoryStatus } from "./product-variants"

export const productFields =
  "*variants.calculated_price,+variants.inventory_quantity"

export class StorefrontCatalogError extends Error {
  constructor() {
    super("The storefront catalog could not be loaded")
    this.name = "StorefrontCatalogError"
  }
}

function logCatalogReadFailure(operation: string, error: unknown) {
  console.error("Medusa Store API product read failed", {
    operation,
    errorName: error instanceof Error ? error.name : "UnknownError",
  })
}

export const productPageSize = 24
// Medusa 2.21.0 treats `order` as a single field name, so a comma-separated
// "title,id" is not supported. `id` is unique, hence deterministic paging.
const productListOrder = "id"

export type ProductPage = {
  products: HttpTypes.StoreProduct[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

async function listStoreProducts(
  query: Pick<HttpTypes.StoreProductListParams, "handle" | "category_id" | "limit" | "offset" | "order"> = {}
) {
  const client = getMedusaClient()
  const pricingContext = getMedusaPricingContext()

  try {
    return await client.store.product.list({
      limit: 100,
      ...query,
      ...pricingContext,
      fields: productFields,
    })
  } catch (error) {
    logCatalogReadFailure(query.handle ? "retrieve-by-handle" : "list", error)
    throw new StorefrontCatalogError()
  }
}

// Missing, malformed, zero, negative, or unsafe values fall back to page 1.
export function parsePageParam(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}

// A page past the last one is not found. An empty catalog has one page (page 1).
export function isPageOutOfRange({ page, totalPages }: ProductPage) {
  return page > totalPages
}

async function listProductPage(
  query: Pick<HttpTypes.StoreProductListParams, "category_id">,
  page: number
): Promise<ProductPage> {
  const offset = (page - 1) * productPageSize
  const response = await listStoreProducts({
    ...query,
    limit: productPageSize,
    offset,
    order: productListOrder,
  })

  // Fail closed on a malformed or shifted page rather than showing wrong products.
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(response.count) ||
    response.count < 0 ||
    response.offset !== offset ||
    response.products.length > productPageSize ||
    new Set(response.products.map((product) => product.id)).size !== response.products.length
  ) {
    logCatalogReadFailure("list-page", new Error("InvalidPage"))
    throw new StorefrontCatalogError()
  }

  return {
    products: response.products,
    count: response.count,
    page,
    pageSize: productPageSize,
    totalPages: Math.max(1, Math.ceil(response.count / productPageSize)),
  }
}

export function listProducts(page = 1) {
  return listProductPage({}, page)
}

export function listProductsByCategory(categoryId: string, page = 1) {
  return listProductPage({ category_id: [categoryId] }, page)
}

export async function getProductByHandle(handle: string) {
  const response = await listStoreProducts({ handle })
  return response.products[0] ?? null
}

export function getPrimaryVariant(
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProductVariant | undefined {
  return product.variants?.[0]
}
