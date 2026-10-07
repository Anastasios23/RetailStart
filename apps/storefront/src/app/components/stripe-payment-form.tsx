"use client"

import {
  PaymentElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createKeyedPromiseCache } from "./stripe-promise-cache"
import { CheckoutConfirmationView } from "./checkout-finalize-order"

import {
  completeCheckoutAction,
} from "../actions/checkout-actions"
import {
  initialCheckoutActionState,
  type CheckoutActionState,
} from "../actions/checkout-action-state"
import {
  mapPaymentSessionState,
  isSuccessfulAutomaticPayment,
  isRecoverablePaymentFailure,
  isReturnUrlCompletableSessionStatus,
  lockPaymentAttempt,
  unlockPaymentAttempt,
  shouldAllowStripePaymentConfirmation,
  type CheckoutPaymentProjection,
} from "../../lib/medusa/checkout-payment"

type StripePaymentFormProps = {
  payment: CheckoutPaymentProjection
  publishableKey: string | null
}

type PaymentPhase =
  | "idle"
  | "confirming"
  | "pending"
  | "completing"
  | "needs_refresh"

const getStripePromise = createKeyedPromiseCache((publishableKey: string) =>
  loadStripe(publishableKey)
)

function browserPaymentError(error: { type?: string; code?: string } | undefined): string {
  if (error?.type === "card_error" || error?.code === "card_declined") {
    return "The payment was declined. Your cart is still available; try another payment method."
  }

  if (error?.type === "validation_error") {
    return "Check the payment details and try again."
  }

  return "We could not confirm the payment yet. Your cart remains available; please try again."
}

function PaymentFormInner({ payment }: { payment: CheckoutPaymentProjection }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [state, formAction, actionPending] = useActionState<CheckoutActionState, FormData>(
    completeCheckoutAction,
    initialCheckoutActionState
  )
  const [phase, setPhase] = useState<PaymentPhase>("idle")
  const [browserMessage, setBrowserMessage] = useState<string | undefined>()
  const [isTransitionPending, startTransition] = useTransition()
  const completionInFlight = useRef(false)
  const paymentAttemptStarted = useRef(false)
  const paymentAlreadySucceeded = useRef(false)
  const needsAuthoritativeRefresh = phase === "needs_refresh"
  const completionPending = actionPending || isTransitionPending || phase === "completing"
  const paymentFormDisabled =
    completionPending ||
    phase === "confirming" ||
    phase === "pending" ||
    needsAuthoritativeRefresh ||
    paymentAlreadySucceeded.current

  useEffect(() => {
    if (!state.confirmation) {
      return
    }

    router.replace("/checkout/confirmation")
  }, [router, state.confirmation])

  useEffect(() => {
    if (state.status !== "error" || !paymentAlreadySucceeded.current) {
      return
    }

    // Keep completionInFlight locked. Medusa may have compensated the payment;
    // do not blind-retry cart.complete from stale browser state.
    setPhase("needs_refresh")
  }, [state])

  const completeCart = useCallback(() => {
    if (needsAuthoritativeRefresh || !lockPaymentAttempt(completionInFlight)) {
      return
    }

    paymentAlreadySucceeded.current = true
    setBrowserMessage(undefined)
    setPhase("completing")
    startTransition(() => formAction(new FormData()))
  }, [formAction, needsAuthoritativeRefresh, startTransition])

  useEffect(() => {
    if (
      !stripe ||
      !isReturnUrlCompletableSessionStatus(payment.sessionStatus) ||
      completionInFlight.current ||
      paymentAlreadySucceeded.current ||
      needsAuthoritativeRefresh
    ) {
      return
    }

    const query = new URLSearchParams(window.location.search)

    if (query.get("payment_intent_client_secret") !== payment.clientSecret) {
      return
    }

    let active = true

    void stripe.retrievePaymentIntent(payment.clientSecret).then((result) => {
      if (!active) {
        return
      }

      if (result.error) {
        paymentAttemptStarted.current = true
        setBrowserMessage("We could not verify the payment status. Do not submit again while it is being checked.")
        setPhase("pending")
        return
      }

      if (
        isSuccessfulAutomaticPayment(
          result.error,
          result.paymentIntent?.id,
          result.paymentIntent?.status
        )
      ) {
        completeCart()
        return
      }

      if (isRecoverablePaymentFailure(undefined, result.paymentIntent?.status)) {
        setBrowserMessage("The payment was not completed. Your cart is available; check your payment details and try again.")
        setPhase("idle")
        return
      }

      paymentAttemptStarted.current = true
      setBrowserMessage("The payment status is still being confirmed. Do not submit again while it is being checked.")
      setPhase("pending")
    })

    return () => {
      active = false
    }
  }, [
    completeCart,
    needsAuthoritativeRefresh,
    payment.clientSecret,
    payment.sessionStatus,
    stripe,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !shouldAllowStripePaymentConfirmation({
        paymentAlreadySucceeded: paymentAlreadySucceeded.current,
        needsAuthoritativeRefresh,
      })
    ) {
      return
    }

    if (
      !stripe ||
      !elements ||
      paymentFormDisabled ||
      completionInFlight.current ||
      !lockPaymentAttempt(paymentAttemptStarted)
    ) {
      return
    }

    setBrowserMessage(undefined)
    setPhase("confirming")
    let confirmationStarted = false

    try {
      const { error: submitError } = await elements.submit()

      if (submitError) {
        unlockPaymentAttempt(paymentAttemptStarted)
        setBrowserMessage(browserPaymentError(submitError))
        setPhase("idle")
        return
      }

      confirmationStarted = true
      const confirmationResult = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      })
      const confirmationError = confirmationResult.error
      const paymentIntentId = confirmationResult.paymentIntent?.id
      const paymentIntentStatus = confirmationResult.paymentIntent?.status

      if (confirmationError) {
        if (
          isRecoverablePaymentFailure(
            confirmationError.type,
            confirmationError.payment_intent?.status
          )
        ) {
          setBrowserMessage(browserPaymentError(confirmationError))
          unlockPaymentAttempt(paymentAttemptStarted)
          setPhase("idle")
        } else {
          setBrowserMessage("We could not verify the payment status. Do not submit again while it is being checked.")
          setPhase("pending")
        }
        return
      }

      if (!isSuccessfulAutomaticPayment(confirmationError, paymentIntentId, paymentIntentStatus)) {
        if (isRecoverablePaymentFailure(undefined, paymentIntentStatus)) {
          unlockPaymentAttempt(paymentAttemptStarted)
          setBrowserMessage("The payment was not completed. Your cart is available; check your payment details and try again.")
          setPhase("idle")
        } else {
          setBrowserMessage("The payment status is still being confirmed. Do not submit again while it is being checked.")
          setPhase("pending")
        }
        return
      }

      paymentAlreadySucceeded.current = true
      completeCart()
    } catch {
      if (!paymentAlreadySucceeded.current) {
        if (confirmationStarted) {
          setBrowserMessage("We could not verify the payment status. Do not submit again while it is being checked.")
          setPhase("pending")
        } else {
          unlockPaymentAttempt(paymentAttemptStarted)
          setBrowserMessage(browserPaymentError(undefined))
          setPhase("idle")
        }
      }
    }
  }

  const sessionState = mapPaymentSessionState(payment.sessionStatus)

  if (sessionState === "error" || sessionState === "canceled") {
    return (
      <section className="checkout-section" aria-labelledby="payment-title">
        <h2 id="payment-title">Payment</h2>
        <p className="checkout-message checkout-message--error" role="alert">
          This payment session is not available. Refresh checkout to try again.
        </p>
      </section>
    )
  }

  if (state.confirmation) {
    return <CheckoutConfirmationView confirmation={state.confirmation} />
  }

  if (needsAuthoritativeRefresh) {
    return (
      <section className="checkout-section" aria-labelledby="payment-reconcile-title">
        <h2 id="payment-reconcile-title">Confirming your order</h2>
        <p className="checkout-message checkout-message--error" role="alert">
          Payment was received, but order confirmation failed. Do not pay again.
          Refresh checkout so Medusa can decide whether the order already exists,
          a new payment session is required, or finalization is still safe.
        </p>
        {state.message ? (
          <p className="checkout-message checkout-message--error" role="alert" aria-live="polite">
            {state.message}
          </p>
        ) : null}
        {browserMessage ? (
          <p className="checkout-message checkout-message--error" role="alert">
            {browserMessage}
          </p>
        ) : null}
        <a className="button-link button-link--secondary" href="/checkout">
          Refresh checkout
        </a>
      </section>
    )
  }

  return (
    <section className="checkout-section" aria-labelledby="payment-title">
      <h2 id="payment-title">Payment</h2>
      <p className="checkout-section__intro">
        Your card details are entered directly into Stripe&apos;s secure Payment Element.
      </p>
      <form className="checkout-form" onSubmit={handleSubmit}>
        <fieldset disabled={paymentFormDisabled}>
          <legend className="sr-only">Stripe payment details</legend>
          <PaymentElement />
        </fieldset>
        <button className="button-link" type="submit" disabled={paymentFormDisabled || !stripe || !elements}>
        {phase === "confirming"
          ? "Confirming payment…"
          : phase === "pending"
            ? "Payment processing…"
          : phase === "completing"
              ? "Placing order…"
              : "Pay securely"}
        </button>
        {browserMessage ? (
          <p className="checkout-message checkout-message--error" role="alert">
            {browserMessage}
          </p>
        ) : null}
        {state.message ? (
          <p
            className={`checkout-message${state.status === "error" ? " checkout-message--error" : ""}`}
            role={state.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  )
}

export function StripePaymentForm({ payment, publishableKey }: StripePaymentFormProps) {
  if (!publishableKey) {
    return (
      <section className="checkout-section" aria-labelledby="payment-title">
        <h2 id="payment-title">Payment</h2>
        <p className="checkout-message checkout-message--error" role="alert">
          Payment is temporarily unavailable. Your cart remains available; try again later.
        </p>
      </section>
    )
  }

  const stripePromise = getStripePromise(publishableKey)

  return (
    <Elements
      key={payment.clientSecret}
      stripe={stripePromise}
      options={{ clientSecret: payment.clientSecret }}
    >
      <PaymentFormInner payment={payment} />
    </Elements>
  )
}
