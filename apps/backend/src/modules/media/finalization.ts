import { MedusaError } from "@medusajs/framework/utils"
import type { MediaRecord, MediaVisibility } from "./types"
import type { MediaStorageAdapter } from "./storage-adapter"

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
])

export const DEFAULT_MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export type ValidateMediaFileInput = {
  contentType: string
  fileSize: number
  allowedMimeTypes?: Set<string>
  maxSizeBytes?: number
}

export function validateMediaFile({
  contentType,
  fileSize,
  allowedMimeTypes = ALLOWED_MEDIA_MIME_TYPES,
  maxSizeBytes = DEFAULT_MAX_MEDIA_SIZE_BYTES,
}: ValidateMediaFileInput): { isValid: true } {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Media file size must be greater than 0 bytes. Received: ${fileSize}`
    )
  }

  if (fileSize > maxSizeBytes) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Media file size ${fileSize} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`
    )
  }

  if (!allowedMimeTypes.has(contentType)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported media MIME type: ${contentType}. Allowed types: ${Array.from(
        allowedMimeTypes
      ).join(", ")}`
    )
  }

  return { isValid: true }
}

export type GenerateImmutableMediaKeyInput = {
  visibility: MediaVisibility
  checksum: string
  originalFilename: string
  mediaId: string
}

export function generateImmutableMediaKey({
  visibility,
  checksum,
  originalFilename,
  mediaId,
}: GenerateImmutableMediaKeyInput): string {
  const shortChecksum = checksum.slice(0, 16)
  const basename = originalFilename.split(/[/\\]/).pop() || "media"
  const sanitizedFilename = basename
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")

  return `${visibility}/${shortChecksum}_${mediaId}_${sanitizedFilename}`
}

export type ExecuteMediaFinalizationInput = {
  mediaId: string
  stagedKey: string
  originalFilename: string
  visibility: MediaVisibility
  expectedChecksum?: string
  storageAdapter: MediaStorageAdapter
  replacesMediaId?: string
  existingRecords?: Map<string, MediaRecord>
  publicUrlPrefix?: string
  metadata?: Record<string, any>
}

export type ExecuteMediaFinalizationResult = {
  media: MediaRecord
  supersededMedia?: MediaRecord
}

export async function executeMediaFinalization({
  mediaId,
  stagedKey,
  originalFilename,
  visibility,
  expectedChecksum,
  storageAdapter,
  replacesMediaId,
  existingRecords,
  publicUrlPrefix = "/static/media",
  metadata,
}: ExecuteMediaFinalizationInput): Promise<ExecuteMediaFinalizationResult> {
  const stagedObject = await storageAdapter.get(stagedKey)
  if (!stagedObject) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Staged object not found at key: ${stagedKey}`
    )
  }

  validateMediaFile({
    contentType: stagedObject.mimeType,
    fileSize: stagedObject.size,
  })

  if (expectedChecksum && stagedObject.checksum !== expectedChecksum) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Checksum mismatch for media ${mediaId}. Expected: ${expectedChecksum}, Actual: ${stagedObject.checksum}`
    )
  }

  const immutableKey = generateImmutableMediaKey({
    visibility,
    checksum: stagedObject.checksum,
    originalFilename,
    mediaId,
  })

  await storageAdapter.promote(stagedKey, immutableKey)

  const now = new Date().toISOString()
  const publicBase = publicUrlPrefix.replace(/\/+$/, "")
  const url =
    visibility === "public"
      ? `${publicBase}/${immutableKey}`
      : `/admin/media/${mediaId}/download`

  let supersededMedia: MediaRecord | undefined = undefined
  if (replacesMediaId && existingRecords) {
    const existing = existingRecords.get(replacesMediaId)
    if (existing) {
      supersededMedia = {
        ...existing,
        status: "superseded",
        superseded_by: mediaId,
        updated_at: now,
      }
      existingRecords.set(replacesMediaId, supersededMedia)
    }
  }

  const mediaRecord: MediaRecord = {
    id: mediaId,
    original_filename: originalFilename,
    mime_type: stagedObject.mimeType,
    file_size: stagedObject.size,
    visibility,
    status: "published",
    url,
    storage_key: immutableKey,
    checksum: stagedObject.checksum,
    replaced_id: replacesMediaId,
    metadata: metadata ?? null,
    created_at: now,
    updated_at: now,
  }

  if (existingRecords) {
    existingRecords.set(mediaId, mediaRecord)
  }

  return {
    media: mediaRecord,
    supersededMedia,
  }
}
