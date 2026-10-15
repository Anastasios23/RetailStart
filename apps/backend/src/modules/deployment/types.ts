export type EnvironmentType = "development" | "test" | "staging" | "production"

export type MigrationClassification =
  | "backward_compatible"
  | "transitional"
  | "breaking_forward_fix_required"

export interface MigrationDescriptor {
  id: string
  name: string
  classification: MigrationClassification
  applied_at?: string
  is_destructive?: boolean
  forward_fix_plan?: string
}

export interface CompatibilityMatrix {
  supported_storefront_range: string
  supported_schema_versions: string[]
  supported_presentation_versions: string[]
}

export interface ReleaseTuple {
  tuple_id: string
  backend_version: string
  storefront_version: string
  schema_version: string
  presentation_bundle_version: string
  extensions: Record<string, string>
  compatibility: CompatibilityMatrix
  metadata: {
    git_sha?: string
    build_timestamp: string
    docker_image_digest?: string
  }
}

export interface PromotionApprovalRecord {
  approval_id: string
  tuple_id: string
  source_environment: EnvironmentType
  target_environment: EnvironmentType
  approved_by: string
  approved_at: string
  verification_gates_passed: string[]
  migration_plan?: {
    direction: "forward" | "forward_fix" | "rollback"
    migrations: MigrationDescriptor[]
    is_safe_for_rollback: boolean
  }
}

export interface DeploymentValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}
