import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import {
  ReconciliationRecord,
  ReconciliationResolution,
  RecordOperationEventInput,
} from "./types"

export class ReconciliationService {
  private records = new Map<string, ReconciliationRecord>()

  recordOperationEvent(input: RecordOperationEventInput): ReconciliationRecord {
    const existing = this.records.get(input.operation_id)
    const now = new Date().toISOString()

    if (existing) {
      existing.status = input.status
      if (input.correlation_id) existing.correlation_id = input.correlation_id
      if (input.provider_reference) existing.provider_reference = input.provider_reference
      if (input.error_details) existing.error_details = input.error_details
      existing.updated_at = now
      return JSON.parse(JSON.stringify(existing))
    }

    const record: ReconciliationRecord = {
      reconciliation_id: input.reconciliation_id || `rec_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      operation_id: input.operation_id,
      correlation_id: input.correlation_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      status: input.status,
      provider_reference: input.provider_reference,
      error_details: input.error_details,
      created_at: now,
      updated_at: now,
    }

    this.records.set(input.operation_id, record)
    return JSON.parse(JSON.stringify(record))
  }

  flagAmbiguousOperation(
    operationId: string,
    reason: string,
    options?: { code?: string; provider_reference?: string }
  ): ReconciliationRecord {
    const record = this.records.get(operationId)
    if (!record) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Reconciliation record for operation '${operationId}' not found`
      )
    }

    record.status = "reconciliation_required"
    record.error_details = {
      code: options?.code || "AMBIGUOUS_STATE",
      message: reason,
    }
    if (options?.provider_reference) {
      record.provider_reference = options.provider_reference
    }
    record.updated_at = new Date().toISOString()

    return JSON.parse(JSON.stringify(record))
  }

  resolveOperation(
    operationId: string,
    resolution: Omit<ReconciliationResolution, "resolved_at"> & { resolved_at?: string }
  ): ReconciliationRecord {
    const record = this.records.get(operationId)
    if (!record) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Reconciliation record for operation '${operationId}' not found`
      )
    }

    // Idempotent resolution check
    if (
      record.status === "reconciled" &&
      record.resolution?.action === resolution.action &&
      record.resolution?.resolved_by === resolution.resolved_by
    ) {
      return JSON.parse(JSON.stringify(record))
    }

    const resolvedAt = resolution.resolved_at || new Date().toISOString()
    record.status = "reconciled"
    record.resolution = {
      resolved_by: resolution.resolved_by,
      action: resolution.action,
      resolved_at: resolvedAt,
      notes: resolution.notes,
    }
    record.updated_at = resolvedAt

    return JSON.parse(JSON.stringify(record))
  }

  getRecord(operationId: string): ReconciliationRecord | null {
    const record = this.records.get(operationId)
    return record ? JSON.parse(JSON.stringify(record)) : null
  }

  listPendingReconciliations(filter?: {
    entity_type?: string
  }): ReconciliationRecord[] {
    const results: ReconciliationRecord[] = []

    for (const record of this.records.values()) {
      if (
        record.status === "ambiguous" ||
        record.status === "reconciliation_required"
      ) {
        if (!filter?.entity_type || record.entity_type === filter.entity_type) {
          results.push(JSON.parse(JSON.stringify(record)))
        }
      }
    }

    return results
  }
}

export const reconciliationService = new ReconciliationService()
