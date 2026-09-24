import type { HttpTypes } from "@medusajs/types"

export const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

export type CheckoutPaymentState =
  | "ready"
  | "pending"
  | "requires_action"
  | "error"
  | "canceled"

export type CheckoutPaymentIssue =
  | "authorized"
  | "captured"
  | "pending_authorization"
  | "error"

export type CheckoutPaymentProjection = {
  paymentCollectionId: string
  paymentCollectionStatus: string
  paymentSessionId: string
  providerId: typeof STRIPE_PROVIDER_ID
  sessionStatus: string
  clientSecret: string
}

export type CheckoutConfirmation = {
  displayId?: number
  customDisplayId?: string
  total: number
  currencyCode: string
}

export function isSuccessfulAutomaticPayment(
  error: unknown,
  paymentIntentId: string | undefined,
  paymentIntentStatus: string | undefined
): boolean {
  return !error && Boolean(paymentIntentId) && paymentIntentStatus === "succeeded"
}

export function isRecoverablePaymentFailure(
  errorType: string | undefined,
  paymentIntentStatus: string | undefined
): boolean {
  return (
    errorType === "validation_error" ||
    paymentIntentStatus === "requires_payment_method"
  )
}

export function lockPaymentAttempt(lock: { current: boolean }): boolean {
  if (lock.current) {
    return false
  }

  lock.current = true
  return true
}

export function unlockPaymentAttempt(lock: { current: boolean }): void {
  lock.current = false
}

export type StripePaymentSessionInitializationReason =
  | "missing_collection"
  | "missing_session"
  | "canceled"
  | "stale"
  | "unsupported_status"

export type StripePaymentSessionDecision =
  | {
      kind: "reuse"
      session: HttpTypes.StorePaymentSession
    }
  | {
      kind: "initialize"
      reason: StripePaymentSessionInitializationReason
    }
  | {
      kind: "reconcile"
      status: "authorized" | "captured" | "pending_authorization"
      session: HttpTypes.StorePaymentSession
    }
  | {
      kind: "failed"
      status: "error"
      session: HttpTypes.StorePaymentSession
    }

function readStringProperty(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined
  }

  const property = (value as Record<string, unknown>)[key]
  return typeof property === "string" && property.trim() ? property : undefined
}

function normalizeCurrencyCode(currencyCode: string): string {
  return currencyCode.trim().toLowerCase()
}

function findStripePaymentSession(
  cart: HttpTypes.StoreCart
): HttpTypes.StorePaymentSession | undefined {
  return cart.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === STRIPE_PROVIDER_ID
  )
}

/**
 * Returns a current Stripe session only when its authoritative Medusa fields
 * still match the cart payment collection and it has client-safe data for the
 * Payment Element.
 */
export function getReusableStripePaymentSession(
  cart: HttpTypes.StoreCart
): HttpTypes.StorePaymentSession | null {
  const collection = cart.payment_collection
  const session = findStripePaymentSession(cart)

  if (!collection || !session) {
    return null
  }

  if (
    session.payment_collection &&
    session.payment_collection.id !== collection.id
  ) {
    return null
  }

  if (
    session.status !== "pending" &&
    session.status !== "requires_more"
  ) {
    return null
  }

  if (
    !Number.isFinite(collection.amount) ||
    !Number.isFinite(session.amount) ||
    session.amount !== collection.amount
  ) {
    return null
  }

  const collectionCurrency = normalizeCurrencyCode(collection.currency_code)
  const cartCurrency = normalizeCurrencyCode(cart.currency_code)
  const sessionCurrency = normalizeCurrencyCode(session.currency_code)

  if (
    !collectionCurrency ||
    !cartCurrency ||
    !sessionCurrency ||
    collectionCurrency !== cartCurrency ||
    sessionCurrency !== collectionCurrency
  ) {
    return null
  }

  if (!readStringProperty(session.data, "client_secret")) {
    return null
  }

  return session
}

export function classifyStripePaymentSession(
  cart: HttpTypes.StoreCart
): StripePaymentSessionDecision {
  const reusableSession = getReusableStripePaymentSession(cart)

  if (reusableSession) {
    return { kind: "reuse", session: reusableSession }
  }

  const collection = cart.payment_collection

  if (!collection) {
    return { kind: "initialize", reason: "missing_collection" }
  }

  const session = findStripePaymentSession(cart)

  if (!session) {
    return { kind: "initialize", reason: "missing_session" }
  }

  switch (session.status) {
    case "canceled":
      return { kind: "initialize", reason: "canceled" }
    case "error":
      return { kind: "failed", status: "error", session }
    case "authorized":
    case "captured":
    case "pending_authorization":
      return { kind: "reconcile", status: session.status, session }
    case "pending":
    case "requires_more":
      return { kind: "initialize", reason: "stale" }
    default:
      return { kind: "initialize", reason: "unsupported_status" }
  }
}

export function mapPaymentSessionState(status: string): CheckoutPaymentState {
  switch (status) {
    case "requires_more":
      return "requires_action"
    case "error":
      return "error"
    case "canceled":
      return "canceled"
    case "authorized":
    case "captured":
      return "ready"
    case "pending":
    case "pending_authorization":
    default:
      return "pending"
  }
}

export function projectStripePaymentSession(
  collection: Pick<HttpTypes.StorePaymentCollection, "id" | "status">,
  session: Pick<HttpTypes.StorePaymentSession, "id" | "provider_id" | "status" | "data">
): CheckoutPaymentProjection {
  if (session.provider_id !== STRIPE_PROVIDER_ID) {
    throw new Error("Unexpected checkout payment provider")
  }

  const clientSecret = readStringProperty(session.data, "client_secret")

  if (!clientSecret) {
    throw new Error("Stripe payment session has no client secret")
  }

  return {
    paymentCollectionId: collection.id,
    paymentCollectionStatus: collection.status,
    paymentSessionId: session.id,
    providerId: STRIPE_PROVIDER_ID,
    sessionStatus: session.status,
    clientSecret,
  }
}

export function isCompletedCartResult(
  result: HttpTypes.StoreCompleteCartResponse
): result is Extract<HttpTypes.StoreCompleteCartResponse, { type: "order" }> {
  return result.type === "order"
}

export function projectCheckoutConfirmation(
  order: Pick<
    HttpTypes.StoreOrder,
    "currency_code" | "display_id" | "custom_display_id" | "summary"
  >
): CheckoutConfirmation {
  const total = order.summary.current_order_total

  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    !order.currency_code.trim()
  ) {
    throw new Error("Completed order has no safe confirmation total")
  }

  return {
    displayId: order.display_id,
    customDisplayId: order.custom_display_id,
    total,
    currencyCode: order.currency_code,
  }
}

export function canClearCartForResult(
  result: HttpTypes.StoreCompleteCartResponse
): result is Extract<HttpTypes.StoreCompleteCartResponse, { type: "order" }> {
  return isCompletedCartResult(result)
}
