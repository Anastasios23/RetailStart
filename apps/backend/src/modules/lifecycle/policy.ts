import {
  DataClass,
  LifecyclePolicy,
  LifecycleValidationResult,
} from "./types"

const REQUIRED_DATA_CLASSES: DataClass[] = [
  "customer_account",
  "cart_session",
  "order_transaction",
  "payment_attempt",
  "media_assets",
  "audit_logs",
  "reconciliation_records",
]

/**
 * Validates a client lifecycle policy and its retention matrix (ADR-0042, ADR-0146, ADR-0148).
 */
export function validateLifecyclePolicy(policy: LifecyclePolicy): LifecycleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!policy.policy_id) errors.push("Missing policy_id")
  if (!policy.version) errors.push("Missing version")
  if (!policy.client_id) errors.push("Missing client_id")
  if (!policy.environment) errors.push("Missing environment")

  if (!policy.effective_date || isNaN(Date.parse(policy.effective_date))) {
    errors.push("effective_date must be a valid ISO-8601 date string")
  }

  // Approval requirements (ADR-0148)
  if (policy.approval_status === "approved") {
    if (
      !policy.approval_metadata?.approved_by ||
      policy.approval_metadata.approved_by.trim().length === 0 ||
      !policy.approval_metadata.approved_at ||
      isNaN(Date.parse(policy.approval_metadata.approved_at))
    ) {
      errors.push("Approved policy requires approval_metadata with approved_by and approved_at")
    }
  }

  // Matrix requirements (ADR-0146)
  if (!policy.retention_matrix || !Array.isArray(policy.retention_matrix)) {
    errors.push("Missing retention_matrix array")
  } else {
    const coveredClasses = new Set(policy.retention_matrix.map((r) => r.data_class))
    const missing = REQUIRED_DATA_CLASSES.filter((c) => !coveredClasses.has(c))
    if (missing.length > 0) {
      errors.push(`Missing retention rules for required data classes: [${missing.join(", ")}]`)
    }

    for (const rule of policy.retention_matrix) {
      if (rule.retention_period_days < 0) {
        errors.push(`retention_period_days for '${rule.data_class}' cannot be negative`)
      }

      // Safeguard accounting / tax hold invariants
      if (rule.data_class === "order_transaction" && rule.action === "hard_delete") {
        errors.push(
          "order_transaction records must be preserved for statutory tax/accounting hold (ADR-0146); hard_delete is prohibited"
        )
      }
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}
