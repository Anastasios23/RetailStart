import { ImportOperationTracker } from "../tracker"
import { BulkImportBatchPayload, ImportUnit } from "../types"

describe("ImportOperationTracker", () => {
  const sampleBatch: BulkImportBatchPayload = {
    version: "1.0",
    batch_id: "batch-101",
    attribution: {
      principal_id: "admin-42",
      principal_type: "admin",
      source_interface: "admin_import",
      correlation_id: "corr-101",
    },
  }

  const sampleUnits: ImportUnit[] = [
    {
      unit_id: "u1",
      unit_type: "category",
      key: "cat:apparel",
      dependencies: [],
      payload: { name: "Apparel", handle: "apparel" },
      status: "pending",
    },
    {
      unit_id: "u2",
      unit_type: "product",
      key: "prod:tee",
      dependencies: ["cat:apparel"],
      payload: { title: "Tee", handle: "tee" },
      status: "pending",
    },
  ]

  let tracker: ImportOperationTracker

  beforeEach(() => {
    tracker = new ImportOperationTracker()
  })

  it("initializes a new import operation with attribution and pending units", () => {
    const op = tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    expect(op.operation_id).toBe("op-1")
    expect(op.batch_id).toBe("batch-101")
    expect(op.status).toBe("pending")
    expect(op.attribution.principal_id).toBe("admin-42")
    expect(op.attribution.timestamp).toBeDefined()
    expect(op.summary.total_units).toBe(2)
    expect(op.summary.completed_units).toBe(0)
    expect(Object.keys(op.units).length).toBe(2)
  })

  it("is idempotent when replaying the same operation_id", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    tracker.recordUnitSuccess("op-1", "cat:apparel", { category_id: "cat_1" })

    // Replay initialization with identical operation_id
    const replayed = tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    expect(replayed.operation_id).toBe("op-1")
    // Should preserve already completed unit outcome!
    expect(replayed.units["cat:apparel"].status).toBe("completed")
    expect(replayed.units["cat:apparel"].result).toEqual({ category_id: "cat_1" })
  })

  it("rejects duplicate operation_id with conflicting batch_id", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    expect(() =>
      tracker.initializeOperation(
        "op-1",
        { ...sampleBatch, batch_id: "conflicting-batch" },
        sampleUnits
      )
    ).toThrow(/conflicts with existing batch/)
  })

  it("records unit success and failure and updates summary", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    tracker.recordUnitSuccess("op-1", "cat:apparel", { id: "cat_1" })
    tracker.recordUnitFailure("op-1", "prod:tee", {
      code: "INVALID_TITLE",
      message: "Title cannot be empty",
    })

    const finalized = tracker.finalizeOperationStatus("op-1")
    expect(finalized.status).toBe("partially_completed")
    expect(finalized.summary.completed_units).toBe(1)
    expect(finalized.summary.failed_units).toBe(1)
    expect(finalized.completed_at).toBeDefined()
  })

  it("records skipped units due to dependency failure", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    tracker.recordUnitFailure("op-1", "cat:apparel", {
      code: "PARENT_FAIL",
      message: "Database error",
    })
    tracker.recordUnitSkipped("op-1", "prod:tee", "Prerequisite 'cat:apparel' failed")

    const finalized = tracker.finalizeOperationStatus("op-1")
    expect(finalized.status).toBe("failed")
    expect(finalized.summary.completed_units).toBe(0)
    expect(finalized.summary.failed_units).toBe(1)
    expect(finalized.summary.skipped_units).toBe(1)
    expect(finalized.units["prod:tee"].status).toBe("skipped")
  })

  it("cooperatively cancels operation without undoing completed units (ADR-0106)", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    tracker.recordUnitSuccess("op-1", "cat:apparel", { id: "cat_1" })

    // Cancel while u2 is still pending
    const cancelled = tracker.requestCancellation("op-1")
    expect(cancelled.status).toBe("partially_completed")
    expect(cancelled.units["cat:apparel"].status).toBe("completed") // Preserved!
    expect(cancelled.units["prod:tee"].status).toBe("cancelled") // Cancelled!
    expect(cancelled.summary.completed_units).toBe(1)
    expect(cancelled.summary.cancelled_units).toBe(1)
  })

  it("cooperatively cancels unstarted operation to cancelled state", () => {
    tracker.initializeOperation("op-1", sampleBatch, sampleUnits)
    const cancelled = tracker.requestCancellation("op-1")
    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.summary.completed_units).toBe(0)
    expect(cancelled.summary.cancelled_units).toBe(2)
  })
})
