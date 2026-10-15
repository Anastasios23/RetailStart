import { MedusaError } from "@medusajs/framework/utils"
import {
  classifyMigration,
  validateMigrationPlan,
  validateRollbackSafety,
  assertMigrationPlanValid,
} from "../migration-lifecycle"
import { CompatibilityMatrix, MigrationDescriptor } from "../types"

describe("Migration Lifecycle and Rollback Safety (ADR-0055, ADR-0075)", () => {
  const safeMigration: MigrationDescriptor = {
    id: "mig_001_add_column",
    name: "add_customer_note_column",
    classification: "backward_compatible",
    is_destructive: false,
  }

  const destructiveMigrationWithoutPlan: MigrationDescriptor = {
    id: "mig_002_drop_legacy_table",
    name: "drop_legacy_customer_records",
    classification: "breaking_forward_fix_required",
    is_destructive: true,
  }

  const destructiveMigrationWithPlan: MigrationDescriptor = {
    id: "mig_002_drop_legacy_table",
    name: "drop_legacy_customer_records",
    classification: "breaking_forward_fix_required",
    is_destructive: true,
    forward_fix_plan: "Restore backup snapshot if legacy records needed; archive written to S3",
  }

  describe("classifyMigration", () => {
    it("classifies additive changes as backward_compatible", () => {
      const result = classifyMigration({
        id: "mig_1",
        name: "add_index",
        is_destructive: false,
      })
      expect(result.classification).toBe("backward_compatible")
    })

    it("automatically sets breaking_forward_fix_required if is_destructive is true", () => {
      const result = classifyMigration({
        id: "mig_2",
        name: "drop_table",
        is_destructive: true,
        forward_fix_plan: "Recreate table from dump",
      })
      expect(result.classification).toBe("breaking_forward_fix_required")
    })
  })

  describe("validateMigrationPlan", () => {
    it("validates forward plan with backward-compatible migrations", () => {
      const result = validateMigrationPlan({
        direction: "forward",
        migrations: [safeMigration],
      })
      expect(result.is_valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects destructive migration without an explicit forward-fix plan", () => {
      const result = validateMigrationPlan({
        direction: "forward",
        migrations: [destructiveMigrationWithoutPlan],
      })
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("requires an explicit forward-fix recovery plan"))).toBe(true)
    })

    it("accepts destructive migration when an explicit forward-fix plan is provided", () => {
      const result = validateMigrationPlan({
        direction: "forward",
        migrations: [destructiveMigrationWithPlan],
      })
      expect(result.is_valid).toBe(true)
    })

    it("rejects rollback direction if plan contains destructive migrations without safe override", () => {
      const result = validateMigrationPlan({
        direction: "rollback",
        migrations: [destructiveMigrationWithPlan],
        is_safe_for_rollback: false,
      })
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("Automatic down-migrations for destructive changes are rejected"))).toBe(true)
    })

    it("accepts rollback direction when verified safe with restore strategy", () => {
      const result = validateMigrationPlan({
        direction: "rollback",
        migrations: [safeMigration],
        is_safe_for_rollback: true,
      })
      expect(result.is_valid).toBe(true)
    })
  })

  describe("validateRollbackSafety", () => {
    const targetAppCompatibility: CompatibilityMatrix = {
      supported_storefront_range: "^1.0.0",
      supported_schema_versions: ["20261014_001", "20261014_002"],
      supported_presentation_versions: ["bundle-v1.0"],
    }

    it("approves rollback when database schema is supported by rollback target application", () => {
      const result = validateRollbackSafety("20261014_002", targetAppCompatibility)
      expect(result.is_valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects rollback when database schema is incompatible with target application version", () => {
      const result = validateRollbackSafety("20261015_001", targetAppCompatibility)
      expect(result.is_valid).toBe(false)
      expect(result.errors.some((e) => e.includes("incompatible with rollback target application"))).toBe(true)
    })
  })

  describe("assertMigrationPlanValid", () => {
    it("throws MedusaError when plan is invalid", () => {
      expect(() =>
        assertMigrationPlanValid({
          direction: "forward",
          migrations: [destructiveMigrationWithoutPlan],
        })
      ).toThrow(MedusaError)
    })

    it("does not throw when plan is valid", () => {
      expect(() =>
        assertMigrationPlanValid({
          direction: "forward",
          migrations: [safeMigration],
        })
      ).not.toThrow()
    })
  })
})
