import {
  acquireLockStep,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  refreshPaymentCollectionForCartWorkflow,
  releaseLockStep,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  createStep,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"

import {
  buildPaymentSessionInput,
  classifyCartPaymentSession,
  shouldRefreshPaymentCollection,
  STRIPE_PAYMENT_PROVIDER_ID,
  type CartPaymentDecision,
  type CartPaymentSnapshot,
} from "./ensure-cart-payment-session-state"

const CART_PAYMENT_FIELDS = [
  "id",
  "sales_channel_id",
  "currency_code",
  "total",
  "raw_total",
  "payment_collection.id",
  "payment_collection.status",
  "payment_collection.amount",
  "payment_collection.currency_code",
  "payment_collection.payment_sessions.id",
  "payment_collection.payment_sessions.provider_id",
  "payment_collection.payment_sessions.status",
  "payment_collection.payment_sessions.amount",
  "payment_collection.payment_sessions.currency_code",
  "payment_collection.payment_sessions.data",
]

export type EnsureCartPaymentSessionInput = {
  cart_id: string
  provider_id?: string
}

export type EnsureCartPayment = {
  paymentCollectionId: string
  paymentCollectionStatus: string
  paymentSessionId: string
  providerId: string
  sessionStatus: string
  amount: number
  currencyCode: string
  clientSecret?: string
}

export type EnsureCartPaymentSessionResult = {
  state: "ready" | "reconcile" | "failed"
  issue?:
    | "authorized"
    | "captured"
    | "pending_authorization"
    | "error"
  payment: EnsureCartPayment | null
}

const projectPayment = (
  cart: CartPaymentSnapshot,
  providerId: string
): EnsureCartPayment | null => {
  const collection = cart.payment_collection
  const session = collection?.payment_sessions
    ?.filter((candidate) => candidate.provider_id === providerId)
    .at(-1)

  if (!collection || !session) {
    return null
  }

  const amount = Number(session.amount)

  if (!Number.isFinite(amount)) {
    return null
  }

  const clientSecret =
    typeof session.data?.client_secret === "string"
      ? session.data.client_secret
      : undefined

  return {
    paymentCollectionId: collection.id,
    paymentCollectionStatus: collection.status,
    paymentSessionId: session.id,
    providerId: session.provider_id,
    sessionStatus: session.status,
    amount,
    currencyCode: session.currency_code,
    ...(clientSecret ? { clientSecret } : {}),
  }
}

const buildResult = (
  cart: CartPaymentSnapshot,
  decision: CartPaymentDecision,
  providerId: string
): EnsureCartPaymentSessionResult => {
  const payment = projectPayment(cart, providerId)

  if (decision.kind === "reuse") {
    return payment?.clientSecret
      ? { state: "ready", payment }
      : { state: "failed", issue: "error", payment: null }
  }

  if (decision.kind === "reconcile") {
    return { state: "reconcile", issue: decision.status, payment }
  }

  if (decision.kind === "failed") {
    return { state: "failed", issue: "error", payment }
  }

  return { state: "failed", issue: "error", payment: null }
}

const requirePaymentCollectionStep = createStep(
  "require-payment-collection",
  ({ cart, providerId }: { cart: CartPaymentSnapshot; providerId: string }) => {
    return new StepResponse(buildPaymentSessionInput(cart, providerId))
  }
)

const createLockOwnerIdStep = createStep(
  "create-lock-owner-id",
  () => new StepResponse(randomUUID())
)

export const ensureCartPaymentSessionWorkflow = createWorkflow(
  "ensure-cart-payment-session",
  (input: EnsureCartPaymentSessionInput) => {
    // The parent workflow owns the cart lock. Nested core workflows skip their
    // own lock steps when run as a subworkflow, avoiding a self-deadlock.
    const lockOwnerId = createLockOwnerIdStep()

    acquireLockStep({
      key: input.cart_id,
      timeout: 30,
      ttl: 120,
      ownerId: lockOwnerId,
    })

    const providerId = transform({ input }, ({ input }) =>
      input.provider_id ?? STRIPE_PAYMENT_PROVIDER_ID
    )

    const cartBeforeCollection = useRemoteQueryStep({
      entry_point: "cart",
      fields: CART_PAYMENT_FIELDS,
      variables: { id: input.cart_id },
      throw_if_key_not_found: true,
      list: false,
    }).config({ name: "ensure-payment-session-read-cart-before-collection" })

    const shouldCreateCollection = transform(
      { cartBeforeCollection },
      ({ cartBeforeCollection }) => !cartBeforeCollection.payment_collection?.id
    )

    const collectionCreated = when(
      "ensure-payment-session-create-collection-if-missing",
      { shouldCreateCollection },
      ({ shouldCreateCollection }) => shouldCreateCollection
    ).then(() => {
      return createPaymentCollectionForCartWorkflow.runAsStep({
        input: { cart_id: input.cart_id },
      })
    })

    const shouldRefreshCollection = transform(
      { cartBeforeCollection },
      ({ cartBeforeCollection }) =>
        shouldRefreshPaymentCollection(
          cartBeforeCollection as CartPaymentSnapshot
        )
    )

    const collectionRefreshed = when(
      "ensure-payment-session-refresh-collection-if-stale",
      { shouldRefreshCollection },
      ({ shouldRefreshCollection }) => shouldRefreshCollection
    ).then(() => {
      return refreshPaymentCollectionForCartWorkflow.runAsStep({
        input: { cart_id: input.cart_id },
      })
    })

    const cartAfterCollectionVariables = transform(
      { collectionCreated, collectionRefreshed },
      () => ({ id: input.cart_id })
    )

    const cartAfterCollection = useRemoteQueryStep({
      entry_point: "cart",
      fields: CART_PAYMENT_FIELDS,
      variables: cartAfterCollectionVariables,
      throw_if_key_not_found: true,
      list: false,
    }).config({ name: "ensure-payment-session-read-cart-after-collection" })

    const decisionBeforeSession = transform(
      { cartAfterCollection, providerId },
      ({ cartAfterCollection, providerId }) =>
        classifyCartPaymentSession(
          cartAfterCollection as CartPaymentSnapshot,
          providerId
        )
    )

    const paymentSessionInput = requirePaymentCollectionStep({
      cart: cartAfterCollection as CartPaymentSnapshot,
      providerId,
    })

    const sessionCreated = when(
      "ensure-payment-session-create-session-if-needed",
      { decisionBeforeSession },
      ({ decisionBeforeSession }) => decisionBeforeSession.kind === "initialize"
    ).then(() => {
      return createPaymentSessionsWorkflow.runAsStep({ input: paymentSessionInput })
    })

    const cartAfterSessionVariables = transform(
      { sessionCreated },
      () => ({ id: input.cart_id })
    )

    const cartAfterSession = useRemoteQueryStep({
      entry_point: "cart",
      fields: CART_PAYMENT_FIELDS,
      variables: cartAfterSessionVariables,
      throw_if_key_not_found: true,
      list: false,
    }).config({ name: "ensure-payment-session-read-cart-after-session" })

    const finalDecision = transform(
      { cartAfterSession, providerId },
      ({ cartAfterSession, providerId }) =>
        classifyCartPaymentSession(
          cartAfterSession as CartPaymentSnapshot,
          providerId
        )
    )

    const result = transform(
      { cartAfterSession, finalDecision, providerId },
      ({ cartAfterSession, finalDecision, providerId }) =>
        buildResult(
          cartAfterSession as CartPaymentSnapshot,
          finalDecision,
          providerId
        )
    )

    releaseLockStep({ key: input.cart_id, ownerId: lockOwnerId })

    return new WorkflowResponse(result)
  }
)

export default ensureCartPaymentSessionWorkflow
