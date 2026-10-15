"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { finalizeCheckoutAction } from "../actions/checkout-actions"
import {
  initialCheckoutActionState,
  type CheckoutActionState,
} from "../actions/checkout-action-state"
import type { CheckoutConfirmation } from "../../lib/medusa/checkout-payment"
import { lockPaymentAttempt } from "../../lib/medusa/checkout-payment"
import { formatMoney } from "../../lib/money"

export function CheckoutConfirmationView({
  confirmation,
}: {
  confirmation: CheckoutConfirmation
}) {
  const reference = confirmation.customDisplayId || confirmation.displayId

  return (
    <section className="checkout-section checkout-confirmation" aria-labelledby="checkout-confirmation-title">
      <p className="eyebrow">Payment complete</p>
      <h2 id="checkout-confirmation-title">Thank you for your order.</h2>
      <p>Your payment was captured and Medusa confirmed the order.</p>
      <dl className="checkout-confirmation__facts">
        {reference !== undefined ? (
          <div>
            <dt>Reference</dt>
            <dd>{reference}</dd>
          </div>
        ) : null}
        <div>
          <dt>Total</dt>
          <dd>{formatMoney(confirmation.total, confirmation.currencyCode, "en-CY")}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{confirmation.currencyCode.toUpperCase()}</dd>
        </div>
      </dl>
    </section>
  )
}

type CheckoutFinalizeOrderProps = {
  title?: string
  intro: string
  submitLabel?: string
  pendingLabel?: string
  initialMessage?: string
}

export function shouldAutoFinalizeFromUrl(search: string): boolean {
  if (!search || !search.trim()) {
    return false
  }
  const url = new URL(search.startsWith("?") ? search : `?${search}`, "https://localhost")
  return (
    url.searchParams.get("redirect_status") === "succeeded" ||
    url.searchParams.has("payment_intent_client_secret")
  )
}

/**
 * Finalize-only path: calls finalizeCheckoutAction, which re-checks the freshly
 * read cart with canFinalizePaidPaymentSession before cart.complete.
 * Must never mount Payment Element or call stripe.confirmPayment.
 * After a failed complete, require an authoritative checkout refresh before any
 * further finalize attempt — Medusa may have compensated the prior payment.
 */
export function CheckoutFinalizeOrder({
  title = "Complete your order",
  intro,
  submitLabel = "Complete order",
  pendingLabel = "Placing order…",
  initialMessage,
}: CheckoutFinalizeOrderProps) {
  const router = useRouter()
  const [state, formAction, actionPending] = useActionState<CheckoutActionState, FormData>(
    finalizeCheckoutAction,
    initialCheckoutActionState
  )
  const [isTransitionPending, startTransition] = useTransition()
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [needsAuthoritativeRefresh, setNeedsAuthoritativeRefresh] = useState(false)
  const completionInFlight = useRef(false)
  const pending = actionPending || isTransitionPending || isFinalizing

  useEffect(() => {
    if (!state.confirmation) {
      return
    }

    router.replace("/checkout/confirmation")
  }, [router, state.confirmation])

  useEffect(() => {
    if (state.status !== "error") {
      return
    }

    // Keep completionInFlight locked. Do not unlock for another blind finalize.
    setIsFinalizing(false)
    setNeedsAuthoritativeRefresh(true)
  }, [state])

  function handleFinalize() {
    if (needsAuthoritativeRefresh || !lockPaymentAttempt(completionInFlight)) {
      return
    }

    setIsFinalizing(true)
    startTransition(() => formAction(new FormData()))
  }

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      needsAuthoritativeRefresh ||
      completionInFlight.current
    ) {
      return
    }

    if (shouldAutoFinalizeFromUrl(window.location.search)) {
      handleFinalize()
    }
  }, [needsAuthoritativeRefresh])

  if (state.confirmation) {
    return <CheckoutConfirmationView confirmation={state.confirmation} />
  }

  if (needsAuthoritativeRefresh) {
    return (
      <section className="checkout-section" aria-labelledby="finalize-order-title">
        <h2 id="finalize-order-title">{title}</h2>
        <p className="checkout-message checkout-message--error" role="alert">
          Order confirmation failed. Do not submit another payment while checkout is being reconciled.
          Refresh checkout so Medusa can decide the current payment state.
        </p>
        {state.message ? (
          <p className="checkout-message checkout-message--error" role="alert" aria-live="polite">
            {state.message}
          </p>
        ) : null}
        <a className="button-link button-link--secondary" href="/checkout">
          Refresh checkout
        </a>
      </section>
    )
  }

  const message = state.message || initialMessage

  return (
    <section className="checkout-section" aria-labelledby="finalize-order-title">
      <h2 id="finalize-order-title">{title}</h2>
      <p className="checkout-section__intro">{intro}</p>
      <p className="checkout-message" role="status" aria-live="polite">
        Do not enter payment details again. Your payment was already accepted.
      </p>
      <button className="button-link" type="button" onClick={handleFinalize} disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
      {message ? (
        <p
          className={`checkout-message${state.status === "error" ? " checkout-message--error" : ""}`}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  )
}
