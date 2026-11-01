"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="shadow-none">
      <CardHeader>
        <p className="text-sm font-medium text-muted-foreground">Πληρωμή ολοκληρώθηκε</p>
        <CardTitle>Ευχαριστούμε για την παραγγελία</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Η πληρωμή καταχωρήθηκε και η παραγγελία επιβεβαιώθηκε.
        </p>
        <dl className="grid gap-3 sm:grid-cols-3">
          {reference !== undefined ? (
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Αριθμός</dt>
              <dd className="font-semibold">{reference}</dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Σύνολο</dt>
            <dd className="font-semibold">
              {formatMoney(confirmation.total, confirmation.currencyCode, "el-CY")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Νόμισμα</dt>
            <dd className="font-semibold">{confirmation.currencyCode.toUpperCase()}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
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
  title = "Ολοκλήρωση παραγγελίας",
  intro,
  submitLabel = "Ολοκλήρωση παραγγελίας",
  pendingLabel = "Καταχώρηση…",
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
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-destructive" role="alert">
            Η επιβεβαίωση παραγγελίας απέτυχε. Μην υποβάλεις άλλη πληρωμή όσο γίνεται
            συγχρονισμός. Ανανέωσε το checkout για έλεγχο κατάστασης.
          </p>
          {state.message ? (
            <p className="text-destructive" role="alert" aria-live="polite">
              {state.message}
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

  const message = state.message || initialMessage

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">{intro}</p>
        <p className="text-muted-foreground" role="status" aria-live="polite">
          Μην εισάγεις ξανά στοιχεία πληρωμής. Η πληρωμή έχει ήδη γίνει αποδεκτή.
        </p>
        <Button type="button" onClick={handleFinalize} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {message ? (
          <p
            className={
              state.status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            }
            role={state.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
