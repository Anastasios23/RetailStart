import type { HttpTypes } from "@medusajs/types"

import { getMedusaClient } from "./client"
import { StorefrontCatalogError } from "./products"

// Flat authoritative records, including the parent identity; no descendant tree.
const categoryFields = "id,name,handle,parent_category_id"
const pageSize = 100
const maxPages = 100

async function readCategories(query: HttpTypes.StoreProductCategoryListParams) {
  try {
    return await getMedusaClient().store.category.list({
      ...query,
      fields: categoryFields,
      include_descendants_tree: false,
    })
  } catch (error) {
    console.error("Medusa Store API category read failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    throw new StorefrontCatalogError()
  }
}

export async function listCategories(): Promise<HttpTypes.StoreProductCategory[]> {
  const categories: HttpTypes.StoreProductCategory[] = []
  const seen = new Set<string>()
  let expectedCount: number | undefined

  for (let page = 0; page < maxPages; page++) {
    const response = await readCategories({ limit: pageSize, offset: categories.length, order: "id" })
    // Fail closed on incomplete or shifting pagination, never return a partial index.
    if (!Number.isSafeInteger(response.count) || response.count < 0 ||
        (expectedCount !== undefined && response.count !== expectedCount) ||
        response.offset !== categories.length) {
      throw new StorefrontCatalogError()
    }
    expectedCount = response.count
    for (const category of response.product_categories) {
      if (seen.has(category.id)) throw new StorefrontCatalogError()
      seen.add(category.id)
      categories.push(category)
    }
    if (categories.length === expectedCount) return categories
    if (categories.length > expectedCount || response.product_categories.length === 0) {
      throw new StorefrontCatalogError()
    }
  }
  throw new StorefrontCatalogError()
}

export async function getCategoryByHandle(handle: string) {
  const response = await readCategories({ handle, limit: 2 })
  if (response.count === 0 && response.product_categories.length === 0) return null
  const category = response.product_categories[0]
  if (response.count !== 1 || response.product_categories.length !== 1 || category.handle !== handle) {
    throw new StorefrontCatalogError()
  }
  return category
}
