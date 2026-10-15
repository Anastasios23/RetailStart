import assert from "node:assert/strict"
import test from "node:test"
import { createKeyedPromiseCache } from "../../app/components/stripe-promise-cache.ts"

import {
  canClearCartForResult,
  canFinalizePaidPaymentSession,
  classifyStripePaymentSession,
  getReusableStripePaymentSession,
  isReturnUrlCompletableSessionStatus,
  isSuccessfulAutomaticPayment,
  isRecoverablePaymentFailure,
  lockPaymentAttempt,
  unlockPaymentAttempt,
  mapPaymentSessionState,
  projectCheckoutConfirmation,
  projectStripePaymentSession,
  shouldAllowStripePaymentConfirmation,
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
  paymentSessions,
} = {}) {
  const defaultSession = {
    id: "paysess_test",
    amount: sessionAmount,
    currency_code: sessionCurrencyCode,
    provider_id: STRIPE_PROVIDER_ID,
    status: sessionStatus,
    data: clientSecret ? { client_secret: clientSecret } : {},
    ...(sessionCollectionId
      ? { payment_collection: { id: sessionCollectionId } }
      : {}),
  }
  const paymentCollection = {
    id: "paycol_test",
    amount,
    currency_code: currencyCode,
    status: "not_paid",
    payment_providers: [{ id: STRIPE_PROVIDER_ID }],
    payment_sessions: paymentSessions ?? [defaultSession],
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

test("matching authorized or captured session exposes a finalize-only path", () => {
  for (const sessionStatus of ["authorized", "captured"]) {
    const cart = cartWithSession({ sessionStatus })

    assert.equal(canFinalizePaidPaymentSession(cart), true)
  }
})

test("authorized or captured session with a stale amount cannot finalize", () => {
  for (const sessionStatus of ["authorized", "captured"]) {
    const cart = cartWithSession({ sessionStatus, sessionAmount: 2999 })

    assert.equal(classifyStripePaymentSession(cart).kind, "reconcile")
    assert.equal(canFinalizePaidPaymentSession(cart), false)
  }
})

test("authorized or captured session with a stale cart total cannot finalize", () => {
  const cart = cartWithSession({
    sessionStatus: "authorized",
    amount: 3000,
    cartTotal: 3500,
  })

  assert.equal(classifyStripePaymentSession(cart).kind, "reconcile")
  assert.equal(canFinalizePaidPaymentSession(cart), false)
})

test("authorized or captured session with a mismatched currency cannot finalize", () => {
  const cart = cartWithSession({
    sessionStatus: "captured",
    sessionCurrencyCode: "usd",
  })

  assert.equal(classifyStripePaymentSession(cart).kind, "reconcile")
  assert.equal(canFinalizePaidPaymentSession(cart), false)
})

test("pending_authorization stays a waiting state without finalize-only completion", () => {
  const cart = cartWithSession({ sessionStatus: "pending_authorization" })
  const decision = classifyStripePaymentSession(cart)

  assert.equal(decision.kind, "reconcile")
  assert.equal(decision.status, "pending_authorization")
  assert.equal(canFinalizePaidPaymentSession(cart), false)
})

test("return-URL completion may resume pending or requires_more sessions only", () => {
  assert.equal(isReturnUrlCompletableSessionStatus("pending"), true)
  assert.equal(isReturnUrlCompletableSessionStatus("requires_more"), true)
  assert.equal(isReturnUrlCompletableSessionStatus("authorized"), false)
  assert.equal(isReturnUrlCompletableSessionStatus("captured"), false)
  assert.equal(isReturnUrlCompletableSessionStatus("pending_authorization"), false)
  assert.equal(isReturnUrlCompletableSessionStatus("error"), false)
  assert.equal(isReturnUrlCompletableSessionStatus("canceled"), false)
})

test("completion error after successful Stripe payment blocks confirmPayment and blind cart.complete", () => {
  assert.equal(
    shouldAllowStripePaymentConfirmation({
      paymentAlreadySucceeded: false,
      needsAuthoritativeRefresh: false,
    }),
    true
  )
  assert.equal(
    shouldAllowStripePaymentConfirmation({
      paymentAlreadySucceeded: true,
      needsAuthoritativeRefresh: false,
    }),
    false
  )
  assert.equal(
    shouldAllowStripePaymentConfirmation({
      paymentAlreadySucceeded: true,
      needsAuthoritativeRefresh: true,
    }),
    false
  )
  assert.equal(
    shouldAllowStripePaymentConfirmation({
      paymentAlreadySucceeded: false,
      needsAuthoritativeRefresh: true,
    }),
    false
  )
})

test("recovery after completion failure requires refreshed authoritative paid session state", () => {
  const staleAuthorized = cartWithSession({
    sessionStatus: "authorized",
    sessionAmount: 2999,
  })
  const matchingAuthorized = cartWithSession({ sessionStatus: "authorized" })
  const refreshedPending = cartWithSession({ sessionStatus: "pending" })

  assert.equal(canFinalizePaidPaymentSession(staleAuthorized), false)
  assert.equal(canFinalizePaidPaymentSession(matchingAuthorized), true)
  assert.equal(classifyStripePaymentSession(refreshedPending).kind, "reuse")
  assert.equal(canFinalizePaidPaymentSession(refreshedPending), false)
})

test("completion lock still serializes concurrent complete attempts before refresh", () => {
  const completionInFlight = { current: false }

  assert.equal(lockPaymentAttempt(completionInFlight), true)
  assert.equal(lockPaymentAttempt(completionInFlight), false)

  unlockPaymentAttempt(completionInFlight)

  assert.equal(lockPaymentAttempt(completionInFlight), true)
})

test("storefront selects the last matching Stripe session like the backend", () => {
  const cart = cartWithSession({
    paymentSessions: [
      {
        id: "paysess_canceled",
        amount: 3000,
        currency_code: "eur",
        provider_id: STRIPE_PROVIDER_ID,
        status: "canceled",
        data: { client_secret: "stale-secret" },
      },
      {
        id: "paysess_current",
        amount: 3000,
        currency_code: "eur",
        provider_id: STRIPE_PROVIDER_ID,
        status: "pending",
        data: { client_secret: "current-secret" },
      },
    ],
  })

  const session = getReusableStripePaymentSession(cart)
  const decision = classifyStripePaymentSession(cart)

  assert.equal(session?.id, "paysess_current")
  assert.equal(session?.status, "pending")
  assert.deepEqual(decision, {
    kind: "reuse",
    session,
  })
})

test("classify follows the last Stripe session when an earlier canceled session exists", () => {
  const cart = cartWithSession({
    paymentSessions: [
      {
        id: "paysess_old_pending",
        amount: 3000,
        currency_code: "eur",
        provider_id: STRIPE_PROVIDER_ID,
        status: "canceled",
        data: {},
      },
      {
        id: "paysess_authorized",
        amount: 3000,
        currency_code: "eur",
        provider_id: STRIPE_PROVIDER_ID,
        status: "authorized",
        data: { client_secret: "authorized-secret" },
      },
    ],
  })
  const decision = classifyStripePaymentSession(cart)

  assert.equal(decision.kind, "reconcile")
  assert.equal(decision.status, "authorized")
  assert.equal(decision.session.id, "paysess_authorized")
  assert.equal(canFinalizePaidPaymentSession(cart), true)
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

test("formatMoney safely handles invalid currency codes without throwing RangeError", async () => {
  const { formatMoney } = await import("../../lib/money.ts")
  assert.equal(formatMoney(100, "INVALID_XYZ", "en-US"), "100 INVALID_XYZ")
  assert.equal(formatMoney(45.5, "eur", "en-US"), "€45.50")
})
