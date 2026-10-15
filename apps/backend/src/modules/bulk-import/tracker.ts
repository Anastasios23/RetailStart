import { MedusaError } from "@medusajs/framework/utils"
import {
  BulkImportBatchPayload,
  BulkImportOperationRecord,
  BulkImportOperationStatus,
  BulkImportOperationSummary,
  ImportUnit,
  OperationalAttribution,
} from "./types"

export class ImportOperationTracker {
  private operations = new Map<string, BulkImportOperationRecord>()

  getOperation(operationId: string): BulkImportOperationRecord | null {
    const op = this.operations.get(operationId)
    return op ? JSON.parse(JSON.stringify(op)) : null
  }

  initializeOperation(
    operationId: string,
    batch: BulkImportBatchPayload,
    units: ImportUnit[]
  ): BulkImportOperationRecord {
    const existing = this.operations.get(operationId)
    if (existing) {
      if (existing.batch_id !== batch.batch_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Operation '${operationId}' conflicts with existing batch '${existing.batch_id}' (attempted '${batch.batch_id}')`
        )
      }
      return JSON.parse(JSON.stringify(existing))
    }

    const attribution: OperationalAttribution = {
      ...batch.attribution,
      timestamp: batch.attribution.timestamp || new Date().toISOString(),
    }

    const unitMap: Record<string, ImportUnit> = {}
    for (const unit of units) {
      unitMap[unit.key] = { ...unit }
    }

    const record: BulkImportOperationRecord = {
      operation_id: operationId,
      version: batch.version,
      batch_id: batch.batch_id,
      attribution,
      status: "pending",
      summary: {
        total_units: units.length,
        completed_units: 0,
        failed_units: 0,
        cancelled_units: 0,
        skipped_units: 0,
      },
      units: unitMap,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    this.operations.set(operationId, record)
    return JSON.parse(JSON.stringify(record))
  }

  updateUnitState(
    operationId: string,
    unitKey: string,
    update: Partial<ImportUnit>
  ): void {
    const op = this.operations.get(operationId)
    if (!op) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Operation '${operationId}' not found`
      )
    }
    const unit = op.units[unitKey]
    if (!unit) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Unit '${unitKey}' not found in operation '${operationId}'`
      )
    }

    Object.assign(unit, update)
    op.updated_at = new Date().toISOString()
    this.refreshSummary(op)
  }

  recordUnitSuccess(
    operationId: string,
    unitKey: string,
    result: Record<string, unknown>
  ): void {
    this.updateUnitState(operationId, unitKey, {
      status: "completed",
      result,
      error: undefined,
    })
  }

  recordUnitFailure(
    operationId: string,
    unitKey: string,
    error: { code: string; message: string; details?: unknown }
  ): void {
    this.updateUnitState(operationId, unitKey, {
      status: "failed",
      error,
    })
  }

  recordUnitSkipped(
    operationId: string,
    unitKey: string,
    reason: string
  ): void {
    this.updateUnitState(operationId, unitKey, {
      status: "skipped",
      error: {
        code: "DEPENDENCY_SKIPPED",
        message: reason,
      },
    })
  }

  requestCancellation(operationId: string): BulkImportOperationRecord {
    const op = this.operations.get(operationId)
    if (!op) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Operation '${operationId}' not found`
      )
    }

    // Mark all pending/processing units as cancelled
    for (const unit of Object.values(op.units)) {
      if (unit.status === "pending" || unit.status === "processing") {
        unit.status = "cancelled"
        unit.error = {
          code: "OPERATION_CANCELLED",
          message: "Operation was cancelled by operator request",
        }
      }
    }

    op.updated_at = new Date().toISOString()
    this.refreshSummary(op)
    this.determineStatus(op, true)
    return JSON.parse(JSON.stringify(op))
  }

  finalizeOperationStatus(operationId: string): BulkImportOperationRecord {
    const op = this.operations.get(operationId)
    if (!op) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Operation '${operationId}' not found`
      )
    }

    this.refreshSummary(op)
    this.determineStatus(op, false)
    op.completed_at = new Date().toISOString()
    op.updated_at = new Date().toISOString()
    return JSON.parse(JSON.stringify(op))
  }

  private refreshSummary(op: BulkImportOperationRecord): void {
    let completed = 0
    let failed = 0
    let cancelled = 0
    let skipped = 0

    for (const unit of Object.values(op.units)) {
      if (unit.status === "completed") completed++
      else if (unit.status === "failed") failed++
      else if (unit.status === "cancelled") cancelled++
      else if (unit.status === "skipped") skipped++
    }

    op.summary = {
      total_units: Object.keys(op.units).length,
      completed_units: completed,
      failed_units: failed,
      cancelled_units: cancelled,
      skipped_units: skipped,
    }
  }

  private determineStatus(
    op: BulkImportOperationRecord,
    wasCancelledExplicitly: boolean
  ): void {
    const { total_units, completed_units, failed_units, cancelled_units, skipped_units } =
      op.summary

    if (completed_units === total_units) {
      op.status = "completed"
      return
    }

    if (wasCancelledExplicitly || cancelled_units > 0) {
      op.status = completed_units > 0 ? "partially_completed" : "cancelled"
      return
    }

    if (completed_units > 0) {
      op.status = "partially_completed"
      return
    }

    if (failed_units + skipped_units > 0) {
      op.status = "failed"
      return
    }

    op.status = "in_progress"
  }
}

// Global default singleton instance for backend runtime
export const globalImportOperationTracker = new ImportOperationTracker()
