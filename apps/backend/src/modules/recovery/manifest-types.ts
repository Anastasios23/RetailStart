import { EnvironmentType } from "../deployment/types"

export interface DatabaseRecoveryPoint {
  recovery_point_id: string
  schema_version: string
  snapshot_timestamp: string
  checksum: string
}

export interface MediaStorageRecoveryPoint {
  snapshot_id: string
  bucket: string
  prefix: string
  media_keys: string[]
}

export interface ConfigurationRecoveryPoint {
  config_digest: string
  environment: EnvironmentType
}

export interface RecoveryManifest {
  manifest_id: string
  release_tuple_id: string
  database: DatabaseRecoveryPoint
  media_storage: MediaStorageRecoveryPoint
  configuration: ConfigurationRecoveryPoint
  created_at: string
  created_by: string
}

export interface MediaIntegrityResult {
  checked_count: number
  missing_keys: string[]
  is_valid: boolean
}

export interface ReconciliationGateResult {
  total_operations: number
  ambiguous_count: number
  reconciled_count: number
  passed: boolean
  errors: string[]
}

export interface RestoredEnvironmentPromotionRecord {
  promotion_id: string
  manifest_id: string
  target_environment: EnvironmentType
  verified_by: string
  verified_at: string
  evidence: {
    database_coherent: boolean
    media_verified: boolean
    provider_reconciled: boolean
  }
}

export interface RestoreValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  media_integrity?: MediaIntegrityResult
  reconciliation_gate?: ReconciliationGateResult
}
