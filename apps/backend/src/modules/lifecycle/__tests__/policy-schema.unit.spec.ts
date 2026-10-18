import { validateLifecyclePolicy } from "../policy"
import { LifecyclePolicy } from "../types"

describe("Lifecycle Policy and Retention Matrix Schema (ADR-0042, ADR-0146, ADR-0148)", () => {
  const validApprovedPolicy: LifecyclePolicy = {
    policy_id: "lp_client_v1",
    version: "1.0.0",
    client_id: "client_acme",
    environment: "production",
    approval_status: "approved",
    approval_metadata: {
      approved_by: "legal_compliance_officer_jane",
      approved_at: "2026-10-18T10:00:00.000Z",
    },
    effective_date: "2026-10-18T00:00:00.000Z",
    change_summary: "Initial baseline client retention and deletion policy",
    retention_matrix: [
      {
        data_class: "customer_account",
        owner: "medusa_backend",
        retention_period_days: 730,
        trigger: "explicit_client_request",
        action: "anonymize",
        backup_implications: "Anonymized in primary DB; backup cycles roll off in 30 days",
      },
      {
        data_class: "cart_session",
        owner: "medusa_backend",
        retention_period_days: 30,
        trigger: "duration_after_finalization",
        action: "hard_delete",
        backup_implications: "Ephemeral cart sessions purged after 30 days",
      },
      {
        data_class: "order_transaction",
        owner: "medusa_backend",
        retention_period_days: 2555, // 7 years statutory tax hold
        trigger: "legal_statutory_hold",
        action: "archive",
        backup_implications: "Immutable order snapshots preserved for statutory accounting",
        legal_exceptions: "Tax/financial audit records cannot be deleted prior to 7 years",
      },
      {
        data_class: "payment_attempt",
        owner: "payment_provider",
        retention_period_days: 180,
        trigger: "duration_after_finalization",
        action: "anonymize",
        backup_implications: "Stripe retains raw card tokens under PCI-DSS",
      },
      {
        data_class: "media_assets",
        owner: "object_storage",
        retention_period_days: 90,
        trigger: "duration_after_finalization",
        action: "hard_delete",
        backup_implications: "Unreferenced staging media purged after 90 days",
      },
      {
        data_class: "audit_logs",
        owner: "medusa_backend",
        retention_period_days: 365,
        trigger: "duration_after_finalization",
        action: "archive",
        backup_implications: "Security logs archived to write-once storage",
      },
      {
        data_class: "reconciliation_records",
        owner: "medusa_backend",
        retention_period_days: 1825, // 5 years
        trigger: "legal_statutory_hold",
        action: "archive",
        backup_implications: "Durable operator reconciliation records preserved",
      },
    ],
  }

  it("validates a compliant approved client lifecycle policy", () => {
    const result = validateLifecyclePolicy(validApprovedPolicy)
    expect(result.is_valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails if approval_status is approved but approval_metadata is missing", () => {
    const unapprovedPolicy: LifecyclePolicy = {
      ...validApprovedPolicy,
      approval_metadata: undefined,
    }

    const result = validateLifecyclePolicy(unapprovedPolicy)
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Approved policy requires approval_metadata"))).toBe(true)
  })

  it("fails if effective_date is invalid", () => {
    const badDatePolicy: LifecyclePolicy = {
      ...validApprovedPolicy,
      effective_date: "not-a-date",
    }

    const result = validateLifecyclePolicy(badDatePolicy)
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("effective_date must be a valid ISO-8601"))).toBe(true)
  })

  it("fails if mandatory data classes are missing from retention matrix", () => {
    const incompleteMatrixPolicy: LifecyclePolicy = {
      ...validApprovedPolicy,
      retention_matrix: [validApprovedPolicy.retention_matrix[0]], // only 1 class
    }

    const result = validateLifecyclePolicy(incompleteMatrixPolicy)
    expect(result.is_valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Missing retention rules for required data classes"))).toBe(true)
  })

  it("fails if statutory accounting records (order_transaction) are set to hard_delete without legal justification", () => {
    const dangerousPolicy: LifecyclePolicy = {
      ...validApprovedPolicy,
      retention_matrix: validApprovedPolicy.retention_matrix.map((rule) =>
        rule.data_class === "order_transaction"
          ? { ...rule, action: "hard_delete" as const, trigger: "immediate_on_completion" as const }
          : rule
      ),
    }

    const result = validateLifecyclePolicy(dangerousPolicy)
    expect(result.is_valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("order_transaction records must be preserved for statutory tax/accounting"))
    ).toBe(true)
  })
})
