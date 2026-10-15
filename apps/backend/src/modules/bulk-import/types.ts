export type PrincipalType = "admin" | "service"
export type SourceInterface = "admin_import" | "cli" | "workflow" | "api"

export interface OperationalAttribution {
  principal_id: string
  principal_type: PrincipalType
  source_interface: SourceInterface
  correlation_id?: string
  target_environment?: string
  timestamp: string
}

export type ImportUnitType = "category" | "product" | "variant" | "price" | "inventory"

export type ImportUnitStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped"

export interface CategoryImportPayload {
  name: string
  handle: string
  parent_category_handle?: string
  is_active?: boolean
  description?: string
}

export interface ProductImportPayload {
  title: string
  handle: string
  description?: string
  category_handles?: string[]
  status?: "draft" | "proposed" | "published" | "rejected"
}

export interface VariantImportPayload {
  product_handle: string
  title: string
  sku: string
  options?: Record<string, string>
  manage_inventory?: boolean
}

export interface PriceImportPayload {
  variant_sku: string
  amount: number // Minor units, non-negative integer
  currency_code: string // Lowercase 3-letter ISO code
}

export interface InventoryImportPayload {
  variant_sku: string
  location_id: string
  stocked_quantity: number // Non-negative integer
}

export interface ImportUnit<TPayload = unknown> {
  unit_id: string
  unit_type: ImportUnitType
  key: string // Unique natural identifier within the batch (e.g. "cat:shirts", "prod:classic-tee", "var:tee-black-s", "price:tee-black-s:eur", "inv:tee-black-s:loc1")
  dependencies: string[] // Natural keys that must succeed before this unit can execute
  payload: TPayload
  status: ImportUnitStatus
  result?: Record<string, unknown>
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface BulkImportBatchPayload {
  version: "1.0"
  batch_id: string
  attribution: Omit<OperationalAttribution, "timestamp"> & { timestamp?: string }
  categories?: CategoryImportPayload[]
  products?: ProductImportPayload[]
  variants?: VariantImportPayload[]
  prices?: PriceImportPayload[]
  inventory?: InventoryImportPayload[]
}

export type BulkImportOperationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled"

export interface BulkImportOperationSummary {
  total_units: number
  completed_units: number
  failed_units: number
  cancelled_units: number
  skipped_units: number
}

export interface BulkImportOperationRecord {
  operation_id: string
  version: "1.0"
  batch_id: string
  attribution: OperationalAttribution
  status: BulkImportOperationStatus
  summary: BulkImportOperationSummary
  units: Record<string, ImportUnit>
  created_at: string
  updated_at: string
  completed_at?: string
}
