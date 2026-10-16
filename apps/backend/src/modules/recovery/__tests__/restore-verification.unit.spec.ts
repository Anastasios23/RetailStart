import { MedusaError } from "@medusajs/framework/utils"
import {
  assertRestoredEnvironmentPromotion,
  createRecoveryManifest,
  evaluateProviderReconciliationGate,
} from "../manifest"
import {
  RecoveryManifest,
  RestoredEnvironmentPromotionRecord,
} from "../manifest-types"
import { ReconciliationService } from "../service"

describe("Restored Environment Reconciliation and Promotion Gate (ADR-0016, ADR-0061, ADR-0082)", () => {
  let reconciliationService: ReconciliationService
  let validManifest: RecoveryManifest

  beforeEach(() => {
    reconciliationService = new ReconciliationService()
    validManifest = createRecoveryManifest({
      release_tuple_id: "rt_1234567890abcdef",
      database: {
        recovery_point_id: "pg_rec_001",
        schema_version: "20261015_001",
        snapshot_timestamp: "2026-10-15T12:00:00.000Z",
        checksum: "sha256:11112222333344445555666677778888",
      },
      media_storage: {
        snapshot_id: "s3_snap_001",
        bucket: "client-media",
        prefix: "media/",
        media_keys: ["key1.webp"],
      },
      configuration: {
        config_digest: "sha256:aabbcc",
        environment: "staging",
      },
      created_at: "2026-10-15T12:15:00.000Z",
      created_by: "backup_daemon",
    })
  })

  const validPromotionRecord: RestoredEnvironmentPromotionRecord = {
    promotion_id: "rep_001",
    manifest_id: "", // will be assigned validManifest.manifest_id in tests
    target_environment: "production",
    verified_by: "operator_lead",
    verified_at: "2026-10-15T13:00:00.000Z",
    evidence: {
      database_coherent: true,
      media_verified: true,
      provider_reconciled: true,
    },
  }

  describe("evaluateProviderReconciliationGate", () => {
    it("passes gate when no ambiguous operations exist in restored dataset", () => {
      reconciliationService.recordOperationEvent({
        operation_id: "op_clean_1",
        entity_type: "payment",
        entity_id: "cart_1",
        status: "success",
      })

      const gate = evaluateProviderReconciliationGate(reconciliationService)
      expect(gate.passed).toBe(true)
      expect(gate.ambiguous_count).toBe(0)
      expect(gate.errors).toHaveLength(0)
    })

    it("blocks promotion when unaddressed ambiguous payment operations exist", () => {
      reconciliationService.recordOperationEvent({
        operation_id: "op_ambiguous_1",
        entity_type: "payment",
        entity_id: "cart_2",
        status: "reconciliation_required",
      })

      const gate = evaluateProviderReconciliationGate(reconciliationService)
      expect(gate.passed).toBe(false)
      expect(gate.ambiguous_count).toBe(1)
      expect(gate.errors.some((e) => e.includes("unresolved ambiguous operations"))).toBe(true)
    })

    it("passes gate once ambiguous operations are authoritatively resolved by operator", () => {
      reconciliationService.recordOperationEvent({
        operation_id: "op_ambiguous_2",
        entity_type: "payment",
        entity_id: "cart_3",
        status: "ambiguous",
      })

      // Resolve it
      reconciliationService.resolveOperation("op_ambiguous_2", {
        resolved_by: "operator_lead",
        action: "mark_reconciled",
        notes: "Confirmed capture in Stripe portal",
      })

      const gate = evaluateProviderReconciliationGate(reconciliationService)
      expect(gate.passed).toBe(true)
      expect(gate.reconciled_count).toBe(1)
      expect(gate.ambiguous_count).toBe(0)
    })
  })

  describe("assertRestoredEnvironmentPromotion", () => {
    it("successfully promotes when all evidence is verified and reconciliation is clean", () => {
      const record = { ...validPromotionRecord, manifest_id: validManifest.manifest_id }
      expect(() =>
        assertRestoredEnvironmentPromotion(record, validManifest, reconciliationService)
      ).not.toThrow()
    })

    it("throws MedusaError when manifest ID does not match promotion record", () => {
      const record = { ...validPromotionRecord, manifest_id: "rm_mismatched" }
      expect(() =>
        assertRestoredEnvironmentPromotion(record, validManifest, reconciliationService)
      ).toThrow(MedusaError)
    })

    it("throws MedusaError if operator evidence reports incomplete verification", () => {
      const record = {
        ...validPromotionRecord,
        manifest_id: validManifest.manifest_id,
        evidence: {
          database_coherent: true,
          media_verified: false, // failed media verification!
          provider_reconciled: true,
        },
      }

      expect(() =>
        assertRestoredEnvironmentPromotion(record, validManifest, reconciliationService)
      ).toThrow(/Missing complete verification evidence/)
    })

    it("throws MedusaError if unaddressed provider operations block promotion gate", () => {
      reconciliationService.recordOperationEvent({
        operation_id: "op_blocking",
        entity_type: "refund",
        entity_id: "order_99",
        status: "reconciliation_required",
      })

      const record = { ...validPromotionRecord, manifest_id: validManifest.manifest_id }
      expect(() =>
        assertRestoredEnvironmentPromotion(record, validManifest, reconciliationService)
      ).toThrow(/Provider reconciliation gate failed/)
    })
  })
})
