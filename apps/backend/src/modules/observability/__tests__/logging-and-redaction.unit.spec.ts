import { redactSensitiveData, sanitizeError } from "../redaction"
import { StructuredLogger } from "../logger"
import { StructuredLogEntry } from "../types"

describe("Observability Logging & Redaction", () => {
  it("redacts sensitive keys in flat objects", () => {
    const input = {
      username: "john_doe",
      password: "SuperSecretPassword123",
      api_key: "sk_test_123456789",
      secret: "whsec_abcdefg",
      client_secret: "pi_123_secret_xyz",
      authorization: "Bearer my-jwt-token",
      cookie: "_medusa_cart_id=cart_123; session=abc",
    }

    const redacted = redactSensitiveData(input) as Record<string, unknown>

    expect(redacted.username).toBe("john_doe")
    expect(redacted.password).toBe("[REDACTED]")
    expect(redacted.api_key).toBe("[REDACTED]")
    expect(redacted.secret).toBe("[REDACTED]")
    expect(redacted.client_secret).toBe("[REDACTED]")
    expect(redacted.authorization).toBe("[REDACTED]")
    expect(redacted.cookie).toBe("[REDACTED]")
  })

  it("redacts sensitive keys deeply in nested objects and arrays", () => {
    const nested = {
      orderId: "order_123",
      payment: {
        method: "stripe",
        tokens: ["tok_abc", "tok_xyz"],
        credentials: {
          token: "secret-bearer-token",
        },
      },
      headers: [
        { name: "Content-Type", value: "application/json" },
        { name: "Authorization", value: "Bearer secret-token" },
      ],
    }

    const redacted = redactSensitiveData(nested) as any
    expect(redacted.orderId).toBe("order_123")
    expect(redacted.payment.method).toBe("stripe")
    expect(redacted.payment.credentials.token).toBe("[REDACTED]")
    expect(redacted.headers[1].value).toBe("[REDACTED]")
  })

  it("masks credit card PAN patterns in string values", () => {
    const textWithCard = "Customer attempted payment with card 4111222233334444 on checkout"
    const redacted = redactSensitiveData(textWithCard)
    expect(redacted).toBe(
      "Customer attempted payment with card [REDACTED_CARD] on checkout"
    )
  })

  it("sanitizes Error objects preserving name and message without leaking credentials in error message", () => {
    const errorWithSecret = new Error(
      "Failed to connect using apiKey=sk_live_verysecret123 to host"
    )
    const sanitized = sanitizeError(errorWithSecret)

    expect(sanitized.name).toBe("Error")
    expect(sanitized.message).not.toContain("sk_live_verysecret123")
    expect(sanitized.message).toContain("[REDACTED]")
  })

  it("formats structured log entries as valid JSON with correlation context", () => {
    const entries: StructuredLogEntry[] = []
    const logger = new StructuredLogger((entry) => entries.push(entry))

    logger.info("Order processed successfully", {
      correlation_id: "corr_abc_123",
      operation_id: "op_checkout_456",
      principal_id: "usr_admin_1",
      cart_total: 5000,
      client_secret: "pi_secret_hidden",
    })

    expect(entries.length).toBe(1)
    const entry = entries[0]
    expect(entry.level).toBe("info")
    expect(entry.message).toBe("Order processed successfully")
    expect(entry.context?.correlation_id).toBe("corr_abc_123")
    expect(entry.context?.operation_id).toBe("op_checkout_456")
    expect(entry.context?.cart_total).toBe(5000)
    // Redaction applied to context
    expect(entry.context?.client_secret).toBe("[REDACTED]")
    expect(entry.timestamp).toBeDefined()
  })
})
