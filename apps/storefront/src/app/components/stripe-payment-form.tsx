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
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createKeyedPromiseCache } from "./stripe-promise-cache"
import { CheckoutConfirmationView } from "./checkout-finalize-order"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
    return "Η πληρωμή απορρίφθηκε. Το καλάθι παραμένει διαθέσιμο· δοκίμασε άλλο τρόπο πληρωμής."
  }

  if (error?.type === "validation_error") {
    return "Έλεγξε τα στοιχεία πληρωμής και δοκίμασε ξανά."
  }

  return "Δεν μπορέσαμε να επιβεβαιώσουμε την πληρωμή. Το καλάθι παραμένει διαθέσιμο· δοκίμασε ξανά."
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
        setBrowserMessage(
          "Δεν μπορέσαμε να επαληθεύσουμε την κατάσταση πληρωμής. Μην υποβάλεις ξανά όσο ελέγχεται."
        )
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
        setBrowserMessage(
          "Η πληρωμή δεν ολοκληρώθηκε. Το καλάθι είναι διαθέσιμο· έλεγξε τα στοιχεία και δοκίμασε ξανά."
        )
        setPhase("idle")
        return
      }

      paymentAttemptStarted.current = true
      setBrowserMessage(
        "Η κατάσταση πληρωμής επιβεβαιώνεται ακόμα. Μην υποβάλεις ξανά όσο ελέγχεται."
      )
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
          setBrowserMessage(
            "Δεν μπορέσαμε να επαληθεύσουμε την κατάσταση πληρωμής. Μην υποβάλεις ξανά όσο ελέγχεται."
          )
          setPhase("pending")
        }
        return
      }

      if (!isSuccessfulAutomaticPayment(confirmationError, paymentIntentId, paymentIntentStatus)) {
        if (isRecoverablePaymentFailure(undefined, paymentIntentStatus)) {
          unlockPaymentAttempt(paymentAttemptStarted)
          setBrowserMessage(
            "Η πληρωμή δεν ολοκληρώθηκε. Το καλάθι είναι διαθέσιμο· έλεγξε τα στοιχεία και δοκίμασε ξανά."
          )
          setPhase("idle")
        } else {
          setBrowserMessage(
            "Η κατάσταση πληρωμής επιβεβαιώνεται ακόμα. Μην υποβάλεις ξανά όσο ελέγχεται."
          )
          setPhase("pending")
        }
        return
      }

      paymentAlreadySucceeded.current = true
      completeCart()
    } catch {
      if (!paymentAlreadySucceeded.current) {
        if (confirmationStarted) {
          setBrowserMessage(
            "Δεν μπορέσαμε να επαληθεύσουμε την κατάσταση πληρωμής. Μην υποβάλεις ξανά όσο ελέγχεται."
          )
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
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Πληρωμή</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive" role="alert">
          Η συνεδρία πληρωμής δεν είναι διαθέσιμη. Ανανέωσε το checkout για να δοκιμάσεις ξανά.
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/checkout">Ανανέωση</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (state.confirmation) {
    return <CheckoutConfirmationView confirmation={state.confirmation} />
  }

  if (needsAuthoritativeRefresh) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Επιβεβαίωση παραγγελίας</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-destructive" role="alert">
            Η πληρωμή καταχωρήθηκε, αλλά η επιβεβαίωση παραγγελίας απέτυχε. Μην πληρώσεις ξανά.
            Ανανέωσε το checkout ώστε το σύστημα να αποφασίσει αν η παραγγελία υπάρχει ήδη ή αν
            χρειάζεται νέα συνεδρία.
          </p>
          {state.message ? (
            <p className="text-destructive" role="alert" aria-live="polite">
              {state.message}
            </p>
          ) : null}
          {browserMessage ? (
            <p className="text-destructive" role="alert">
              {browserMessage}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/checkout">Ανανέωση</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const submitLabel =
    phase === "confirming"
      ? "Επιβεβαίωση πληρωμής…"
      : phase === "pending"
        ? "Επεξεργασία πληρωμής…"
        : phase === "completing"
          ? "Καταχώρηση παραγγελίας…"
          : "Ασφαλής πληρωμή"

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Πληρωμή</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Τα στοιχεία κάρτας εισάγονται απευθείας στο ασφαλές Payment Element της Stripe.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <fieldset disabled={paymentFormDisabled} className="border-0 p-0">
            <legend className="sr-only">Στοιχεία πληρωμής Stripe</legend>
            <PaymentElement />
          </fieldset>
          <Button type="submit" disabled={paymentFormDisabled || !stripe || !elements}>
            {submitLabel}
          </Button>
          {browserMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {browserMessage}
            </p>
          ) : null}
          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
              role={state.status === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

export function StripePaymentForm({ payment, publishableKey }: StripePaymentFormProps) {
  if (!publishableKey) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Πληρωμή</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive" role="alert">
          Η πληρωμή δεν είναι διαθέσιμη προσωρινά. Το καλάθι παραμένει διαθέσιμο· δοκίμασε αργότερα.
        </CardContent>
      </Card>
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
