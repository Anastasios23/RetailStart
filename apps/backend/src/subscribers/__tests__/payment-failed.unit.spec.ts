import paymentFailedHandler, { config } from "../payment-failed"
import { sendPaymentFailedNotificationWorkflow } from "../../workflows/notifications/send-payment-failed-notification"

jest.mock("../../workflows/notifications/send-payment-failed-notification", () => ({
  sendPaymentFailedNotificationWorkflow: jest.fn(),
}))

describe("payment-failed subscriber", () => {
  it("subscribes to payment failed events", () => {
    expect(config.event).toContain("payment.payment_failed")
    expect(config.event).toContain("payment_session.failed")
  })

  it("invokes sendPaymentFailedNotificationWorkflow with event data", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: { success: true } })
    ;(sendPaymentFailedNotificationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: mockRun,
    })

    const mockContainer = {
      resolve: jest.fn(),
    }

    await paymentFailedHandler({
      event: {
        name: "payment.payment_failed",
        data: {
          cart_id: "cart_abc",
          payment_id: "pi_123",
          email: "buyer@example.com",
          error_message: "Card expired",
        },
      },
      container: mockContainer as any,
    } as any)

    expect(sendPaymentFailedNotificationWorkflow).toHaveBeenCalledWith(mockContainer)
    expect(mockRun).toHaveBeenCalledWith({
      input: {
        cartId: "cart_abc",
        orderId: undefined,
        paymentId: "pi_123",
        email: "buyer@example.com",
        errorMessage: "Card expired",
      },
    })
  })

  it("handles subscriber error gracefully without throwing", async () => {
    const mockRun = jest
      .fn()
      .mockRejectedValue(new Error("Downstream subscriber failed"))
    ;(sendPaymentFailedNotificationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: mockRun,
    })

    const mockContainer = {
      resolve: jest.fn(),
    }

    await expect(
      paymentFailedHandler({
        event: {
          name: "payment.payment_failed",
          data: {
            cart_id: "cart_abc",
            email: "buyer@example.com",
          },
        },
        container: mockContainer as any,
      } as any)
    ).resolves.not.toThrow()
  })
})
