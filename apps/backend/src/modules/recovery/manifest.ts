import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import {
  MediaIntegrityResult,
  ReconciliationGateResult,
  RecoveryManifest,
  RestoreValidationResult,
  RestoredEnvironmentPromotionRecord,
} from "./manifest-types"
import { ReconciliationService } from "./service"

/**
 * Creates a coordinated client recovery manifest (ADR-0082).
 */
export function createRecoveryManifest(
  params: Omit<RecoveryManifest, "manifest_id">
): RecoveryManifest {
  if (!params.release_tuple_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required release_tuple_id in recovery manifest"
    )
  }

  if (
    !params.database?.recovery_point_id ||
    !params.database?.schema_version ||
    !params.database?.checksum
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required database recovery point checksum or identifier (ADR-0016)"
    )
  }

  if (!params.media_storage?.bucket || !params.media_storage?.snapshot_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required media storage snapshot or bucket in recovery manifest"
    )
  }

  if (!params.configuration?.config_digest || !params.configuration?.environment) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required configuration digest or target environment"
    )
  }

  const manifest_id = `rm_${randomUUID().replace(/-/g, "").substring(0, 16)}`

  return {
    manifest_id,
    release_tuple_id: params.release_tuple_id,
    database: params.database,
    media_storage: {
      ...params.media_storage,
      media_keys: params.media_storage.media_keys || [],
    },
    configuration: params.configuration,
    created_at: params.created_at || new Date().toISOString(),
    created_by: params.created_by,
  }
}

/**
 * Validates internal consistency of a coordinated recovery manifest.
 */
export function validateRecoveryManifest(
  manifest: RecoveryManifest
): RestoreValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!manifest.manifest_id) {
    errors.push("Missing manifest_id")
  }

  if (!manifest.release_tuple_id) {
    errors.push("Missing release_tuple_id")
  }

  if (
    !manifest.database?.snapshot_timestamp ||
    isNaN(Date.parse(manifest.database.snapshot_timestamp))
  ) {
    errors.push("Invalid or missing database.snapshot_timestamp ISO-8601 date")
  }

  if (!manifest.database?.checksum || manifest.database.checksum.trim().length === 0) {
    errors.push("Missing database recovery point checksum")
  }

  if (!manifest.media_storage?.snapshot_id) {
    errors.push("Missing media_storage.snapshot_id")
  }

  if (!manifest.configuration?.config_digest) {
    errors.push("Missing configuration.config_digest")
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Verifies that all media references in the restored database point to existing media in the object storage backup (ADR-0016, ADR-0082).
 */
export function verifyMediaReferenceIntegrity(
  referencedMediaKeys: string[],
  availableStorageKeys: string[]
): MediaIntegrityResult {
  const storageSet = new Set(availableStorageKeys)
  const missing_keys: string[] = []

  for (const key of referencedMediaKeys) {
    if (!storageSet.has(key)) {
      missing_keys.push(key)
    }
  }

  return {
    checked_count: referencedMediaKeys.length,
    missing_keys,
    is_valid: missing_keys.length === 0,
  }
}

/**
 * Evaluates provider reconciliation status on restored dataset before promotion (ADR-0032, ADR-0061, ADR-0072).
 * Blocks promotion if any ambiguous operations remain unresolved.
 */
export function evaluateProviderReconciliationGate(
  reconciliationService: ReconciliationService
): ReconciliationGateResult {
  const pendingRecords = reconciliationService.listPendingReconciliations()
  const ambiguousCount = pendingRecords.filter(
    (r) => r.status === "ambiguous" || r.status === "reconciliation_required"
  ).length

  const allRecords = (reconciliationService as any).records
    ? Array.from((reconciliationService as any).records.values() as Iterable<any>)
    : []
  const reconciledCount = allRecords.filter((r: any) => r.status === "reconciled").length

  const errors: string[] = []
  if (ambiguousCount > 0) {
    errors.push(
      `Restore gate blocked: ${ambiguousCount} unresolved ambiguous operations require operator reconciliation before promotion`
    )
  }

  return {
    total_operations: allRecords.length,
    ambiguous_count: ambiguousCount,
    reconciled_count: reconciledCount,
    passed: ambiguousCount === 0,
    errors,
  }
}

/**
 * Asserts that a restored environment meets all promotion criteria and evidence requirements (ADR-0082).
 */
export function assertRestoredEnvironmentPromotion(
  promotionRecord: RestoredEnvironmentPromotionRecord,
  manifest: RecoveryManifest,
  reconciliationService: ReconciliationService
): void {
  // Validate manifest matching
  if (promotionRecord.manifest_id !== manifest.manifest_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Manifest ID mismatch: Promotion targets '${promotionRecord.manifest_id}', but manifest is '${manifest.manifest_id}'`
    )
  }

  // Validate manifest coherence
  const manifestValidation = validateRecoveryManifest(manifest)
  if (!manifestValidation.is_valid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Recovery manifest is invalid: ${manifestValidation.errors.join("; ")}`
    )
  }

  // Validate operator attribution
  if (!promotionRecord.verified_by || promotionRecord.verified_by.trim().length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "verified_by operator attribution is mandatory for promoting a restored environment"
    )
  }

  // Validate complete operator evidence
  const { database_coherent, media_verified, provider_reconciled } =
    promotionRecord.evidence
  if (!database_coherent || !media_verified || !provider_reconciled) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Missing complete verification evidence (database, media, and provider reconciliation must all be verified)"
    )
  }

  // Validate provider reconciliation gate
  const reconciliationGate = evaluateProviderReconciliationGate(reconciliationService)
  if (!reconciliationGate.passed) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Provider reconciliation gate failed: ${reconciliationGate.errors.join("; ")}`
    )
  }
}
