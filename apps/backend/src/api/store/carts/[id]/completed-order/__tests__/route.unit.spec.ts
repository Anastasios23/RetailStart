import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { GET } from "../route"

function requestForCart(
  remoteQuery: jest.Mock,
  salesChannelIds = ["sc_test"]
) {
  return {
    params: { id: "cart_test" },
    publishable_key_context: { sales_channel_ids: salesChannelIds },
    scope: { resolve: () => remoteQuery },
  } as unknown as MedusaStoreRequest
}

function responseRecorder() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
  return response as unknown as MedusaResponse & typeof response
}

describe("GET /store/carts/:id/completed-order", () => {
  it("returns only the order confirmation projection for its completed scoped cart", async () => {
    const remoteQuery = jest
      .fn()
      .mockResolvedValueOnce([{ id: "cart_test", sales_channel_id: "sc_test", completed_at: new Date() }])
      .mockResolvedValueOnce([{ cart_id: "cart_test", order_id: "order_test" }])
      .mockResolvedValueOnce([
        {
          id: "order_test",
          display_id: 42,
          custom_display_id: "retail-42",
          currency_code: "eur",
          email: "private@example.test",
          summary: { current_order_total: 3000 },
        },
      ])
    const response = responseRecorder()

    await GET(requestForCart(remoteQuery), response)

    expect(remoteQuery).toHaveBeenCalledTimes(3)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith({
      confirmation: {
        display_id: 42,
        custom_display_id: "retail-42",
        currency_code: "eur",
        summary: { current_order_total: 3000 },
      },
    })
    expect(JSON.stringify(response.json.mock.calls[0])).not.toContain("private@example.test")
  })

  it("does not look up an order for an incomplete cart", async () => {
    const remoteQuery = jest.fn().mockResolvedValueOnce([
      { id: "cart_test", sales_channel_id: "sc_test", completed_at: null },
    ])
    const response = responseRecorder()

    await expect(GET(requestForCart(remoteQuery), response)).rejects.toMatchObject({
      type: "not_found",
    })
    expect(remoteQuery).toHaveBeenCalledTimes(1)
    expect(response.json).not.toHaveBeenCalled()
  })

  it("does not return an order outside the publishable key sales channel", async () => {
    const remoteQuery = jest.fn().mockResolvedValueOnce([
      { id: "cart_test", sales_channel_id: "other_channel", completed_at: new Date() },
    ])

    await expect(
      GET(requestForCart(remoteQuery, ["sc_test"]), responseRecorder())
    ).rejects.toMatchObject({ type: "not_found" })
    expect(remoteQuery).toHaveBeenCalledTimes(1)
  })
})
