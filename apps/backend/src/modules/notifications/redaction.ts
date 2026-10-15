const SENSITIVE_KEY_PATTERN =
  /(card_?number|pan|cvv|cvc|client_?secret|api_?key|stripe_?api_?key|secret_?key|token|password|authorization)/i

/**
 * Recursively redacts cardholder data, credentials, and API secrets from notification payloads.
 */
export function sanitizeNotificationPayload<T>(input: T): T {
  if (input === null || input === undefined) {
    return input
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeNotificationPayload(item)) as unknown as T
  }

  if (typeof input === "object" && !(input instanceof Date)) {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED]"
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeNotificationPayload(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized as T
  }

  return input
}
