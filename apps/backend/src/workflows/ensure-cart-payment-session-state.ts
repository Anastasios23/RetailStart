import { MedusaError } from "@medusajs/framework/utils"

export const STRIPE_PAYMENT_PROVIDER_ID = "pp_stripe_stripe"

export type PaymentSessionSnapshot = {
  id: string
  provider_id: string
  status: string
  amount: number | string
  currency_code: string
  data?: Record<string, unknown> | null
}

export type PaymentCollectionSnapshot = {
  id: string
  status: string
  amount: number | string
  currency_code: string
  payment_sessions?: PaymentSessionSnapshot[] | null
}

export type CartPaymentSnapshot = {
  id: string
  currency_code: string
  total: number | string
  payment_collection?: PaymentCollectionSnapshot | null
}

export type CartPaymentDecision =
  | { kind: "reuse"; sessionId: string }
  | {
      kind: "initialize"
      reason:
        | "missing_collection"
        | "missing_session"
        | "missing_client_secret"
        | "canceled"
        | "stale"
        | "unsupported_status"
    }
  | {
      kind: "reconcile"
      status: "authorized" | "captured" | "pending_authorization"
      sessionId: string
    }
  | { kind: "failed"; status: "error"; sessionId: string }

const numericAmount = (value: number | string | undefined) => {
  if (value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const hasClientSecret = (session: PaymentSessionSnapshot) =>
  typeof session.data?.client_secret === "string" &&
  session.data.client_secret.length > 0

const isCurrentAmountAndCurrency = (
  cart: CartPaymentSnapshot,
  collection: PaymentCollectionSnapshot,
  session: PaymentSessionSnapshot
) => {
  const cartAmount = numericAmount(cart.total)
  const collectionAmount = numericAmount(collection.amount)
  const sessionAmount = numericAmount(session.amount)

  return (
    cartAmount !== null &&
    collectionAmount !== null &&
    sessionAmount !== null &&
    cartAmount === collectionAmount &&
    collectionAmount === sessionAmount &&
    cart.currency_code === collection.currency_code &&
    collection.currency_code === session.currency_code
  )
}

export const classifyCartPaymentSession = (
  cart: CartPaymentSnapshot,
  providerId: string = STRIPE_PAYMENT_PROVIDER_ID
): CartPaymentDecision => {
  const collection = cart.payment_collection

  if (!collection) {
    return { kind: "initialize", reason: "missing_collection" }
  }

  const sessions = (collection.payment_sessions ?? []).filter(
    (session) => session.provider_id === providerId
  )

  if (sessions.length === 0) {
    return { kind: "initialize", reason: "missing_session" }
  }

  const session = sessions[sessions.length - 1]

  if (
    (session.status === "pending" || session.status === "requires_more") &&
    isCurrentAmountAndCurrency(cart, collection, session)
  ) {
    if (hasClientSecret(session)) {
      return { kind: "reuse", sessionId: session.id }
    }

    return { kind: "initialize", reason: "missing_client_secret" }
  }

  if (
    session.status === "authorized" ||
    session.status === "captured" ||
    session.status === "pending_authorization"
  ) {
    return {
      kind: "reconcile",
      status: session.status,
      sessionId: session.id,
    }
  }

  if (session.status === "error") {
    return { kind: "failed", status: "error", sessionId: session.id }
  }

  if (session.status === "canceled") {
    return { kind: "initialize", reason: "canceled" }
  }

  if (session.status === "pending" || session.status === "requires_more") {
    return { kind: "initialize", reason: "stale" }
  }

  return { kind: "initialize", reason: "unsupported_status" }
}

export const shouldRefreshPaymentCollection = (
  cart: CartPaymentSnapshot
): boolean => {
  const collection = cart.payment_collection
  if (!collection?.id) {
    return false
  }

  const cartAmount = numericAmount(cart.total)
  const collectionAmount = numericAmount(collection.amount)

  if (cartAmount === null || collectionAmount === null) {
    return true
  }

  return (
    cartAmount !== collectionAmount ||
    cart.currency_code !== collection.currency_code
  )
}

export const buildPaymentSessionInput = (
  cart: CartPaymentSnapshot,
  providerId: string
) => {
  if (!cart.payment_collection?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Cart payment collection was not created"
    )
  }

  return {
    payment_collection_id: cart.payment_collection.id,
    provider_id: providerId,
    context: {
      idempotency_key: `cart_${cart.id}_${cart.payment_collection.id}_${cart.currency_code}_${cart.total}`,
    },
  }
}
