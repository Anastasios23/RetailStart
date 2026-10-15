import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import {
  ALLOWED_MEDIA_MIME_TYPES,
  generateSignedTransferAuthorization,
  type MediaVisibility,
  type SignedTransferAuthorization,
} from "../../modules/media"

export type AuthorizeMediaUploadInput = {
  clientId: string
  originalFilename: string
  visibility: MediaVisibility
  contentType?: string
  baseUrl?: string
  ttlSeconds?: number
  secret?: string
}

export type AuthorizeMediaUploadResult = {
  mediaId: string
  stagedKey: string
  signedAuth: SignedTransferAuthorization
}

export function executeAuthorizeMediaUpload(
  input: AuthorizeMediaUploadInput
): AuthorizeMediaUploadResult {
  if (input.contentType && !ALLOWED_MEDIA_MIME_TYPES.has(input.contentType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported media MIME type: ${input.contentType}`
    )
  }

  const mediaId = `med_${randomUUID().replace(/-/g, "").slice(0, 12)}`
  const sanitizedFilename = input.originalFilename
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")

  const stagedKey = `staged/${input.clientId}/${mediaId}_${sanitizedFilename}`

  const secret =
    input.secret ||
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    "default-media-secret"

  const baseUrl =
    input.baseUrl ||
    process.env.MEDIA_UPLOAD_URL ||
    "http://localhost:9000/api/media/upload"

  const signedAuth = generateSignedTransferAuthorization({
    mediaId,
    clientId: input.clientId,
    operation: "upload",
    key: stagedKey,
    visibility: input.visibility,
    baseUrl,
    ttlSeconds: input.ttlSeconds ?? 900,
    secret,
  })

  return {
    mediaId,
    stagedKey,
    signedAuth,
  }
}

export const authorizeMediaUploadStep = createStep(
  "authorize-media-upload",
  async (
    input: AuthorizeMediaUploadInput
  ): Promise<StepResponse<AuthorizeMediaUploadResult>> => {
    const result = executeAuthorizeMediaUpload(input)
    return new StepResponse<AuthorizeMediaUploadResult>(result)
  }
)

export const authorizeMediaUploadWorkflow = createWorkflow(
  "authorize-media-upload",
  (input: AuthorizeMediaUploadInput) => {
    const result = authorizeMediaUploadStep(input)
    return new WorkflowResponse(result)
  }
)
