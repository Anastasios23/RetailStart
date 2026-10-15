import { resolveExecutionWaves } from "./ordering"
import { decomposeBatchIntoUnits, validateBulkImportBatch } from "./schema"
import { ImportOperationTracker } from "./tracker"
import {
  BulkImportBatchPayload,
  BulkImportOperationRecord,
  CategoryImportPayload,
  InventoryImportPayload,
  PriceImportPayload,
  ProductImportPayload,
  VariantImportPayload,
} from "./types"

export interface ImportDomainPathways {
  createCategory(
    payload: CategoryImportPayload
  ): Promise<{ id: string; handle: string }>
  createProduct(
    payload: ProductImportPayload
  ): Promise<{ id: string; handle: string }>
  createVariant(
    payload: VariantImportPayload
  ): Promise<{ id: string; sku: string }>
  createPrice(
    payload: PriceImportPayload
  ): Promise<{ id: string; variant_sku: string; amount: number; currency_code: string }>
  updateInventory(
    payload: InventoryImportPayload
  ): Promise<{ variant_sku: string; location_id: string; stocked_quantity: number }>
}

export class BulkImportExecutor {
  constructor(
    private tracker: ImportOperationTracker,
    private pathways: ImportDomainPathways
  ) {}

  async executeBatch(
    operationId: string,
    batch: BulkImportBatchPayload
  ): Promise<BulkImportOperationRecord> {
    // 1. Validate payload
    const validatedBatch = validateBulkImportBatch(batch)

    // 2. Decompose into units
    const units = decomposeBatchIntoUnits(validatedBatch)

    // 3. Resolve execution waves and check for cycles
    const waves = resolveExecutionWaves(units)

    // 4. Initialize operation in tracker (or return existing if replayed)
    let op = this.tracker.initializeOperation(operationId, validatedBatch, units)

    // If already in a terminal state, return directly (idempotency)
    if (op.status === "completed" || op.status === "cancelled") {
      return op
    }

    const batchKeys = new Set(units.map((u) => u.key))

    // 5. Process waves sequentially
    for (const wave of waves) {
      // Check if cancellation was requested
      const currentOp = this.tracker.getOperation(operationId)
      if (currentOp?.status === "cancelled") {
        break
      }

      for (const unit of wave) {
        const unitRecord = this.tracker.getOperation(operationId)?.units[unit.key]

        // Skip if already completed in an earlier run
        if (unitRecord?.status === "completed") {
          continue
        }

        // Verify dependencies
        let canExecute = true
        for (const depKey of unit.dependencies) {
          if (batchKeys.has(depKey)) {
            const depRecord = this.tracker.getOperation(operationId)?.units[depKey]
            if (depRecord?.status !== "completed") {
              canExecute = false
              this.tracker.recordUnitSkipped(
                operationId,
                unit.key,
                `Prerequisite '${depKey}' did not complete successfully (status: ${
                  depRecord?.status ?? "missing"
                })`
              )
              break
            }
          }
        }

        if (!canExecute) {
          continue
        }

        // Execute unit through domain pathways
        try {
          let result: Record<string, unknown> = {}

          switch (unit.unit_type) {
            case "category":
              result = (await this.pathways.createCategory(
                unit.payload as CategoryImportPayload
              )) as Record<string, unknown>
              break

            case "product":
              result = (await this.pathways.createProduct(
                unit.payload as ProductImportPayload
              )) as Record<string, unknown>
              break

            case "variant":
              result = (await this.pathways.createVariant(
                unit.payload as VariantImportPayload
              )) as Record<string, unknown>
              break

            case "price":
              result = (await this.pathways.createPrice(
                unit.payload as PriceImportPayload
              )) as Record<string, unknown>
              break

            case "inventory":
              result = (await this.pathways.updateInventory(
                unit.payload as InventoryImportPayload
              )) as Record<string, unknown>
              break
          }

          this.tracker.recordUnitSuccess(operationId, unit.key, result)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          this.tracker.recordUnitFailure(operationId, unit.key, {
            code: "DOMAIN_MUTATION_FAILED",
            message,
          })
        }
      }
    }

    // 6. Finalize operation status and summary
    return this.tracker.finalizeOperationStatus(operationId)
  }
}
