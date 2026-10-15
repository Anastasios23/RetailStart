import { BulkImportExecutor } from "../executor"
import { ImportOperationTracker } from "../tracker"
import { BulkImportBatchPayload, CategoryImportPayload, InventoryImportPayload, PriceImportPayload, ProductImportPayload, VariantImportPayload } from "../types"

describe("BulkImportExecutor", () => {
  let tracker: ImportOperationTracker
  let mockPathways: {
    createCategory: jest.Mock
    createProduct: jest.Mock
    createVariant: jest.Mock
    createPrice: jest.Mock
    updateInventory: jest.Mock
  }
  let executor: BulkImportExecutor

  const sampleBatch: BulkImportBatchPayload = {
    version: "1.0",
    batch_id: "batch-prod-001",
    attribution: {
      principal_id: "admin-system",
      principal_type: "admin",
      source_interface: "admin_import",
      correlation_id: "corr-xyz",
    },
    categories: [
      { name: "Electronics", handle: "electronics" },
      { name: "Audio", handle: "audio", parent_category_handle: "electronics" },
    ],
    products: [
      { title: "Wireless Headphones", handle: "wireless-headphones", category_handles: ["audio"] },
    ],
    variants: [
      { product_handle: "wireless-headphones", title: "Black", sku: "WH-BLK" },
    ],
    prices: [
      { variant_sku: "WH-BLK", amount: 15000, currency_code: "eur" },
    ],
    inventory: [
      { variant_sku: "WH-BLK", location_id: "wh_eu", stocked_quantity: 100 },
    ],
  }

  beforeEach(() => {
    tracker = new ImportOperationTracker()
    mockPathways = {
      createCategory: jest.fn().mockImplementation(async (cat: CategoryImportPayload) => ({
        id: `cat_${cat.handle}`,
        handle: cat.handle,
      })),
      createProduct: jest.fn().mockImplementation(async (prod: ProductImportPayload) => ({
        id: `prod_${prod.handle}`,
        handle: prod.handle,
      })),
      createVariant: jest.fn().mockImplementation(async (variant: VariantImportPayload) => ({
        id: `var_${variant.sku}`,
        sku: variant.sku,
      })),
      createPrice: jest.fn().mockImplementation(async (price: PriceImportPayload) => ({
        id: `price_${price.variant_sku}_${price.currency_code}`,
        ...price,
      })),
      updateInventory: jest.fn().mockImplementation(async (inv: InventoryImportPayload) => ({
        ...inv,
      })),
    }

    executor = new BulkImportExecutor(tracker, mockPathways)
  })

  it("executes all units across dependency waves and finishes with completed status", async () => {
    const result = await executor.executeBatch("op-full-1", sampleBatch)

    expect(result.status).toBe("completed")
    expect(result.summary.total_units).toBe(6)
    expect(result.summary.completed_units).toBe(6)
    expect(result.summary.failed_units).toBe(0)
    expect(result.summary.skipped_units).toBe(0)

    // Verify domain pathway calls
    expect(mockPathways.createCategory).toHaveBeenCalledTimes(2)
    expect(mockPathways.createProduct).toHaveBeenCalledTimes(1)
    expect(mockPathways.createVariant).toHaveBeenCalledTimes(1)
    expect(mockPathways.createPrice).toHaveBeenCalledTimes(1)
    expect(mockPathways.updateInventory).toHaveBeenCalledTimes(1)
  })

  it("is idempotent on replay without repeating completed domain mutations", async () => {
    await executor.executeBatch("op-replay-1", sampleBatch)
    expect(mockPathways.createCategory).toHaveBeenCalledTimes(2)

    // Replay the exact same operation
    const replayed = await executor.executeBatch("op-replay-1", sampleBatch)
    expect(replayed.status).toBe("completed")

    // Invocations should NOT increase!
    expect(mockPathways.createCategory).toHaveBeenCalledTimes(2)
    expect(mockPathways.createProduct).toHaveBeenCalledTimes(1)
  })

  it("safely skips dependent units when a prerequisite fails", async () => {
    // Make root category fail
    mockPathways.createCategory.mockImplementationOnce(async () => {
      throw new Error("Database timeout on category insert")
    })

    const result = await executor.executeBatch("op-fail-1", sampleBatch)

    expect(result.status).toBe("failed")
    expect(result.summary.completed_units).toBe(0)
    expect(result.summary.failed_units).toBe(1) // "cat:electronics"
    // All dependent units ("cat:audio", "prod:wireless-headphones", "var:WH-BLK", price, inv) are skipped!
    expect(result.summary.skipped_units).toBe(5)

    // Dependent pathways should not even have been called
    expect(mockPathways.createProduct).not.toHaveBeenCalled()
    expect(mockPathways.createVariant).not.toHaveBeenCalled()
  })

  it("resumes incomplete units on retry without duplicating completed units", async () => {
    // First run: variant creation fails
    mockPathways.createVariant.mockRejectedValueOnce(new Error("Unique constraint on SKU"))

    const firstRun = await executor.executeBatch("op-resume-1", sampleBatch)
    expect(firstRun.status).toBe("partially_completed")
    expect(firstRun.summary.completed_units).toBe(3) // 2 categories + 1 product
    expect(firstRun.summary.failed_units).toBe(1) // variant
    expect(firstRun.summary.skipped_units).toBe(2) // price + inventory

    expect(mockPathways.createCategory).toHaveBeenCalledTimes(2)
    expect(mockPathways.createProduct).toHaveBeenCalledTimes(1)

    // Second run (resume with fixed variant)
    mockPathways.createCategory.mockClear()
    mockPathways.createProduct.mockClear()
    mockPathways.createVariant.mockClear()
    mockPathways.createPrice.mockClear()
    mockPathways.updateInventory.mockClear()

    const resumedRun = await executor.executeBatch("op-resume-1", sampleBatch)
    expect(resumedRun.status).toBe("completed")
    expect(resumedRun.summary.completed_units).toBe(6)

    // Categories and product should NOT have been re-created!
    expect(mockPathways.createCategory).not.toHaveBeenCalled()
    expect(mockPathways.createProduct).not.toHaveBeenCalled()
    // Variant, price, and inventory were executed
    expect(mockPathways.createVariant).toHaveBeenCalledTimes(1)
    expect(mockPathways.createPrice).toHaveBeenCalledTimes(1)
    expect(mockPathways.updateInventory).toHaveBeenCalledTimes(1)
  })

  it("rejects invalid input schema before executing any domain mutations", async () => {
    const invalidBatch = {
      ...sampleBatch,
      categories: [{ name: "Invalid", handle: "INVALID UPPERCASE" }],
    }

    await expect(executor.executeBatch("op-invalid", invalidBatch as any)).rejects.toThrow()
    expect(mockPathways.createCategory).not.toHaveBeenCalled()
  })
})
