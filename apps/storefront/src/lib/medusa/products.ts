import type { HttpTypes } from "@medusajs/types"

import { getMedusaClient, getMedusaPricingContext } from "./client"

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

async function listStoreProducts(
  query: Pick<HttpTypes.StoreProductListParams, "handle"> = {}
) {
  const client = getMedusaClient()
  const pricingContext = getMedusaPricingContext()

  try {
    return await client.store.product.list({
      ...query,
      ...pricingContext,
      fields: productFields,
      limit: 100,
    })
  } catch (error) {
    logCatalogReadFailure(query.handle ? "retrieve-by-handle" : "list", error)
    throw new StorefrontCatalogError()
  }
}

export async function listProducts() {
  const response = await listStoreProducts()
  return response.products
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

export function getCalculatedPrice(
  variant: HttpTypes.StoreProductVariant | undefined
) {
  const calculatedPrice = variant?.calculated_price
  const amount =
    calculatedPrice?.calculated_amount_with_tax ?? calculatedPrice?.calculated_amount
  const currencyCode = calculatedPrice?.currency_code

  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(amount) ||
    !currencyCode
  ) {
    return null
  }

  return {
    amount,
    currencyCode,
  }
}

export type InventoryStatus =
  | "in_stock"
  | "out_of_stock"
  | "unavailable"

export function getInventoryStatus(
  variant: HttpTypes.StoreProductVariant | undefined
): InventoryStatus {
  if (!variant) {
    return "unavailable"
  }

  if (variant.manage_inventory === false) {
    return "in_stock"
  }

  if (variant.inventory_quantity === null || variant.inventory_quantity === undefined) {
    return "unavailable"
  }

  return variant.inventory_quantity > 0 ? "in_stock" : "out_of_stock"
}
