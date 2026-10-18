import { EnvironmentType } from "../deployment/types"

export type DataClass =
  | "customer_account"
  | "cart_session"
  | "order_transaction"
  | "payment_attempt"
  | "media_assets"
  | "audit_logs"
  | "reconciliation_records"

export type RetentionOwner =
  | "medusa_backend"
  | "object_storage"
  | "payment_provider"

export type RetentionTrigger =
  | "immediate_on_completion"
  | "duration_after_finalization"
  | "explicit_client_request"
  | "legal_statutory_hold"

export type RetentionAction = "anonymize" | "hard_delete" | "archive"

export interface DataClassRetentionRule {
  data_class: DataClass
  owner: RetentionOwner
  retention_period_days: number
  trigger: RetentionTrigger
  action: RetentionAction
  backup_implications: string
  legal_exceptions?: string
}

export type PolicyApprovalStatus = "draft" | "approved" | "rejected" | "superseded"

export interface LifecyclePolicy {
  policy_id: string
  version: string
  client_id: string
  environment: EnvironmentType
  approval_status: PolicyApprovalStatus
  approval_metadata?: {
    approved_by: string
    approved_at: string
  }
  effective_date: string
  change_summary: string
  previous_version?: string
  retention_matrix: DataClassRetentionRule[]
}

export interface ActivationOperationInput {
  operation_id: string
  client_id: string
  environment: EnvironmentType
  expected_current_version: string | null
  target_version: string
  activated_by: string
  reason?: string
}

export interface ActivationOperationRecord {
  operation_id: string
  client_id: string
  environment: EnvironmentType
  expected_current_version: string | null
  target_version: string
  previous_active_version: string | null
  new_active_version: string
  activated_by: string
  activated_at: string
  request_fingerprint: string
  status: "completed" | "failed"
  reason?: string
}

export interface LifecycleValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}
