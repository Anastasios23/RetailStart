import {
  bulkImportBatchSchema,
  decomposeBatchIntoUnits,
  validateBulkImportBatch,
} from "../schema"
import { BulkImportBatchPayload } from "../types"

describe("Bulk Import Schema & Validation", () => {
  const validBatch: BulkImportBatchPayload = {
    version: "1.0",
    batch_id: "batch-001",
    attribution: {
      principal_id: "admin-user-123",
      principal_type: "admin",
      source_interface: "admin_import",
      correlation_id: "corr-abc",
    },
    categories: [
      {
        name: "Apparel",
        handle: "apparel",
        is_active: true,
      },
      {
        name: "T-Shirts",
        handle: "t-shirts",
        parent_category_handle: "apparel",
      },
    ],
    products: [
      {
        title: "Classic Cotton Tee",
        handle: "classic-cotton-tee",
        category_handles: ["t-shirts"],
        status: "published",
      },
    ],
    variants: [
      {
        product_handle: "classic-cotton-tee",
        title: "Small / Black",
        sku: "TSHIRT-BLK-S",
        options: { Size: "S", Color: "Black" },
      },
      {
        product_handle: "classic-cotton-tee",
        title: "Medium / Black",
        sku: "TSHIRT-BLK-M",
        options: { Size: "M", Color: "Black" },
      },
    ],
    prices: [
      {
        variant_sku: "TSHIRT-BLK-S",
        amount: 2500, // €25.00
        currency_code: "eur",
      },
      {
        variant_sku: "TSHIRT-BLK-M",
        amount: 2500,
        currency_code: "eur",
      },
    ],
    inventory: [
      {
        variant_sku: "TSHIRT-BLK-S",
        location_id: "loc_default",
        stocked_quantity: 50,
      },
      {
        variant_sku: "TSHIRT-BLK-M",
        location_id: "loc_default",
        stocked_quantity: 75,
      },
    ],
  }

  it("validates a compliant batch payload successfully", () => {
    const validated = validateBulkImportBatch(validBatch)
    expect(validated.version).toBe("1.0")
    expect(validated.batch_id).toBe("batch-001")
    expect(validated.categories?.length).toBe(2)
    expect(validated.products?.length).toBe(1)
    expect(validated.variants?.length).toBe(2)
    expect(validated.prices?.length).toBe(2)
    expect(validated.inventory?.length).toBe(2)
  })

  it("rejects batches with invalid or unsupported version", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        version: "2.0",
      })
    ).toThrow()
  })

  it("rejects batches with missing attribution", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        attribution: undefined,
      })
    ).toThrow()
  })

  it("rejects invalid handles with spaces or uppercase characters", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        categories: [
          {
            name: "Bad Category",
            handle: "Bad Handle With Spaces",
          },
        ],
      })
    ).toThrow(/Handle must be lowercase kebab-case/)
  })

  it("rejects negative price amounts", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        prices: [
          {
            variant_sku: "TSHIRT-BLK-S",
            amount: -500,
            currency_code: "eur",
          },
        ],
      })
    ).toThrow()
  })

  it("rejects negative inventory quantities", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        inventory: [
          {
            variant_sku: "TSHIRT-BLK-S",
            location_id: "loc_default",
            stocked_quantity: -10,
          },
        ],
      })
    ).toThrow()
  })

  it("rejects duplicate category handles within the same batch", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        categories: [
          { name: "First", handle: "duplicate-handle" },
          { name: "Second", handle: "duplicate-handle" },
        ],
      })
    ).toThrow(/Duplicate category handle: 'duplicate-handle'/)
  })

  it("rejects duplicate product handles within the same batch", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        products: [
          { title: "First", handle: "same-product" },
          { title: "Second", handle: "same-product" },
        ],
      })
    ).toThrow(/Duplicate product handle: 'same-product'/)
  })

  it("rejects duplicate variant SKUs within the same batch", () => {
    expect(() =>
      validateBulkImportBatch({
        ...validBatch,
        variants: [
          { product_handle: "prod-1", title: "V1", sku: "DUPLICATE-SKU" },
          { product_handle: "prod-1", title: "V2", sku: "DUPLICATE-SKU" },
        ],
      })
    ).toThrow(/Duplicate variant SKU: 'DUPLICATE-SKU'/)
  })

  it("decomposes a valid batch into discrete units with accurate dependencies", () => {
    const units = decomposeBatchIntoUnits(validBatch)
    // 2 categories + 1 product + 2 variants + 2 prices + 2 inventory = 9 units
    expect(units.length).toBe(9)

    const catApparel = units.find((u) => u.key === "cat:apparel")
    expect(catApparel).toBeDefined()
    expect(catApparel?.dependencies).toEqual([])

    const catTshirts = units.find((u) => u.key === "cat:t-shirts")
    expect(catTshirts).toBeDefined()
    expect(catTshirts?.dependencies).toEqual(["cat:apparel"])

    const prod = units.find((u) => u.key === "prod:classic-cotton-tee")
    expect(prod).toBeDefined()
    expect(prod?.dependencies).toEqual(["cat:t-shirts"])

    const variantS = units.find((u) => u.key === "var:TSHIRT-BLK-S")
    expect(variantS).toBeDefined()
    expect(variantS?.dependencies).toEqual(["prod:classic-cotton-tee"])

    const priceS = units.find((u) => u.key === "price:TSHIRT-BLK-S:eur")
    expect(priceS).toBeDefined()
    expect(priceS?.dependencies).toEqual(["var:TSHIRT-BLK-S"])

    const invS = units.find((u) => u.key === "inv:TSHIRT-BLK-S:loc_default")
    expect(invS).toBeDefined()
    expect(invS?.dependencies).toEqual(["var:TSHIRT-BLK-S"])
  })
})
