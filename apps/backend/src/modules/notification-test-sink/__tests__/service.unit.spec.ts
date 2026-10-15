import { TestSinkNotificationProviderService } from "../service"

describe("TestSinkNotificationProviderService", () => {
  let service: TestSinkNotificationProviderService

  beforeEach(() => {
    service = new TestSinkNotificationProviderService()
    service.clearSentNotifications()
    service.clearSimulatedFailure()
  })

  it("has correct static identifier", () => {
    expect(TestSinkNotificationProviderService.identifier).toBe("notification-test-sink")
  })

  it("records sent notifications in memory", async () => {
    const payload = {
      to: "customer@example.com",
      channel: "email",
      template: "order-placed",
      data: {
        orderId: "order_123",
        displayId: 42,
        total: 3500,
        currencyCode: "eur",
      },
    }

    const result = await service.send(payload)

    expect(result).toHaveProperty("id")
    expect(typeof result.id).toBe("string")

    const recorded = service.getSentNotifications()
    expect(recorded).toHaveLength(1)
    expect(recorded[0].to).toBe("customer@example.com")
    expect(recorded[0].template).toBe("order-placed")
    expect(recorded[0].data).toEqual(payload.data)
  })

  it("clears recorded notifications", async () => {
    await service.send({
      to: "test@example.com",
      channel: "email",
      template: "test",
      data: {},
    })

    expect(service.getSentNotifications()).toHaveLength(1)
    service.clearSentNotifications()
    expect(service.getSentNotifications()).toHaveLength(0)
  })

  it("simulates provider failure when configured", async () => {
    service.setSimulatedFailure(new Error("SMTP connection timed out"))

    await expect(
      service.send({
        to: "customer@example.com",
        channel: "email",
        template: "order-placed",
        data: {},
      })
    ).rejects.toThrow("SMTP connection timed out")
  })
})
