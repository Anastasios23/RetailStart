import assert from "node:assert/strict"
import test from "node:test"
import { createKeyedPromiseCache } from "../../app/components/stripe-promise-cache.ts"

import {
  canClearCartForResult,
  classifyStripePaymentSession,
  getReusableStripePaymentSession,
  isSuccessfulAutomaticPayment,
  isRecoverablePaymentFailure,
  lockPaymentAttempt,
  unlockPaymentAttempt,
  mapPaymentSessionState,
  projectCheckoutConfirmation,
  projectStripePaymentSession,
  STRIPE_PROVIDER_ID,
} from "./checkout-payment.ts"

const collection = {
  id: "paycol_test",
  status: "not_paid",
}

test("automatic-capture checkout completes only for a succeeded PaymentIntent", () => {
  assert.equal(isSuccessfulAutomaticPayment(undefined, "pi_test", "succeeded"), true)
  assert.equal(isSuccessfulAutomaticPayment(undefined, "pi_test", "processing"), false)
  assert.equal(isSuccessfulAutomaticPayment(undefined, "pi_test", "requires_capture"), false)
  assert.equal(isSuccessfulAutomaticPayment(undefined, "pi_test", "requires_payment_method"), false)
  assert.equal(isSuccessfulAutomaticPayment({ type: "card_error" }, "pi_test", "succeeded"), false)
  assert.equal(isSuccessfulAutomaticPayment(undefined, undefined, "succeeded"), false)
  assert.equal(isSuccessfulAutomaticPayment(undefined, "pi_test", undefined), false)
})

test("payment retry is allowed only after a validation error or a recoverable PaymentIntent state", () => {
  assert.equal(isRecoverablePaymentFailure("validation_error", undefined), true)
  assert.equal(isRecoverablePaymentFailure("card_error", "requires_payment_method"), true)
  assert.equal(isRecoverablePaymentFailure(undefined, "requires_payment_method"), true)
  assert.equal(isRecoverablePaymentFailure("api_connection_error", undefined), false)
  assert.equal(isRecoverablePaymentFailure("api_error", undefined), false)
  assert.equal(isRecoverablePaymentFailure(undefined, "processing"), false)
  assert.equal(isRecoverablePaymentFailure(undefined, "requires_action"), false)
  assert.equal(isRecoverablePaymentFailure(undefined, "succeeded"), false)
})

test("payment submission lock blocks concurrent attempts and releases for retry", () => {
  const lock = { current: false }

  assert.equal(lockPaymentAttempt(lock), true)
  assert.equal(lockPaymentAttempt(lock), false)

  unlockPaymentAttempt(lock)

  assert.equal(lockPaymentAttempt(lock), true)
})

test("Stripe promise cache reuses one load result for repeated renders with the same key", () => {
  let loadCount = 0
  const loadedStripe = Promise.resolve({ stripe: true })
  const getStripePromise = createKeyedPromiseCache(() => {
    loadCount += 1
    return loadedStripe
  })

  const firstRenderPromise = getStripePromise("pk_test_stable")
  const secondRenderPromise = getStripePromise("pk_test_stable")

  assert.strictEqual(secondRenderPromise, firstRenderPromise)
  assert.strictEqual(loadCount, 1)
})

function cartWithSession({
  amount = 3000,
  cartTotal = amount,
  currencyCode = "eur",
  sessionAmount = amount,
  sessionCurrencyCode = currencyCode,
  sessionStatus = "pending",
  clientSecret = "client-secret-placeholder",
  sessionCollectionId,
} = {}) {
  const paymentCollection = {
    id: "paycol_test",
    amount,
    currency_code: currencyCode,
    status: "not_paid",
    payment_providers: [{ id: STRIPE_PROVIDER_ID }],
    payment_sessions: [
      {
        id: "paysess_test",
        amount: sessionAmount,
        currency_code: sessionCurrencyCode,
        provider_id: STRIPE_PROVIDER_ID,
        status: sessionStatus,
        data: clientSecret ? { client_secret: clientSecret } : {},
        ...(sessionCollectionId
          ? { payment_collection: { id: sessionCollectionId } }
          : {}),
      },
    ],
  }

  return {
    id: "cart_test",
    currency_code: currencyCode,
    total: cartTotal,
    payment_collection: paymentCollection,
  }
}

test("pending matching Stripe session is reusable", () => {
  const cart = cartWithSession()
  const session = getReusableStripePaymentSession(cart)

  assert.equal(session?.id, "paysess_test")
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "reuse",
    session,
  })
})

test("requires_more matching Stripe session is reusable for continuation", () => {
  const cart = cartWithSession({ sessionStatus: "requires_more" })

  assert.equal(getReusableStripePaymentSession(cart)?.status, "requires_more")
  assert.equal(classifyStripePaymentSession(cart).kind, "reuse")
})

test("canceled Stripe session permits initialization", () => {
  const decision = classifyStripePaymentSession(cartWithSession({ sessionStatus: "canceled" }))

  assert.deepEqual(decision, { kind: "initialize", reason: "canceled" })
})

test("error Stripe session follows explicit failure handling", () => {
  const decision = classifyStripePaymentSession(cartWithSession({ sessionStatus: "error" }))

  assert.deepEqual(decision, {
    kind: "failed",
    status: "error",
    session: decision.session,
  })
})

test("authorized and captured sessions require reconciliation, not initialization", () => {
  for (const sessionStatus of ["authorized", "captured"]) {
    const decision = classifyStripePaymentSession(cartWithSession({ sessionStatus }))

    assert.equal(decision.kind, "reconcile")
    assert.equal(decision.status, sessionStatus)
  }
})

test("pending session with a mismatched amount is not reused", () => {
  const cart = cartWithSession({ sessionAmount: 2999 })

  assert.equal(getReusableStripePaymentSession(cart), null)
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "initialize",
    reason: "stale",
  })
})

test("pending session with matching collection and session amounts but stale cart total is not reused", () => {
  const cart = cartWithSession({ amount: 3000, cartTotal: 3500 })

  assert.equal(getReusableStripePaymentSession(cart), null)
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "initialize",
    reason: "stale",
  })
})

test("pending session with a mismatched currency is not reused", () => {
  const cart = cartWithSession({ sessionCurrencyCode: "usd" })

  assert.equal(getReusableStripePaymentSession(cart), null)
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "initialize",
    reason: "stale",
  })
})

test("a session expanded from another payment collection is not reused", () => {
  const cart = cartWithSession({ sessionCollectionId: "paycol_other" })

  assert.equal(getReusableStripePaymentSession(cart), null)
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "initialize",
    reason: "stale",
  })
})

test("missing Stripe session requires initialization", () => {
  const cart = cartWithSession()
  cart.payment_collection.payment_sessions = []

  assert.equal(getReusableStripePaymentSession(cart), null)
  assert.deepEqual(classifyStripePaymentSession(cart), {
    kind: "initialize",
    reason: "missing_session",
  })
})

test("repeated preparation inspection reuses the current session without initialization", () => {
  const cart = cartWithSession()

  assert.equal(classifyStripePaymentSession(cart).kind, "reuse")
  assert.equal(classifyStripePaymentSession(cart).kind, "reuse")
})

test("Stripe session projection exposes only client-safe checkout data", () => {
  const projection = projectStripePaymentSession(collection, {
    id: "paysess_test",
    provider_id: STRIPE_PROVIDER_ID,
    status: "pending",
    data: {
      client_secret: "client-secret-placeholder",
      id: "pi_private_reference",
      metadata: { session_id: "paysess_test" },
    },
  })

  assert.deepEqual(projection, {
    paymentCollectionId: "paycol_test",
    paymentCollectionStatus: "not_paid",
    paymentSessionId: "paysess_test",
    providerId: STRIPE_PROVIDER_ID,
    sessionStatus: "pending",
    clientSecret: "client-secret-placeholder",
  })
  assert.equal("pi_private_reference" in projection, false)
})

test("payment states map to safe customer-facing lifecycle categories", () => {
  assert.equal(mapPaymentSessionState("pending"), "pending")
  assert.equal(mapPaymentSessionState("pending_authorization"), "pending")
  assert.equal(mapPaymentSessionState("requires_more"), "requires_action")
  assert.equal(mapPaymentSessionState("error"), "error")
  assert.equal(mapPaymentSessionState("canceled"), "canceled")
  assert.equal(mapPaymentSessionState("captured"), "ready")
})

test("only an authoritative order completion permits cart-cookie clearing", () => {
  assert.equal(
    canClearCartForResult({
      type: "order",
      order: {},
    }),
    true
  )
  assert.equal(
    canClearCartForResult({
      type: "cart",
      cart: {},
      error: { message: "pending", name: "Error", type: "payment_pending" },
    }),
    false
  )
})

test("confirmation projection uses authoritative order summary and currency", () => {
  assert.deepEqual(
    projectCheckoutConfirmation({
      display_id: 42,
      custom_display_id: undefined,
      currency_code: "eur",
      summary: { current_order_total: 3595 },
    }),
    {
      displayId: 42,
      customDisplayId: undefined,
      total: 3595,
      currencyCode: "eur",
    }
  )
})
