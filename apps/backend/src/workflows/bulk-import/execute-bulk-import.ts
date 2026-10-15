import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BulkImportBatchPayload,
  BulkImportExecutor,
  BulkImportOperationRecord,
  globalImportOperationTracker,
  ImportDomainPathways,
  ImportOperationTracker,
} from "../../modules/bulk-import"

export interface ExecuteBulkImportInput {
  operation_id: string
  batch: BulkImportBatchPayload
}

export async function executeBulkImport(
  input: ExecuteBulkImportInput,
  customPathways?: ImportDomainPathways,
  customTracker?: ImportOperationTracker
): Promise<BulkImportOperationRecord> {
  if (!input.operation_id || typeof input.operation_id !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Operation ID is required and must be a non-empty string"
    )
  }

  if (!input.batch || typeof input.batch !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bulk import batch payload is required"
    )
  }

  const tracker = customTracker ?? globalImportOperationTracker
  const pathways: ImportDomainPathways =
    customPathways ?? {
      createCategory: async (cat) => ({ id: `cat_${cat.handle}`, handle: cat.handle }),
      createProduct: async (prod) => ({ id: `prod_${prod.handle}`, handle: prod.handle }),
      createVariant: async (v) => ({ id: `var_${v.sku}`, sku: v.sku }),
      createPrice: async (p) => ({
        id: `price_${p.variant_sku}_${p.currency_code}`,
        variant_sku: p.variant_sku,
        amount: p.amount,
        currency_code: p.currency_code,
      }),
      updateInventory: async (inv) => ({
        variant_sku: inv.variant_sku,
        location_id: inv.location_id,
        stocked_quantity: inv.stocked_quantity,
      }),
    }

  const executor = new BulkImportExecutor(tracker, pathways)

  try {
    return await executor.executeBatch(input.operation_id, input.batch)
  } catch (err: unknown) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Bulk import execution failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const executeBulkImportStep = createStep(
  "execute-bulk-import",
  async (input: ExecuteBulkImportInput) => {
    const result = await executeBulkImport(input)
    return new StepResponse(result)
  }
)

export const executeBulkImportWorkflow = createWorkflow(
  "execute-bulk-import",
  (input: ExecuteBulkImportInput) => {
    const result = executeBulkImportStep(input)
    return new WorkflowResponse(result)
  }
)
