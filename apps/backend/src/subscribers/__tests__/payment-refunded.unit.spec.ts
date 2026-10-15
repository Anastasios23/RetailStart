import paymentRefundedHandler, {
  handlePaymentRefundedEvent,
} from "../payment-refunded"
import { NotificationTemplates } from "../../modules/notifications"

describe("payment-refunded subscriber (ADR-0129)", () => {
  const mockOrder = {
    id: "order_sub_123",
    display_id: 1042,
    email: "customer@example.com",
    currency_code: "eur",
  }

  const mockPayment = {
    id: "pay_sub_123",
    order_id: "order_sub_123",
    currency_code: "eur",
    refunds: [
      {
        id: "ref_sub_999",
        amount: 2500,
        note: "Damaged item returned",
      },
    ],
  }

  it("builds and sends refund notification with deterministic idempotency key", async () => {
    const mockCreateNotifications = jest.fn().mockResolvedValue([{ id: "notif_sub_1" }])
    const mockNotificationService = {
      createNotifications: mockCreateNotifications,
    }
    const mockPaymentService = {
      retrievePayment: jest.fn().mockResolvedValue(mockPayment),
    }
    const mockOrderService = {
      retrieveOrder: jest.fn().mockResolvedValue(mockOrder),
    }

    const result = await handlePaymentRefundedEvent({
      data: {
        id: "pay_sub_123",
        refund_id: "ref_sub_999",
      },
      paymentService: mockPaymentService as any,
      orderService: mockOrderService as any,
      notificationService: mockNotificationService as any,
    })

    expect(result.success).toBe(true)
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1)
    const callArg = mockCreateNotifications.mock.calls[0][0]
    expect(callArg[0].template).toBe(NotificationTemplates.REFUND_CONFIRMATION)
    expect(callArg[0].to).toBe("customer@example.com")
    expect(callArg[0].idempotency_key).toBe(
      "notif_refund-confirmation_order_sub_123_ref_sub_999"
    )
    expect(callArg[0].data.amount).toBe(2500)
    expect(callArg[0].data.orderId).toBe("order_sub_123")
  })

  it("handles payment without associated email gracefully without throwing", async () => {
    const mockCreateNotifications = jest.fn()
    const mockNotificationService = {
      createNotifications: mockCreateNotifications,
    }
    const mockPaymentService = {
      retrievePayment: jest.fn().mockResolvedValue(mockPayment),
    }
    const mockOrderService = {
      retrieveOrder: jest.fn().mockResolvedValue({ ...mockOrder, email: null }),
    }

    const result = await handlePaymentRefundedEvent({
      data: {
        id: "pay_sub_123",
      },
      paymentService: mockPaymentService as any,
      orderService: mockOrderService as any,
      notificationService: mockNotificationService as any,
    })

    expect(result.success).toBe(true)
    expect(mockCreateNotifications).not.toHaveBeenCalled()
  })

  it("catches and logs errors without bubbling to event emitter", async () => {
    const mockFailingPaymentService = {
      retrievePayment: jest.fn().mockRejectedValue(new Error("Database connection dropped")),
    }

    const result = await handlePaymentRefundedEvent({
      data: {
        id: "pay_sub_123",
      },
      paymentService: mockFailingPaymentService as any,
      orderService: jest.fn() as any,
      notificationService: jest.fn() as any,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Database connection dropped")
  })
})
