import orderPlacedHandler, { config } from "../order-placed"
import { sendOrderNotificationsWorkflow } from "../../workflows/notifications/send-order-notifications"

jest.mock("../../workflows/notifications/send-order-notifications", () => ({
  sendOrderNotificationsWorkflow: jest.fn(),
}))

describe("order-placed subscriber", () => {
  it("subscribes to 'order.placed' event", () => {
    expect(config.event).toBe("order.placed")
  })

  it("invokes sendOrderNotificationsWorkflow with event order ID", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: { success: true } })
    ;(sendOrderNotificationsWorkflow as unknown as jest.Mock).mockReturnValue({
      run: mockRun,
    })

    const mockContainer = {
      resolve: jest.fn(),
    }

    await orderPlacedHandler({
      event: {
        name: "order.placed",
        data: { id: "order_123" },
      },
      container: mockContainer as any,
    } as any)

    expect(sendOrderNotificationsWorkflow).toHaveBeenCalledWith(mockContainer)
    expect(mockRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_123",
      },
    })
  })

  it("does not throw if workflow execution fails, preserving commerce transition", async () => {
    const mockRun = jest
      .fn()
      .mockRejectedValue(new Error("Workflow execution failed"))
    ;(sendOrderNotificationsWorkflow as unknown as jest.Mock).mockReturnValue({
      run: mockRun,
    })

    const mockContainer = {
      resolve: jest.fn(),
    }

    await expect(
      orderPlacedHandler({
        event: {
          name: "order.placed",
          data: { id: "order_123" },
        },
        container: mockContainer as any,
      } as any)
    ).resolves.not.toThrow()
  })
})
