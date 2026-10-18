export type AcceptanceGateStatus = "passed" | "failed" | "skipped"

export interface AcceptanceGateRecord {
  gate_id: string
  phase: number
  name: string
  status: AcceptanceGateStatus
  adrs: string[]
  verified_at: string
  evidence_summary: string
}

export interface ProductionReadinessReport {
  report_id: string
  evaluated_at: string
  total_gates: number
  passed_gates: number
  failed_gates: number
  is_production_ready: boolean
  release_tuple_id: string
  lifecycle_policy_version: string
  gate_results: AcceptanceGateRecord[]
  deferred_limitations: string[]
}

export interface ProductionReadinessOptions {
  release_tuple_id: string
  lifecycle_policy_version: string
  include_e2e_evidence?: boolean
}
