import { createHmac, timingSafeEqual } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  MediaVisibility,
  SignedTransferAuthorization,
  SignedTransferOperation,
  SignedTransferTokenPayload,
} from "./types"

export type GenerateSignedTransferAuthorizationInput = {
  mediaId: string
  clientId: string
  operation: SignedTransferOperation
  key: string
  visibility: MediaVisibility
  baseUrl: string
  ttlSeconds?: number
  secret: string
}

export function generateSignedTransferAuthorization({
  mediaId,
  clientId,
  operation,
  key,
  visibility,
  baseUrl,
  ttlSeconds = 900,
  secret,
}: GenerateSignedTransferAuthorizationInput): SignedTransferAuthorization {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds

  const payload: SignedTransferTokenPayload = {
    media_id: mediaId,
    client_id: clientId,
    operation,
    key,
    visibility,
    expires_at: expiresAt,
  }

  const payloadString = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  )
  const signature = createHmac("sha256", secret)
    .update(payloadString)
    .digest("base64url")

  const token = `${payloadString}.${signature}`

  const url = new URL(baseUrl)
  url.searchParams.set("token", token)

  return {
    media_id: mediaId,
    transfer_url: url.toString(),
    key,
    visibility,
    operation,
    expires_at: expiresAt,
  }
}

export type VerifySignedTransferTokenInput = {
  token: string
  expectedOperation: SignedTransferOperation
  expectedKey?: string
  secret: string
  nowEpochSeconds?: number
}

export function verifySignedTransferToken({
  token,
  expectedOperation,
  expectedKey,
  secret,
  nowEpochSeconds,
}: VerifySignedTransferTokenInput): SignedTransferTokenPayload {
  const parts = token.split(".")
  if (parts.length !== 2) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid signed transfer token format"
    )
  }

  const [payloadString, providedSignature] = parts

  const expectedSignature = createHmac("sha256", secret)
    .update(payloadString)
    .digest("base64url")

  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Invalid signed transfer token signature"
    )
  }

  let payload: SignedTransferTokenPayload
  try {
    payload = JSON.parse(
      Buffer.from(payloadString, "base64url").toString("utf8")
    )
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Malformed signed transfer token payload"
    )
  }

  const now = nowEpochSeconds ?? Math.floor(Date.now() / 1000)
  if (payload.expires_at <= now) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Signed transfer token has expired. Expiry: ${payload.expires_at}, Current: ${now}`
    )
  }

  if (payload.operation !== expectedOperation) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Signed transfer operation mismatch. Expected: ${expectedOperation}, Received: ${payload.operation}`
    )
  }

  if (expectedKey && payload.key !== expectedKey) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Signed transfer key mismatch. Expected: ${expectedKey}, Received: ${payload.key}`
    )
  }

  return payload
}
