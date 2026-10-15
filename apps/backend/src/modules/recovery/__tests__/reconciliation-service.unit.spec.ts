import { ReconciliationService } from "../service"
import { ReconciliationRecord } from "../types"

describe("ReconciliationService", () => {
  let service: ReconciliationService

  beforeEach(() => {
    service = new ReconciliationService()
  })

  it("records an initial operation in pending state", () => {
    const record = service.recordOperationEvent({
      operation_id: "op_pay_123",
      correlation_id: "corr_xyz_789",
      entity_type: "payment",
      entity_id: "pi_stripe_123",
      status: "pending",
      provider_reference: "pi_3Mtw",
    })

    expect(record.operation_id).toBe("op_pay_123")
    expect(record.status).toBe("pending")
    expect(record.reconciliation_id).toBeDefined()
    expect(record.created_at).toBeDefined()
  })

  it("flags an ambiguous operation requiring operator reconciliation (ADR-0061)", () => {
    service.recordOperationEvent({
      operation_id: "op_pay_ambiguous",
      correlation_id: "corr_abc",
      entity_type: "payment",
      entity_id: "cart_abc",
      status: "pending",
    })

    const updated = service.flagAmbiguousOperation(
      "op_pay_ambiguous",
      "Stripe payment captured but Medusa cart completion timed out",
      { code: "GATEWAY_TIMEOUT", provider_reference: "pi_stripe_timeout" }
    )

    expect(updated.status).toBe("reconciliation_required")
    expect(updated.provider_reference).toBe("pi_stripe_timeout")
    expect(updated.error_details?.code).toBe("GATEWAY_TIMEOUT")
    expect(updated.error_details?.message).toContain("Stripe payment captured")
  })

  it("lists pending reconciliation operations for operators", () => {
    service.recordOperationEvent({
      operation_id: "op_clean",
      entity_type: "order",
      entity_id: "order_1",
      status: "success",
    })

    service.recordOperationEvent({
      operation_id: "op_flagged_1",
      entity_type: "payment",
      entity_id: "cart_2",
      status: "reconciliation_required",
    })

    service.recordOperationEvent({
      operation_id: "op_flagged_2",
      entity_type: "refund",
      entity_id: "order_3",
      status: "ambiguous",
    })

    const pending = service.listPendingReconciliations()
    expect(pending.length).toBe(2)
    const opIds = pending.map((r) => r.operation_id).sort()
    expect(opIds).toEqual(["op_flagged_1", "op_flagged_2"])
  })

  it("resolves an ambiguous record with durable operator attribution", () => {
    service.recordOperationEvent({
      operation_id: "op_to_resolve",
      entity_type: "payment",
      entity_id: "cart_456",
      status: "reconciliation_required",
    })

    const resolved = service.resolveOperation("op_to_resolve", {
      resolved_by: "operator_admin_99",
      action: "mark_reconciled",
      notes: "Verified payment intent was confirmed in Stripe dashboard",
    })

    expect(resolved.status).toBe("reconciled")
    expect(resolved.resolution).toBeDefined()
    expect(resolved.resolution?.resolved_by).toBe("operator_admin_99")
    expect(resolved.resolution?.action).toBe("mark_reconciled")
    expect(resolved.resolution?.resolved_at).toBeDefined()

    // No longer in pending list
    const pending = service.listPendingReconciliations()
    expect(pending.find((r) => r.operation_id === "op_to_resolve")).toBeUndefined()
  })

  it("is idempotent when re-resolving with identical resolution", () => {
    service.recordOperationEvent({
      operation_id: "op_double_resolve",
      entity_type: "refund",
      entity_id: "ref_123",
      status: "reconciliation_required",
    })

    const first = service.resolveOperation("op_double_resolve", {
      resolved_by: "operator_1",
      action: "force_retry",
    })

    const second = service.resolveOperation("op_double_resolve", {
      resolved_by: "operator_1",
      action: "force_retry",
    })

    expect(second.status).toBe("reconciled")
    expect(second.resolution?.resolved_at).toBe(first.resolution?.resolved_at)
  })

  it("throws MedusaError if resolving a non-existent operation", () => {
    expect(() =>
      service.resolveOperation("op_non_existent", {
        resolved_by: "operator_1",
        action: "void",
      })
    ).toThrow(/not found/)
  })
})
