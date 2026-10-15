export type ReconciliationStatus =
  | "pending"
  | "success"
  | "failure"
  | "ambiguous"
  | "reconciliation_required"
  | "reconciled"

export type RecoveryAction = "mark_reconciled" | "force_retry" | "void"

export interface ReconciliationResolution {
  resolved_by: string
  action: RecoveryAction
  resolved_at: string
  notes?: string
}

export interface ReconciliationRecord {
  reconciliation_id: string
  operation_id: string
  correlation_id?: string
  entity_type: "order" | "payment" | "refund" | "fulfillment" | "bulk_import"
  entity_id: string
  status: ReconciliationStatus
  provider_reference?: string
  error_details?: {
    code: string
    message: string
  }
  resolution?: ReconciliationResolution
  created_at: string
  updated_at: string
}

export type RecordOperationEventInput = Omit<
  ReconciliationRecord,
  "reconciliation_id" | "created_at" | "updated_at"
> & {
  reconciliation_id?: string
}
