import {
  buildOrderNotificationsPayload,
  executeSendOrderNotifications,
} from "../send-order-notifications"
import { NotificationTemplates } from "../../../modules/notifications"

describe("send-order-notifications workflow", () => {
  const mockOrder = {
    id: "order_test_123",
    display_id: 1001,
    email: "customer@example.com",
    currency_code: "eur",
    total: 4500,
    items: [
      {
        id: "item_1",
        title: "Classic White Tee",
        quantity: 2,
        unit_price: 2250,
      },
    ],
    metadata: {
      cardNumber: "4242424242424242",
      safeNote: "Please leave at front door",
    },
  }

  describe("buildOrderNotificationsPayload", () => {
    it("constructs sanitized payloads and deterministic idempotency keys for customer and admin", () => {
      const result = buildOrderNotificationsPayload({
        order: mockOrder,
        adminEmail: "admin@retail-starter.internal",
      })

      expect(result.customerNotification).toBeDefined()
      expect(result.customerNotification?.to).toBe("customer@example.com")
      expect(result.customerNotification?.template).toBe(
        NotificationTemplates.ORDER_PLACED
      )
      expect(result.customerNotification?.idempotency_key).toBe(
        "notif_order-placed_order_test_123"
      )
      expect(result.customerNotification?.data.orderId).toBe("order_test_123")
      expect(result.customerNotification?.data.displayId).toBe(1001)
      expect(result.customerNotification?.data.total).toBe(4500)
      // Sensitive data must be redacted
      expect(result.customerNotification?.data.metadata?.cardNumber).toBe(
        "[REDACTED]"
      )
      expect(result.customerNotification?.data.metadata?.safeNote).toBe(
        "Please leave at front door"
      )

      expect(result.adminNotification).toBeDefined()
      expect(result.adminNotification?.to).toBe("admin@retail-starter.internal")
      expect(result.adminNotification?.template).toBe(
        NotificationTemplates.ADMIN_NEW_ORDER
      )
      expect(result.adminNotification?.idempotency_key).toBe(
        "notif_admin-new-order_order_test_123"
      )
    })

    it("handles order without email gracefully", () => {
      const orderWithoutEmail = { ...mockOrder, email: null }
      const result = buildOrderNotificationsPayload({
        order: orderWithoutEmail,
        adminEmail: "admin@retail-starter.internal",
      })

      expect(result.customerNotification).toBeNull()
      expect(result.adminNotification).toBeDefined()
      expect(result.adminNotification?.to).toBe("admin@retail-starter.internal")
    })
  })

  describe("executeSendOrderNotifications", () => {
    it("calls notificationService.createNotifications with customer and admin notifications", async () => {
      const mockCreateNotifications = jest.fn().mockResolvedValue([
        { id: "notif_1" },
        { id: "notif_2" },
      ])
      const mockNotificationService = {
        createNotifications: mockCreateNotifications,
      }

      const result = await executeSendOrderNotifications({
        order: mockOrder,
        adminEmail: "admin@retail-starter.internal",
        notificationService: mockNotificationService as any,
      })

      expect(result.success).toBe(true)
      expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
      const callArg = mockCreateNotifications.mock.calls[0][0]
      expect(callArg).toHaveLength(2)
      expect(callArg[0].template).toBe(NotificationTemplates.ORDER_PLACED)
      expect(callArg[1].template).toBe(NotificationTemplates.ADMIN_NEW_ORDER)
    })

    it("never throws if notificationService fails, preserving commerce transition authority", async () => {
      const mockFailingService = {
        createNotifications: jest
          .fn()
          .mockRejectedValue(new Error("SMTP provider connection timeout")),
      }

      const result = await executeSendOrderNotifications({
        order: mockOrder,
        adminEmail: "admin@retail-starter.internal",
        notificationService: mockFailingService as any,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("SMTP provider connection timeout")
    })
  })
})
