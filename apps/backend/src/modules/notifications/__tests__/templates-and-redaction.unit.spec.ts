import {
  NotificationTemplates,
  buildNotificationIdempotencyKey,
  sanitizeNotificationPayload,
} from "../index"

describe("Notification Templates & Redaction Engine", () => {
  describe("NotificationTemplates", () => {
    it("defines the provider-neutral notification template constants", () => {
      expect(NotificationTemplates.ORDER_PLACED).toBe("order-placed")
      expect(NotificationTemplates.ADMIN_NEW_ORDER).toBe("admin-new-order")
      expect(NotificationTemplates.PAYMENT_FAILED).toBe("payment-failed")
      expect(NotificationTemplates.REFUND_CONFIRMATION).toBe("refund-confirmation")
    })
  })

  describe("buildNotificationIdempotencyKey", () => {
    it("builds deterministic idempotency keys for order confirmation and admin alert", () => {
      const orderKey = buildNotificationIdempotencyKey(
        NotificationTemplates.ORDER_PLACED,
        "order_123"
      )
      expect(orderKey).toBe("notif_order-placed_order_123")

      const adminKey = buildNotificationIdempotencyKey(
        NotificationTemplates.ADMIN_NEW_ORDER,
        "order_123"
      )
      expect(adminKey).toBe("notif_admin-new-order_order_123")
    })

    it("builds deterministic key with secondary entity identifier", () => {
      const paymentFailedKey = buildNotificationIdempotencyKey(
        NotificationTemplates.PAYMENT_FAILED,
        "cart_123",
        "pi_456"
      )
      expect(paymentFailedKey).toBe("notif_payment-failed_cart_123_pi_456")
    })
  })

  describe("sanitizeNotificationPayload", () => {
    it("preserves safe commerce summary data", () => {
      const safeData = {
        orderId: "order_123",
        displayId: 42,
        total: 3500,
        currencyCode: "eur",
        customerEmail: "user@example.com",
        items: [{ title: "Product 1", quantity: 2, unitPrice: 1000 }],
      }

      const result = sanitizeNotificationPayload(safeData)
      expect(result).toEqual(safeData)
    })

    it("redacts sensitive card numbers, cvc/cvv, and authentication tokens", () => {
      const dirtyData = {
        orderId: "order_123",
        total: 5000,
        cardNumber: "4242424242424242",
        card_number: "4000001234567890",
        cvv: "123",
        cvc: "456",
        client_secret: "pi_123_secret_xyz",
        stripeApiKey: "sk_test_12345",
        nested: {
          token: "secret-token",
          safeField: "safeValue",
        },
      }

      const result = sanitizeNotificationPayload(dirtyData)
      expect(result.orderId).toBe("order_123")
      expect(result.total).toBe(5000)
      expect(result.cardNumber).toBe("[REDACTED]")
      expect(result.card_number).toBe("[REDACTED]")
      expect(result.cvv).toBe("[REDACTED]")
      expect(result.cvc).toBe("[REDACTED]")
      expect(result.client_secret).toBe("[REDACTED]")
      expect(result.stripeApiKey).toBe("[REDACTED]")
      expect(result.nested).toEqual({
        token: "[REDACTED]",
        safeField: "safeValue",
      })
    })
  })
})
