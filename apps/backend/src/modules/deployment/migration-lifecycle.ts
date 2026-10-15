import { MedusaError } from "@medusajs/framework/utils"
import {
  CompatibilityMatrix,
  DeploymentValidationResult,
  MigrationClassification,
  MigrationDescriptor,
} from "./types"

export interface MigrationPlan {
  direction: "forward" | "forward_fix" | "rollback"
  migrations: MigrationDescriptor[]
  is_safe_for_rollback?: boolean
}

/**
 * Classifies a migration according to compatibility rules (ADR-0075).
 */
export function classifyMigration(
  descriptor: Partial<MigrationDescriptor> & { id: string; name: string }
): MigrationDescriptor {
  let classification: MigrationClassification =
    descriptor.classification || "backward_compatible"

  if (descriptor.is_destructive) {
    classification = "breaking_forward_fix_required"
  }

  return {
    id: descriptor.id,
    name: descriptor.name,
    classification,
    is_destructive: !!descriptor.is_destructive,
    applied_at: descriptor.applied_at,
    forward_fix_plan: descriptor.forward_fix_plan,
  }
}

/**
 * Validates a proposed migration plan (ADR-0055, ADR-0075).
 * Medusa, not Next.js, authoritatively owns commerce schema execution.
 */
export function validateMigrationPlan(plan: MigrationPlan): DeploymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!plan.migrations || plan.migrations.length === 0) {
    return { is_valid: true, errors, warnings }
  }

  for (const migration of plan.migrations) {
    // Destructive changes require an explicit forward-fix recovery plan
    if (
      migration.is_destructive ||
      migration.classification === "breaking_forward_fix_required"
    ) {
      if (!migration.forward_fix_plan || migration.forward_fix_plan.trim().length === 0) {
        errors.push(
          `Destructive migration '${migration.id}' (${migration.name}) requires an explicit forward-fix recovery plan (ADR-0075)`
        )
      }
    }

    // Rollback direction checks
    if (plan.direction === "rollback") {
      if (migration.is_destructive && !plan.is_safe_for_rollback) {
        errors.push(
          `Automatic down-migrations for destructive changes are rejected during rollback. Verified forward-fix or backup restore is required for '${migration.id}'`
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

/**
 * Validates whether an application rollback is safe given the currently applied database schema.
 * Rejects rollback if target app version does not support current database schema (ADR-0075).
 */
export function validateRollbackSafety(
  currentSchemaVersion: string,
  targetAppCompatibility: CompatibilityMatrix
): DeploymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const supportedSchemas = targetAppCompatibility?.supported_schema_versions || []
  if (!supportedSchemas.includes(currentSchemaVersion)) {
    errors.push(
      `Current schema version '${currentSchemaVersion}' is incompatible with rollback target application schema versions: [${supportedSchemas.join(", ")}]. Rollback rejected to prevent application crash or corruption (ADR-0075).`
    )
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Asserts migration plan validity; throws MedusaError if validation fails.
 */
export function assertMigrationPlanValid(plan: MigrationPlan): void {
  const result = validateMigrationPlan(plan)
  if (!result.is_valid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Migration plan rejected: ${result.errors.join("; ")}`
    )
  }
}
