import { MedusaError } from "@medusajs/framework/utils"
import { validateMigrationPlan } from "./migration-lifecycle"
import { validateReleaseTupleCompatibility } from "./release-tuple"
import {
  DeploymentValidationResult,
  EnvironmentType,
  PromotionApprovalRecord,
  ReleaseTuple,
} from "./types"

export const MANDATORY_PRODUCTION_GATES = [
  "backend_unit_tests",
  "storefront_unit_tests",
  "typecheck",
  "build",
  "lint",
] as const

const ENVIRONMENT_PROGRESSION: Record<EnvironmentType, EnvironmentType | null> = {
  development: "test",
  test: "staging",
  staging: "production",
  production: null,
}

/**
 * Validates sequential promotion through isolated environments (ADR-0038, ADR-0074).
 */
export function validateEnvironmentProgression(
  source: EnvironmentType,
  target: EnvironmentType
): boolean {
  return ENVIRONMENT_PROGRESSION[source] === target
}

/**
 * Validates a promotion approval record against release tuple and gate constraints (ADR-0074, ADR-0085).
 */
export function validatePromotionApproval(
  record: PromotionApprovalRecord,
  tuple: ReleaseTuple
): DeploymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Verify tuple ID match
  if (record.tuple_id !== tuple.tuple_id) {
    errors.push(
      `Tuple ID mismatch: Approval record targets '${record.tuple_id}', but release tuple is '${tuple.tuple_id}'`
    )
  }

  // Verify sequential environment progression
  if (!validateEnvironmentProgression(record.source_environment, record.target_environment)) {
    errors.push(
      `Invalid environment progression: Promotion from '${record.source_environment}' to '${record.target_environment}' violates isolation sequence (ADR-0038)`
    )
  }

  // Validate release tuple compatibility against target environment
  const tupleValidation = validateReleaseTupleCompatibility(tuple, record.target_environment)
  if (!tupleValidation.is_valid) {
    errors.push(...tupleValidation.errors)
  }

  // Enforce production approval criteria (ADR-0085)
  if (record.target_environment === "production") {
    if (!record.approved_by || record.approved_by.trim().length === 0) {
      errors.push("approved_by operator attribution is mandatory for production promotion (ADR-0085)")
    }

    if (!record.approved_at || isNaN(Date.parse(record.approved_at))) {
      errors.push("approved_at valid ISO-8601 timestamp is mandatory for production promotion")
    }

    // Verify all mandatory gates passed
    const missingGates = MANDATORY_PRODUCTION_GATES.filter(
      (gate) => !record.verification_gates_passed.includes(gate)
    )

    if (missingGates.length > 0) {
      errors.push(
        `Missing mandatory verification gates for production promotion: [${missingGates.join(", ")}]`
      )
    }
  }

  // Validate migration plan if one is attached to promotion
  if (record.migration_plan) {
    const migrationValidation = validateMigrationPlan(record.migration_plan)
    if (!migrationValidation.is_valid) {
      errors.push(...migrationValidation.errors)
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Asserts promotion approval gate; throws MedusaError if validation fails.
 */
export function assertPromotionGate(
  record: PromotionApprovalRecord,
  tuple: ReleaseTuple
): void {
  const result = validatePromotionApproval(record, tuple)
  if (!result.is_valid) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Promotion gate check failed: ${result.errors.join("; ")}`
    )
  }
}
