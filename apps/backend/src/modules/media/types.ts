export type MediaVisibility = "public" | "protected"

export type MediaStatus = "staged" | "published" | "superseded" | "retired"

export type SignedTransferOperation = "upload" | "download"

export type SignedTransferTokenPayload = {
  media_id: string
  client_id: string
  operation: SignedTransferOperation
  key: string
  visibility: MediaVisibility
  expires_at: number
}

export type SignedTransferAuthorization = {
  media_id: string
  transfer_url: string
  key: string
  visibility: MediaVisibility
  operation: SignedTransferOperation
  expires_at: number
  headers?: Record<string, string>
}

export type MediaRecord = {
  id: string
  original_filename: string
  mime_type: string
  file_size: number
  visibility: MediaVisibility
  status: MediaStatus
  url: string
  storage_key: string
  checksum: string
  superseded_by?: string
  replaced_id?: string
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}
