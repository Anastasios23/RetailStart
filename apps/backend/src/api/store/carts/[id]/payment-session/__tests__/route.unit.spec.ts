import type { MedusaResponse } from "@medusajs/framework/http"

import { ensureCartPaymentSessionWorkflow } from "../../../../../../workflows/ensure-cart-payment-session"
import { POST } from "../route"

jest.mock("../../../../../../workflows/ensure-cart-payment-session", () => ({
  ensureCartPaymentSessionWorkflow: jest.fn(),
}))

describe("POST /store/carts/:id/payment-session", () => {
  it("rejects an already-completed cart before preparing a payment session", async () => {
    const remoteQuery = jest.fn().mockResolvedValueOnce([
      {
        id: "cart_test",
        sales_channel_id: "sc_test",
        completed_at: new Date(),
      },
    ])
    const req = {
      params: { id: "cart_test" },
      body: { provider_id: "pp_stripe_stripe" },
      publishable_key_context: { sales_channel_ids: ["sc_test"] },
      scope: { resolve: () => remoteQuery },
    } as unknown as Parameters<typeof POST>[0]
    const res = {} as MedusaResponse

    await expect(POST(req, res)).rejects.toMatchObject({ type: "not_found" })
    expect(remoteQuery).toHaveBeenCalledTimes(1)
    expect(ensureCartPaymentSessionWorkflow).not.toHaveBeenCalled()
  })
})
