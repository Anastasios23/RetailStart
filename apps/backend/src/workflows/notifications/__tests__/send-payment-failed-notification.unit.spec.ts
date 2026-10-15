import {
  buildPaymentFailedNotificationPayload,
  executeSendPaymentFailedNotification,
} from "../send-payment-failed-notification"
import { NotificationTemplates } from "../../../modules/notifications"

describe("send-payment-failed-notification workflow", () => {
  const mockFailedInput = {
    cartId: "cart_failed_123",
    paymentId: "pi_failed_456",
    email: "customer@example.com",
    errorMessage: "The card was declined: insufficient funds",
    sensitiveDetails: {
      cvv: "999",
      client_secret: "secret_payment_intent",
    },
  }

  describe("buildPaymentFailedNotificationPayload", () => {
    it("constructs sanitized payload and deterministic idempotency key", () => {
      const result = buildPaymentFailedNotificationPayload(mockFailedInput)

      expect(result).toBeDefined()
      expect(result.to).toBe("customer@example.com")
      expect(result.template).toBe(NotificationTemplates.PAYMENT_FAILED)
      expect(result.idempotency_key).toBe(
        "notif_payment-failed_cart_failed_123_pi_failed_456"
      )
      expect(result.data.cartId).toBe("cart_failed_123")
      expect(result.data.paymentId).toBe("pi_failed_456")
      expect(result.data.errorMessage).toBe(
        "The card was declined: insufficient funds"
      )
      expect(result.data.sensitiveDetails?.cvv).toBe("[REDACTED]")
      expect(result.data.sensitiveDetails?.client_secret).toBe("[REDACTED]")
    })
  })

  describe("executeSendPaymentFailedNotification", () => {
    it("calls notificationService.createNotifications with payment-failed payload", async () => {
      const mockCreateNotifications = jest
        .fn()
        .mockResolvedValue([{ id: "notif_failed_1" }])
      const mockNotificationService = {
        createNotifications: mockCreateNotifications,
      }

      const result = await executeSendPaymentFailedNotification({
        ...mockFailedInput,
        notificationService: mockNotificationService as any,
      })

      expect(result.success).toBe(true)
      expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
      const callArg = mockCreateNotifications.mock.calls[0][0]
      expect(callArg.template).toBe(NotificationTemplates.PAYMENT_FAILED)
      expect(callArg.to).toBe("customer@example.com")
    })

    it("catches provider failure without unhandled exception", async () => {
      const mockFailingService = {
        createNotifications: jest
          .fn()
          .mockRejectedValue(new Error("Provider gateway unavailable")),
      }

      const result = await executeSendPaymentFailedNotification({
        ...mockFailedInput,
        notificationService: mockFailingService as any,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Provider gateway unavailable")
    })
  })
})
