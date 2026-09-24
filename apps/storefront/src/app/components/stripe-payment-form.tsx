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
  lockPaymentAttempt,
  unlockPaymentAttempt,
  type CheckoutConfirmation,
  type CheckoutPaymentProjection,
} from "../../lib/medusa/checkout-payment"
import { formatMoney } from "../../lib/money"

type StripePaymentFormProps = {
  payment: CheckoutPaymentProjection
  publishableKey: string | null
}

type PaymentPhase = "idle" | "confirming" | "pending" | "completing"

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

function ConfirmationState({ confirmation }: { confirmation: CheckoutConfirmation }) {
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
  const completionStarted = useRef(false)
  const paymentAttemptStarted = useRef(false)
  const completionPending = actionPending || isTransitionPending || phase === "completing"
  const paymentFormDisabled = completionPending || phase === "confirming" || phase === "pending"

  useEffect(() => {
    if (!state.confirmation) {
      return
    }

    router.replace("/checkout/confirmation")
  }, [router, state.confirmation])

  const completeCart = useCallback(() => {
    if (completionStarted.current) {
      return
    }

    completionStarted.current = true
    setBrowserMessage(undefined)
    setPhase("completing")
    startTransition(() => formAction(new FormData()))
  }, [formAction, startTransition])

  useEffect(() => {
    if (!stripe || payment.sessionStatus !== "pending" || completionStarted.current) {
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
  }, [completeCart, payment.clientSecret, payment.sessionStatus, stripe])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !stripe ||
      !elements ||
      paymentFormDisabled ||
      completionStarted.current ||
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

      completeCart()
    } catch {
      if (!completionStarted.current) {
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
    return <ConfirmationState confirmation={state.confirmation} />
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
