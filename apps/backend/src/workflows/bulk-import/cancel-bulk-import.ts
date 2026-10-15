import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BulkImportOperationRecord,
  globalImportOperationTracker,
  ImportOperationTracker,
} from "../../modules/bulk-import"

export interface CancelBulkImportInput {
  operation_id: string
}

export function executeCancelBulkImport(
  input: CancelBulkImportInput,
  customTracker?: ImportOperationTracker
): BulkImportOperationRecord {
  if (!input.operation_id || typeof input.operation_id !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Operation ID is required and must be a non-empty string"
    )
  }

  const tracker = customTracker ?? globalImportOperationTracker
  const existing = tracker.getOperation(input.operation_id)
  if (!existing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Bulk import operation '${input.operation_id}' not found`
    )
  }

  return tracker.requestCancellation(input.operation_id)
}

export const cancelBulkImportStep = createStep(
  "cancel-bulk-import",
  async (input: CancelBulkImportInput) => {
    const result = executeCancelBulkImport(input)
    return new StepResponse(result)
  }
)

export const cancelBulkImportWorkflow = createWorkflow(
  "cancel-bulk-import",
  (input: CancelBulkImportInput) => {
    const result = cancelBulkImportStep(input)
    return new WorkflowResponse(result)
  }
)
