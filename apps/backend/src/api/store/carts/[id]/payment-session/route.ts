import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

import {
  ensureCartPaymentSessionWorkflow,
  type EnsureCartPaymentSessionResult,
} from "../../../../../workflows/ensure-cart-payment-session"
import { STRIPE_PAYMENT_PROVIDER_ID } from "../../../../../workflows/ensure-cart-payment-session-state"

type EnsureCartPaymentSessionBody = {
  provider_id?: unknown
}

const validateBody = (body: unknown) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Payment-session preparation accepts only provider_id"
    )
  }

  const candidate = body as EnsureCartPaymentSessionBody
  const keys = Object.keys(candidate)

  if (keys.some((key) => key !== "provider_id")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Payment-session preparation accepts only provider_id"
    )
  }

  if (
    candidate.provider_id !== undefined &&
    candidate.provider_id !== STRIPE_PAYMENT_PROVIDER_ID
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported payment provider: ${String(candidate.provider_id)}`
    )
  }

  return candidate.provider_id ?? STRIPE_PAYMENT_PROVIDER_ID
}

export const POST = async (
  req: MedusaStoreRequest<EnsureCartPaymentSessionBody>,
  res: MedusaResponse<EnsureCartPaymentSessionResult>
) => {
  const providerId = validateBody(req.body)
  const salesChannelIds = req.publishable_key_context.sales_channel_ids ?? []
  const remoteQuery = req.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )
  const [cart] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { id: req.params.id },
      fields: ["id", "sales_channel_id", "completed_at"],
    })
  )

  if (
    !cart ||
    !cart.sales_channel_id ||
    !salesChannelIds.includes(cart.sales_channel_id) ||
    cart.completed_at
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Cart not found"
    )
  }

  const { result } = await ensureCartPaymentSessionWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      provider_id: providerId,
    },
  })

  res.status(200).json(result)
}
