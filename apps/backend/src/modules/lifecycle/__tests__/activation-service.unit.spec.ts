import { MedusaError } from "@medusajs/framework/utils"
import { LifecycleActivationService } from "../service"
import { LifecyclePolicy } from "../types"

describe("Lifecycle Activation Service and Concurrency/Idempotency Controls (ADR-0148-0152)", () => {
  let service: LifecycleActivationService

  const approvedPolicyV1: LifecyclePolicy = {
    policy_id: "lp_v1",
    version: "1.0.0",
    client_id: "client_retail",
    environment: "production",
    approval_status: "approved",
    approval_metadata: {
      approved_by: "legal_compliance_director",
      approved_at: "2026-10-18T09:00:00.000Z",
    },
    effective_date: "2026-10-18T00:00:00.000Z",
    change_summary: "Approved initial policy v1.0.0",
    retention_matrix: [
      {
        data_class: "order_transaction",
        owner: "medusa_backend",
        retention_period_days: 2555,
        trigger: "legal_statutory_hold",
        action: "archive",
        backup_implications: "Statutory hold",
      },
      {
        data_class: "cart_session",
        owner: "medusa_backend",
        retention_period_days: 30,
        trigger: "duration_after_finalization",
        action: "hard_delete",
        backup_implications: "Ephemeral",
      },
    ],
  }

  const approvedPolicyV2: LifecyclePolicy = {
    ...approvedPolicyV1,
    policy_id: "lp_v2",
    version: "2.0.0",
    previous_version: "1.0.0",
    change_summary: "Updated policy v2.0.0",
  }

  const draftPolicy: LifecyclePolicy = {
    ...approvedPolicyV1,
    policy_id: "lp_draft",
    version: "1.1.0-draft",
    approval_status: "draft",
    approval_metadata: undefined,
  }

  beforeEach(() => {
    service = new LifecycleActivationService()
    service.registerPolicy(approvedPolicyV1)
    service.registerPolicy(approvedPolicyV2)
    service.registerPolicy(draftPolicy)
  })

  it("blocks activation of an unapproved draft policy (ADR-0148, ADR-0149)", () => {
    expect(() =>
      service.activatePolicy({
        operation_id: "act_op_1",
        client_id: "client_retail",
        environment: "production",
        expected_current_version: null,
        target_version: "1.1.0-draft",
        activated_by: "devops_operator",
      })
    ).toThrow(/Cannot activate unapproved lifecycle policy/i)
  })

  it("successfully activates approved policy v1.0.0 (ADR-0150)", () => {
    const record = service.activatePolicy({
      operation_id: "act_op_v1",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator",
    })

    expect(record.status).toBe("completed")
    expect(record.new_active_version).toBe("1.0.0")
    expect(service.getActivePolicyVersion()).toBe("1.0.0")
  })

  it("enforces compare-and-set concurrency control against stale activation requests (ADR-0151)", () => {
    // Activate v1 first
    service.activatePolicy({
      operation_id: "act_op_v1",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator_1",
    })

    // Competing stale request assumes active version is still null, but it's now 1.0.0
    expect(() =>
      service.activatePolicy({
        operation_id: "act_op_competing",
        client_id: "client_retail",
        environment: "production",
        expected_current_version: null, // Stale expectation!
        target_version: "2.0.0",
        activated_by: "devops_operator_2",
      })
    ).toThrow(MedusaError)

    expect(() =>
      service.activatePolicy({
        operation_id: "act_op_competing",
        client_id: "client_retail",
        environment: "production",
        expected_current_version: null,
        target_version: "2.0.0",
        activated_by: "devops_operator_2",
      })
    ).toThrow(/Concurrency conflict/i)

    // Current version remains 1.0.0
    expect(service.getActivePolicyVersion()).toBe("1.0.0")
  })

  it("safely advances version with correct expected_current_version", () => {
    service.activatePolicy({
      operation_id: "act_op_v1",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator_1",
    })

    const recordV2 = service.activatePolicy({
      operation_id: "act_op_v2",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: "1.0.0", // Correct match
      target_version: "2.0.0",
      activated_by: "devops_operator_1",
    })

    expect(recordV2.previous_active_version).toBe("1.0.0")
    expect(recordV2.new_active_version).toBe("2.0.0")
    expect(service.getActivePolicyVersion()).toBe("2.0.0")
  })

  it("handles identical activation retries idempotently without duplicate transitions (ADR-0152)", () => {
    const input = {
      operation_id: "act_op_idempotent",
      client_id: "client_retail",
      environment: "production" as const,
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator_1",
    }

    const first = service.activatePolicy(input)
    const second = service.activatePolicy(input)

    expect(second.operation_id).toBe(first.operation_id)
    expect(second.activated_at).toBe(first.activated_at)
    expect(second.request_fingerprint).toBe(first.request_fingerprint)
  })

  it("rejects operation_id reuse with conflicting request parameters (ADR-0152)", () => {
    service.activatePolicy({
      operation_id: "act_op_conflict",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator",
    })

    // Replay same operation_id with conflicting target_version
    expect(() =>
      service.activatePolicy({
        operation_id: "act_op_conflict",
        client_id: "client_retail",
        environment: "production",
        expected_current_version: null,
        target_version: "2.0.0", // Different parameter!
        activated_by: "devops_operator",
      })
    ).toThrow(/Idempotency conflict/i)
  })

  it("validates production readiness requires exactly one active approved policy", () => {
    expect(service.validateProductionLifecycleReadiness().is_valid).toBe(false)

    service.activatePolicy({
      operation_id: "act_op_ready",
      client_id: "client_retail",
      environment: "production",
      expected_current_version: null,
      target_version: "1.0.0",
      activated_by: "devops_operator",
    })

    const readiness = service.validateProductionLifecycleReadiness()
    expect(readiness.is_valid).toBe(true)
    expect(readiness.errors).toHaveLength(0)
  })
})
