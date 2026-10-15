import { MedusaError } from "@medusajs/framework/utils"
import {
  BulkImportBatchPayload,
  ImportOperationTracker,
} from "../../../modules/bulk-import"
import { executeBulkImport } from "../execute-bulk-import"
import { executeCancelBulkImport } from "../cancel-bulk-import"

describe("Bulk Import Workflows", () => {
  let tracker: ImportOperationTracker

  const validBatch: BulkImportBatchPayload = {
    version: "1.0",
    batch_id: "batch-wf-001",
    attribution: {
      principal_id: "operator-007",
      principal_type: "admin",
      source_interface: "workflow",
      correlation_id: "corr-wf-001",
    },
    categories: [{ name: "Accessories", handle: "accessories" }],
    products: [
      {
        title: "Leather Belt",
        handle: "leather-belt",
        category_handles: ["accessories"],
      },
    ],
    variants: [
      {
        product_handle: "leather-belt",
        title: "Brown 34",
        sku: "BELT-BRN-34",
      },
    ],
    prices: [
      {
        variant_sku: "BELT-BRN-34",
        amount: 4500,
        currency_code: "eur",
      },
    ],
    inventory: [
      {
        variant_sku: "BELT-BRN-34",
        location_id: "main_loc",
        stocked_quantity: 20,
      },
    ],
  }

  beforeEach(() => {
    tracker = new ImportOperationTracker()
  })

  it("successfully executes bulk import workflow end-to-end", async () => {
    const result = await executeBulkImport(
      { operation_id: "op-wf-success", batch: validBatch },
      undefined,
      tracker
    )

    expect(result.status).toBe("completed")
    expect(result.summary.total_units).toBe(5)
    expect(result.summary.completed_units).toBe(5)
    expect(result.summary.failed_units).toBe(0)
    expect(result.attribution.principal_id).toBe("operator-007")
    expect(result.completed_at).toBeDefined()
  })

  it("rejects execution when operation_id is missing or invalid", async () => {
    await expect(
      executeBulkImport(
        { operation_id: "", batch: validBatch },
        undefined,
        tracker
      )
    ).rejects.toThrow(MedusaError)
  })

  it("rejects execution when batch fails schema or circular dependency validation", async () => {
    const circularBatch: BulkImportBatchPayload = {
      ...validBatch,
      categories: [
        { name: "A", handle: "cat-a", parent_category_handle: "cat-b" },
        { name: "B", handle: "cat-b", parent_category_handle: "cat-a" },
      ],
      products: [],
      variants: [],
      prices: [],
      inventory: [],
    }

    await expect(
      executeBulkImport(
        { operation_id: "op-wf-circular", batch: circularBatch },
        undefined,
        tracker
      )
    ).rejects.toThrow(MedusaError)
  })

  it("fails to cancel a non-existent operation with NOT_FOUND MedusaError", () => {
    expect(() =>
      executeCancelBulkImport({ operation_id: "op-non-existent" }, tracker)
    ).toThrow(MedusaError)
  })

  it("cooperatively cancels an existing operation via workflow", async () => {
    // Initialize an operation with units in tracker
    tracker.initializeOperation("op-to-cancel", validBatch, [
      {
        unit_id: "u1",
        unit_type: "category",
        key: "cat:accessories",
        dependencies: [],
        payload: { name: "Accessories", handle: "accessories" },
        status: "completed",
        result: { id: "cat_123" },
      },
      {
        unit_id: "u2",
        unit_type: "product",
        key: "prod:leather-belt",
        dependencies: ["cat:accessories"],
        payload: { title: "Leather Belt", handle: "leather-belt" },
        status: "pending",
      },
    ])

    const cancelledRecord = executeCancelBulkImport(
      { operation_id: "op-to-cancel" },
      tracker
    )

    expect(cancelledRecord.status).toBe("partially_completed")
    expect(cancelledRecord.units["cat:accessories"].status).toBe("completed")
    expect(cancelledRecord.units["prod:leather-belt"].status).toBe("cancelled")
    expect(cancelledRecord.summary.completed_units).toBe(1)
    expect(cancelledRecord.summary.cancelled_units).toBe(1)
  })
})
