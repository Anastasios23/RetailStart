import { z } from "@medusajs/framework/zod"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BulkImportBatchPayload,
  CategoryImportPayload,
  ImportUnit,
  InventoryImportPayload,
  PriceImportPayload,
  ProductImportPayload,
  VariantImportPayload,
} from "./types"

const kebabCaseRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const operationalAttributionSchema = z.object({
  principal_id: z.string().min(1, "Principal ID is required"),
  principal_type: z.enum(["admin", "service"]),
  source_interface: z.enum(["admin_import", "cli", "workflow", "api"]),
  correlation_id: z.string().optional(),
  target_environment: z.string().optional(),
  timestamp: z.string().optional(),
})

export const categoryImportPayloadSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  handle: z.string().regex(kebabCaseRegex, "Handle must be lowercase kebab-case"),
  parent_category_handle: z.string().regex(kebabCaseRegex, "Parent handle must be lowercase kebab-case").optional(),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
})

export const productImportPayloadSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().regex(kebabCaseRegex, "Handle must be lowercase kebab-case"),
  description: z.string().optional(),
  category_handles: z.array(z.string().regex(kebabCaseRegex)).optional(),
  status: z.enum(["draft", "proposed", "published", "rejected"]).default("published"),
})

export const variantImportPayloadSchema = z.object({
  product_handle: z.string().regex(kebabCaseRegex, "Product handle must be lowercase kebab-case"),
  title: z.string().min(1, "Variant title is required"),
  sku: z.string().min(1, "SKU is required"),
  options: z.record(z.string(), z.string()).optional(),
  manage_inventory: z.boolean().default(true),
})

export const priceImportPayloadSchema = z.object({
  variant_sku: z.string().min(1, "Variant SKU is required"),
  amount: z.number().int().nonnegative("Price amount must be a non-negative integer"),
  currency_code: z.string().length(3).toLowerCase(),
})

export const inventoryImportPayloadSchema = z.object({
  variant_sku: z.string().min(1, "Variant SKU is required"),
  location_id: z.string().min(1, "Location ID is required"),
  stocked_quantity: z.number().int().nonnegative("Stocked quantity must be non-negative"),
})

export const bulkImportBatchSchema = z.object({
  version: z.literal("1.0"),
  batch_id: z.string().min(1, "Batch ID is required"),
  attribution: operationalAttributionSchema,
  categories: z.array(categoryImportPayloadSchema).optional(),
  products: z.array(productImportPayloadSchema).optional(),
  variants: z.array(variantImportPayloadSchema).optional(),
  prices: z.array(priceImportPayloadSchema).optional(),
  inventory: z.array(inventoryImportPayloadSchema).optional(),
})

export function validateBulkImportBatch(
  input: unknown
): BulkImportBatchPayload {
  const parsed = bulkImportBatchSchema.parse(input) as BulkImportBatchPayload

  // Check for duplicate handles/skus within the batch
  if (parsed.categories) {
    const seenCatHandles = new Set<string>()
    for (const cat of parsed.categories) {
      if (seenCatHandles.has(cat.handle)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Duplicate category handle: '${cat.handle}' in batch`
        )
      }
      seenCatHandles.add(cat.handle)
    }
  }

  if (parsed.products) {
    const seenProdHandles = new Set<string>()
    for (const prod of parsed.products) {
      if (seenProdHandles.has(prod.handle)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Duplicate product handle: '${prod.handle}' in batch`
        )
      }
      seenProdHandles.add(prod.handle)
    }
  }

  if (parsed.variants) {
    const seenSkus = new Set<string>()
    for (const variant of parsed.variants) {
      if (seenSkus.has(variant.sku)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Duplicate variant SKU: '${variant.sku}' in batch`
        )
      }
      seenSkus.add(variant.sku)
    }
  }

  return parsed
}

export function decomposeBatchIntoUnits(
  batch: BulkImportBatchPayload
): ImportUnit[] {
  const units: ImportUnit[] = []

  // 1. Categories
  if (batch.categories) {
    for (const cat of batch.categories) {
      const dependencies: string[] = []
      if (cat.parent_category_handle) {
        dependencies.push(`cat:${cat.parent_category_handle}`)
      }
      units.push({
        unit_id: `unit_${batch.batch_id}_cat_${cat.handle}`,
        unit_type: "category",
        key: `cat:${cat.handle}`,
        dependencies,
        payload: cat,
        status: "pending",
      })
    }
  }

  // 2. Products
  if (batch.products) {
    for (const prod of batch.products) {
      const dependencies: string[] = []
      if (prod.category_handles) {
        for (const catHandle of prod.category_handles) {
          dependencies.push(`cat:${catHandle}`)
        }
      }
      units.push({
        unit_id: `unit_${batch.batch_id}_prod_${prod.handle}`,
        unit_type: "product",
        key: `prod:${prod.handle}`,
        dependencies,
        payload: prod,
        status: "pending",
      })
    }
  }

  // 3. Variants
  if (batch.variants) {
    for (const variant of batch.variants) {
      units.push({
        unit_id: `unit_${batch.batch_id}_var_${variant.sku}`,
        unit_type: "variant",
        key: `var:${variant.sku}`,
        dependencies: [`prod:${variant.product_handle}`],
        payload: variant,
        status: "pending",
      })
    }
  }

  // 4. Prices
  if (batch.prices) {
    for (const price of batch.prices) {
      units.push({
        unit_id: `unit_${batch.batch_id}_price_${price.variant_sku}_${price.currency_code}`,
        unit_type: "price",
        key: `price:${price.variant_sku}:${price.currency_code}`,
        dependencies: [`var:${price.variant_sku}`],
        payload: price,
        status: "pending",
      })
    }
  }

  // 5. Inventory
  if (batch.inventory) {
    for (const inv of batch.inventory) {
      units.push({
        unit_id: `unit_${batch.batch_id}_inv_${inv.variant_sku}_${inv.location_id}`,
        unit_type: "inventory",
        key: `inv:${inv.variant_sku}:${inv.location_id}`,
        dependencies: [`var:${inv.variant_sku}`],
        payload: inv,
        status: "pending",
      })
    }
  }

  return units
}
