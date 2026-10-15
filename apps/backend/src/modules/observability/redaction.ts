import { SanitizedErrorInfo } from "./types"

const SENSITIVE_KEY_REGEX =
  /(?:password|secret|token|api_?key|auth(?:orization)?|cookie|jwt|credit_?card|card_?number|cvv|cvc|pan)/i

const CARD_PAN_REGEX = /\b(?:\d[ -]*?){13,19}\b/g

const TOKEN_PATTERN_REGEX =
  /(?:(?:sk_live_|sk_test_|whsec_|Bearer\s+)[a-zA-Z0-9_\-.]+|(?:apiKey|api_key)=([a-zA-Z0-9_\-.]+))/gi

function maskStringValue(val: string): string {
  let masked = val.replace(CARD_PAN_REGEX, "[REDACTED_CARD]")
  masked = masked.replace(TOKEN_PATTERN_REGEX, (match, capturedKey) => {
    if (capturedKey) {
      return match.replace(capturedKey, "[REDACTED]")
    }
    return "[REDACTED]"
  })
  return masked
}

export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === "string") {
    return maskStringValue(data)
  }

  if (typeof data === "number" || typeof data === "boolean" || typeof data === "bigint") {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item))
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = "[REDACTED]"
      } else {
        result[key] = redactSensitiveData(value)
      }
    }
    return result
  }

  return "[UNSERIALIZABLE]"
}

export function sanitizeError(err: unknown): SanitizedErrorInfo {
  if (err instanceof Error) {
    return {
      name: err.name || "Error",
      message: maskStringValue(err.message),
      stack: err.stack ? maskStringValue(err.stack) : undefined,
    }
  }

  return {
    name: "UnknownError",
    message: maskStringValue(String(err)),
  }
}
