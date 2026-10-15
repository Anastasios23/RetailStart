import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  executeMediaFinalization,
  type ExecuteMediaFinalizationResult,
  type MediaStorageAdapter,
  type MediaVisibility,
  verifySignedTransferToken,
} from "../../modules/media"

export type FinalizeMediaUploadWorkflowInput = {
  mediaId: string
  stagedKey: string
  originalFilename: string
  visibility: MediaVisibility
  token: string
  secret?: string
  expectedChecksum?: string
  replacesMediaId?: string
  publicUrlPrefix?: string
  metadata?: Record<string, any>
  storageAdapter?: MediaStorageAdapter
}

export async function executeFinalizeMediaUploadWorkflow(
  input: FinalizeMediaUploadWorkflowInput
): Promise<ExecuteMediaFinalizationResult> {
  const secret =
    input.secret ||
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    "default-media-secret"

  // 1. Verify signed transfer token and key/operation scope (ADR-0121)
  verifySignedTransferToken({
    token: input.token,
    expectedOperation: "upload",
    expectedKey: input.stagedKey,
    secret,
  })

  // 2. Execute finalization and promote staged object to immutable published key (ADR-0059, ADR-0122)
  if (!input.storageAdapter) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "storageAdapter is required for finalizeMediaUpload"
    )
  }

  return await executeMediaFinalization({
    mediaId: input.mediaId,
    stagedKey: input.stagedKey,
    originalFilename: input.originalFilename,
    visibility: input.visibility,
    expectedChecksum: input.expectedChecksum,
    storageAdapter: input.storageAdapter,
    replacesMediaId: input.replacesMediaId,
    publicUrlPrefix: input.publicUrlPrefix,
    metadata: input.metadata,
  })
}

export const finalizeMediaUploadStep = createStep(
  "finalize-media-upload",
  async (
    input: FinalizeMediaUploadWorkflowInput
  ): Promise<StepResponse<ExecuteMediaFinalizationResult>> => {
    const result = await executeFinalizeMediaUploadWorkflow(input)
    return new StepResponse<ExecuteMediaFinalizationResult>(result)
  }
)

export const finalizeMediaUploadWorkflow = createWorkflow(
  "finalize-media-upload",
  (input: FinalizeMediaUploadWorkflowInput) => {
    const result = finalizeMediaUploadStep(input)
    return new WorkflowResponse(result)
  }
)
