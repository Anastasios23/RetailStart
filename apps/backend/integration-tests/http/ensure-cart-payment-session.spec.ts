import {
  createApiKeysWorkflow,
  createCartWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

jest.setTimeout(180_000)

const { medusaIntegrationTestRunner } = require("@medusajs/test-utils") as typeof import("@medusajs/test-utils")

medusaIntegrationTestRunner({
  moduleName: "ensure-cart-payment-session",
  testSuite: ({ api, dbConnection, getContainer }) => {
    const providerId = "pp_stripe_stripe"
    let publishableKey: string
    let scopedSalesChannelId: string
    let outOfScopeSalesChannelId: string
    let regionId: string

    const requestConfig = () => ({
      headers: {
        "x-publishable-api-key": publishableKey,
      },
    })

    const createCart = async (unitPrice: number, salesChannelId = scopedSalesChannelId) => {
      const { result } = await createCartWorkflow(getContainer()).run({
        input: {
          region_id: regionId,
          sales_channel_id: salesChannelId,
          currency_code: "eur",
          items: [
            {
              title: "Locking test item",
              quantity: 1,
              unit_price: unitPrice,
              is_discountable: false,
              requires_shipping: false,
            },
          ],
        },
      })

      return result.id
    }

    const postEnsure = (cartId: string) =>
      api.post(
        `/store/carts/${cartId}/payment-session`,
        { provider_id: providerId },
        requestConfig()
      )

    beforeAll(async () => {
      const container = getContainer()
      const { result: salesChannels } = await createSalesChannelsWorkflow(
        container
      ).run({
        input: {
          salesChannelsData: [
            { name: "Payment-session scoped channel" },
            { name: "Payment-session out-of-scope channel" },
          ],
        },
      })
      scopedSalesChannelId = salesChannels[0].id
      outOfScopeSalesChannelId = salesChannels[1].id

      const { result: regions } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Payment-session test region",
              currency_code: "eur",
              countries: ["cy"],
              payment_providers: [providerId],
            },
          ],
        },
      })
      regionId = regions[0].id

      const { result: apiKeys } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              type: "publishable",
              title: "Payment-session integration test key",
              created_by: "integration-test",
            },
          ],
        },
      })
      publishableKey = apiKeys[0].token

      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: apiKeys[0].id,
          add: [scopedSalesChannelId],
        },
      })
    })

    it("requires a publishable key", async () => {
      const cartId = await createCart(1000)

      await expect(
        api.post(`/store/carts/${cartId}/payment-session`, {
          provider_id: providerId,
        })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it("rejects a cart outside the publishable key sales-channel scope", async () => {
      const cartId = await createCart(1000, outOfScopeSalesChannelId)

      await expect(postEnsure(cartId)).rejects.toMatchObject({
        response: { status: 404 },
      })
    })

    it("returns the existing reusable session on a repeat request", async () => {
      const cartId = await createCart(1000)
      const first = await postEnsure(cartId)
      const second = await postEnsure(cartId)

      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(second.data).toEqual(first.data)
      expect(second.data.state).toBe("ready")
      expect(second.data.payment.providerId).toBe(providerId)
    })

    it("serializes two concurrent preparations to one collection and session", async () => {
      const cartId = await createCart(1000)
      const [first, second] = await Promise.all([
        postEnsure(cartId),
        postEnsure(cartId),
      ])

      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(first.data).toEqual(second.data)

      const cart = await dbConnection.raw(
        `select pc.id as payment_collection_id, count(ps.id)::int as session_count
         from cart_payment_collection cpc
         join payment_collection pc on pc.id = cpc.payment_collection_id
         left join payment_session ps on ps.payment_collection_id = pc.id
         where cpc.cart_id = ?
         group by pc.id`,
        [cartId]
      )

      expect(cart.rows).toHaveLength(1)
      expect(cart.rows[0].session_count).toBe(1)
    })

    it("cleans up the lock after a provider preparation failure", async () => {
      const cartId = await createCart(0)

      await expect(postEnsure(cartId)).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })

      const locks = await dbConnection.raw(
        "select count(*)::int as count from locking where id = ?",
        [cartId]
      )

      expect(locks.rows[0].count).toBe(0)
    })
  },
})
