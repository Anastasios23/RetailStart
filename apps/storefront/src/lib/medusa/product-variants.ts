import type { HttpTypes } from "@medusajs/types"

export type InventoryStatus = "in_stock" | "out_of_stock" | "unavailable"
export type ProductOption = { id: string; title: string; values: string[] }
export type VariantSelection = {
  status: "resolved" | "incomplete" | "nonexistent" | "ambiguous" | "malformed"
  variant?: HttpTypes.StoreProductVariant
}

export function getCalculatedPrice(variant: HttpTypes.StoreProductVariant | undefined) {
  const price = variant?.calculated_price
  const amount = price?.calculated_amount_with_tax ?? price?.calculated_amount
  const currencyCode = price?.currency_code
  if (
    typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 ||
    typeof currencyCode !== "string" || !/^[a-z]{3}$/i.test(currencyCode)
  ) {
    return null
  }
  return { amount, currencyCode }
}

export function getInventoryStatus(variant: HttpTypes.StoreProductVariant | undefined): InventoryStatus {
  if (!variant) return "unavailable"
  if (variant.manage_inventory === false) return "in_stock"
  const quantity = variant.inventory_quantity
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return "unavailable"
  return quantity > 0 ? "in_stock" : "out_of_stock"
}

export function isVariantPurchasable(variant: HttpTypes.StoreProductVariant | undefined): boolean {
  return Boolean(variant?.id && getCalculatedPrice(variant) && getInventoryStatus(variant) === "in_stock")
}

export function getProductOptions(product: HttpTypes.StoreProduct): ProductOption[] | null {
  if (product.options == null) return []
  if (!Array.isArray(product.options)) return null
  const ids = new Set<string>()
  const options: ProductOption[] = []
  for (const option of product.options) {
    if (!option || typeof option.id !== "string" || !option.id.trim() || ids.has(option.id) ||
      typeof option.title !== "string" || !option.title.trim() ||
      !Array.isArray(option.values) || !option.values.length) return null
    ids.add(option.id)
    const values: string[] = []
    for (const entry of option.values) {
      if (!entry || typeof entry.value !== "string" || !entry.value.trim() ||
        values.includes(entry.value) || (entry.option_id != null && entry.option_id !== option.id)) return null
      values.push(entry.value)
    }
    options.push({ id: option.id, title: option.title, values })
  }
  return options
}

function getVariantValues(variant: HttpTypes.StoreProductVariant, options: ProductOption[]) {
  if (!variant || typeof variant.id !== "string" || !variant.id.trim()) return null
  if (!options.length) {
    return variant.options == null || (Array.isArray(variant.options) && !variant.options.length) ? {} : null
  }
  if (!Array.isArray(variant.options) || variant.options.length !== options.length) return null
  const values: Record<string, string> = Object.create(null)
  for (const entry of variant.options) {
    const option = options.find((candidate) => candidate.id === entry?.option_id)
    if (!option || typeof entry.value !== "string" || !option.values.includes(entry.value) ||
      Object.hasOwn(values, option.id)) return null
    values[option.id] = entry.value
  }
  return values
}

export function resolveVariantSelection(
  product: HttpTypes.StoreProduct,
  selections: Record<string, string>
): VariantSelection {
  const options = getProductOptions(product)
  const variants = product.variants ?? []
  if (!options || !Array.isArray(variants) || (!options.length && variants.length > 1)) {
    return { status: "malformed" }
  }
  const mappings = variants.map((variant) => getVariantValues(variant, options))
  if (mappings.some((mapping) => !mapping) || new Set(variants.map((variant) => variant.id)).size !== variants.length) {
    return { status: "malformed" }
  }
  if (Object.keys(selections).some((id) => !options.some((option) => option.id === id))) {
    return { status: "malformed" }
  }
  if (options.some((option) => !Object.hasOwn(selections, option.id) || selections[option.id] === "")) {
    return { status: "incomplete" }
  }
  if (options.some((option) => !option.values.includes(selections[option.id]))) {
    return { status: "nonexistent" }
  }
  const matches = variants.filter((_, index) =>
    options.every((option) => mappings[index]![option.id] === selections[option.id])
  )
  if (!matches.length) return { status: "nonexistent" }
  if (matches.length !== 1) return { status: "ambiguous" }
  return { status: "resolved", variant: matches[0] }
}

export function getAutomaticVariant(product: HttpTypes.StoreProduct): HttpTypes.StoreProductVariant | undefined {
  const options = getProductOptions(product)
  const variants = product.variants ?? []
  if (!options || !Array.isArray(variants)) return undefined
  const candidates = variants.length === 1 ? variants : variants.filter(isVariantPurchasable)
  if (candidates.length !== 1) return undefined
  const values = getVariantValues(candidates[0], options)
  if (!values) return undefined
  const result = resolveVariantSelection(product, values)
  return result.status === "resolved" ? result.variant : undefined
}
