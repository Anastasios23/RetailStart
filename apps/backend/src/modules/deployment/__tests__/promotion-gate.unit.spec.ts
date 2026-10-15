import { MedusaError } from "@medusajs/framework/utils"
import {
  MANDATORY_PRODUCTION_GATES,
  assertPromotionGate,
  validateEnvironmentProgression,
  validatePromotionApproval,
} from "../promotion-gate"
import { createReleaseTuple } from "../release-tuple"
import { PromotionApprovalRecord, ReleaseTuple } from "../types"

describe("Promotion Gate and Environment Isolation (ADR-0038, ADR-0074, ADR-0085)", () => {
  const validTuple: ReleaseTuple = createReleaseTuple({
    backend_version: "1.0.0",
    storefront_version: "1.0.0",
    schema_version: "20261015_001",
    presentation_bundle_version: "bundle-v1.0",
    extensions: { "stripe-payment": "1.0.0" },
    compatibility: {
      supported_storefront_range: "^1.0.0",
      supported_schema_versions: ["20261015_001"],
      supported_presentation_versions: ["bundle-v1.0"],
    },
    metadata: {
      git_sha: "3ab7d41a",
      build_timestamp: "2026-10-15T12:00:00.000Z",
      docker_image_digest: "sha256:abcdef1234567890",
    },
  })

  const validProductionApproval: PromotionApprovalRecord = {
    approval_id: "appr_prod_001",
    tuple_id: validTuple.tuple_id,
    source_environment: "staging",
    target_environment: "production",
    approved_by: "operator_release_manager",
    approved_at: "2026-10-15T12:30:00.000Z",
    verification_gates_passed: [...MANDATORY_PRODUCTION_GATES],
  }

  describe("validateEnvironmentProgression", () => {
    it("allows valid single-step promotions", () => {
      expect(validateEnvironmentProgression("development", "test")).toBe(true)
      expect(validateEnvironmentProgression("test", "staging")).toBe(true)
      expect(validateEnvironmentProgression("staging", "production")).toBe(true)
    })

    it("rejects skipped environments", () => {
      expect(validateEnvironmentProgression("development", "staging")).toBe(false)
      expect(validateEnvironmentProgression("development", "production")).toBe(false)
      expect(validateEnvironmentProgression("test", "production")).toBe(false)
    })

    it("rejects backwards or same-environment promotion", () => {
      expect(validateEnvironmentProgression("production", "staging")).toBe(false)
      expect(validateEnvironmentProgression("staging", "staging")).toBe(false)
    })
  })

  describe("validatePromotionApproval", () => {
    it("validates a compliant production promotion approval", () => {
      const result = validatePromotionApproval(validProductionApproval, validTuple)
      expect(result.is_valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("fails when tuple_id does not match the approved release tuple", () => {
      const mismatchedApproval: PromotionApprovalRecord = {
        ...validProductionApproval,
        tuple_id: "rt_tampered_id",
      }
      const result = validatePromotionApproval(mismatchedApproval, validTuple)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("Tuple ID mismatch"))).toBe(true)
    })

    it("fails when promoting directly to production from development or test", () => {
      const invalidProgressionApproval: PromotionApprovalRecord = {
        ...validProductionApproval,
        source_environment: "test",
      }
      const result = validatePromotionApproval(invalidProgressionApproval, validTuple)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("Invalid environment progression"))).toBe(true)
    })

    it("fails production promotion when mandatory verification gates are missing", () => {
      const missingGatesApproval: PromotionApprovalRecord = {
        ...validProductionApproval,
        verification_gates_passed: ["backend_unit_tests"], // missing typecheck, build, lint, storefront_unit_tests
      }
      const result = validatePromotionApproval(missingGatesApproval, validTuple)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("Missing mandatory verification gates"))).toBe(true)
    })

    it("fails production promotion if operator approval or timestamp is missing", () => {
      const missingApproverRecord: PromotionApprovalRecord = {
        ...validProductionApproval,
        approved_by: "",
      }
      const result = validatePromotionApproval(missingApproverRecord, validTuple)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("approved_by operator attribution is mandatory"))).toBe(true)
    })

    it("validates migration plan if included in promotion record", () => {
      const approvalWithDestructiveMigration: PromotionApprovalRecord = {
        ...validProductionApproval,
        migration_plan: {
          direction: "forward",
          migrations: [
            {
              id: "mig_drop",
              name: "drop_table",
              classification: "breaking_forward_fix_required",
              is_destructive: true,
              // missing forward_fix_plan!
            },
          ],
          is_safe_for_rollback: false,
        },
      }
      const result = validatePromotionApproval(approvalWithDestructiveMigration, validTuple)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("requires an explicit forward-fix recovery plan"))).toBe(true)
    })
  })

  describe("assertPromotionGate", () => {
    it("throws MedusaError when promotion gate fails", () => {
      const invalidApproval: PromotionApprovalRecord = {
        ...validProductionApproval,
        source_environment: "development",
      }
      expect(() => assertPromotionGate(invalidApproval, validTuple)).toThrow(MedusaError)
      expect(() => assertPromotionGate(invalidApproval, validTuple)).toThrow(/Promotion gate check failed/i)
    })

    it("succeeds silently when promotion gate passes", () => {
      expect(() => assertPromotionGate(validProductionApproval, validTuple)).not.toThrow()
    })
  })
})
