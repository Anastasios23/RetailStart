import { MedusaError } from "@medusajs/framework/utils"
import { createHash } from "node:crypto"
import {
  ActivationOperationInput,
  ActivationOperationRecord,
  LifecyclePolicy,
  LifecycleValidationResult,
} from "./types"

export class LifecycleActivationService {
  private policies: Map<string, LifecyclePolicy> = new Map()
  private activePolicyVersion: string | null = null
  private activationOperations: Map<string, ActivationOperationRecord> = new Map()
  private activationHistory: ActivationOperationRecord[] = []

  public registerPolicy(policy: LifecyclePolicy): void {
    this.policies.set(policy.version, policy)
  }

  public getActivePolicyVersion(): string | null {
    return this.activePolicyVersion
  }

  public getActivePolicy(): LifecyclePolicy | null {
    if (!this.activePolicyVersion) return null
    return this.policies.get(this.activePolicyVersion) || null
  }

  public getActivationHistory(): ActivationOperationRecord[] {
    return [...this.activationHistory]
  }

  private computeFingerprint(input: ActivationOperationInput): string {
    const canonical = JSON.stringify({
      client_id: input.client_id,
      environment: input.environment,
      expected_current_version: input.expected_current_version,
      target_version: input.target_version,
    })
    return createHash("sha256").update(canonical).digest("hex")
  }

  /**
   * Activates a lifecycle policy with compare-and-set concurrency control and idempotent execution (ADR-0149-0152).
   */
  public activatePolicy(input: ActivationOperationInput): ActivationOperationRecord {
    const fingerprint = this.computeFingerprint(input)

    // Idempotency check (ADR-0152)
    const existing = this.activationOperations.get(input.operation_id)
    if (existing) {
      if (existing.request_fingerprint !== fingerprint) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Idempotency conflict: operation_id '${input.operation_id}' reused with different request parameters (ADR-0152)`
        )
      }
      return existing
    }

    const policy = this.policies.get(input.target_version)
    if (!policy) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Target lifecycle policy version '${input.target_version}' not found`
      )
    }

    // Approval requirement (ADR-0148, ADR-0149)
    if (policy.approval_status !== "approved") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot activate unapproved lifecycle policy (version '${policy.version}' is in '${policy.approval_status}' state) (ADR-0148)`
      )
    }

    // Effective date requirement
    const effectiveTime = Date.parse(policy.effective_date)
    if (!isNaN(effectiveTime) && effectiveTime > Date.now()) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Policy effective_date '${policy.effective_date}' has not yet been reached`
      )
    }

    // Compare-and-set concurrency control (ADR-0151)
    if (input.expected_current_version !== this.activePolicyVersion) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Concurrency conflict: expected version '${input.expected_current_version}', but active version is '${this.activePolicyVersion}' (ADR-0151)`
      )
    }

    // Atomic pointer transition (ADR-0150)
    const previous = this.activePolicyVersion
    this.activePolicyVersion = input.target_version

    const record: ActivationOperationRecord = {
      operation_id: input.operation_id,
      client_id: input.client_id,
      environment: input.environment,
      expected_current_version: input.expected_current_version,
      target_version: input.target_version,
      previous_active_version: previous,
      new_active_version: input.target_version,
      activated_by: input.activated_by,
      activated_at: new Date().toISOString(),
      request_fingerprint: fingerprint,
      status: "completed",
      reason: input.reason,
    }

    this.activationOperations.set(input.operation_id, record)
    this.activationHistory.push(record)

    return record
  }

  /**
   * Preproduction gate validation: Exactly one approved lifecycle policy must be active (ADR-0150).
   */
  public validateProductionLifecycleReadiness(): LifecycleValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!this.activePolicyVersion) {
      errors.push("Production readiness requires exactly one active approved lifecycle policy (ADR-0150)")
    } else {
      const activePolicy = this.policies.get(this.activePolicyVersion)
      if (!activePolicy || activePolicy.approval_status !== "approved") {
        errors.push(`Currently active lifecycle policy '${this.activePolicyVersion}' is not approved`)
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
