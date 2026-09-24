import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

type CompletedOrderResponse = {
  confirmation: {
    display_id?: number
    custom_display_id?: string
    currency_code: string
    summary: { current_order_total: number }
  }
}

export const GET = async (
  req: MedusaStoreRequest,
  res: MedusaResponse<CompletedOrderResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const [cart] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { id: req.params.id },
      fields: ["id", "sales_channel_id", "completed_at"],
    })
  )
  const salesChannelIds = req.publishable_key_context.sales_channel_ids ?? []

  if (
    !cart ||
    !cart.sales_channel_id ||
    !salesChannelIds.includes(cart.sales_channel_id) ||
    !cart.completed_at
  ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Completed order not found")
  }

  const [orderCart] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "order_cart",
      variables: { filters: { cart_id: req.params.id } },
      fields: ["cart_id", "order_id"],
    })
  )

  if (!orderCart?.order_id || orderCart.cart_id !== req.params.id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Completed order not found")
  }

  const [order] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "order",
      variables: { id: orderCart.order_id },
      fields: [
        "id",
        "display_id",
        "custom_display_id",
        "currency_code",
        "summary.current_order_total",
      ],
    })
  )

  if (!order || order.id !== orderCart.order_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Completed order not found")
  }

  res.status(200).json({
    confirmation: {
      display_id: order.display_id,
      custom_display_id: order.custom_display_id,
      currency_code: order.currency_code,
      summary: { current_order_total: order.summary?.current_order_total },
    },
  })
}
