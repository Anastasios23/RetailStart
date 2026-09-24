import type { Metadata } from "next"
import Link from "next/link"

import { CheckoutForm } from "../components/checkout-form"
import { getCheckoutPageData } from "../../lib/medusa/checkout"
import { redirect } from "next/navigation"
import { ConfirmationClient } from "./confirmation/confirmation-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Prepare a guest cart with contact, delivery, shipping, tax, and current totals.",
}

function CheckoutUnavailableState() {
  return (
    <main className="page-shell checkout-page" aria-labelledby="checkout-unavailable-title">
      <header className="page-heading">
        <p className="eyebrow">Guest checkout</p>
        <h1 id="checkout-unavailable-title">Checkout temporarily unavailable</h1>
        <p className="lede">
          We could not retrieve the current commerce state. Your cart was not replaced or changed. Please try again.
        </p>
      </header>
      <div className="action-row checkout-unavailable__actions">
        <Link className="button-link" href="/checkout">Try checkout again</Link>
        <Link className="text-link" href="/cart">Return to cart</Link>
      </div>
    </main>
  )
}

function CheckoutReconciliationUnavailableState() {
  return (
    <main className="page-shell checkout-page" aria-labelledby="checkout-reconciliation-title">
      <header className="page-heading">
        <p className="eyebrow">Guest checkout</p>
        <h1 id="checkout-reconciliation-title">Order confirmation temporarily unavailable</h1>
        <p className="lede">
          Medusa reports that checkout has completed, but we could not retrieve the order confirmation. Do not try to pay again. Refresh to check the order status.
        </p>
      </header>
      <div className="action-row checkout-unavailable__actions">
        <Link className="button-link" href="/checkout">Refresh order status</Link>
      </div>
    </main>
  )
}

export default async function CheckoutPage() {
  const result = await getCheckoutPageData()

  if (result.kind === "redirect") {
    redirect("/cart")
  }

  if (result.kind === "unavailable") {
    return <CheckoutUnavailableState />
  }

  if (result.kind === "reconciliation-unavailable") {
    return <CheckoutReconciliationUnavailableState />
  }

  if (result.kind === "confirmation") {
    return (
      <main className="page-shell checkout-page" aria-labelledby="checkout-confirmation-title">
        <ConfirmationClient {...result.confirmation} />
      </main>
    )
  }

  return (
    <main className="page-shell checkout-page" aria-labelledby="checkout-title">
      <CheckoutForm
        cart={result.cart}
        countries={result.countries}
        shippingOptions={result.shippingOptions}
        shippingOptionsUnavailable={result.shippingOptionsUnavailable}
        payment={result.payment}
        paymentUnavailable={result.paymentUnavailable}
        paymentIssue={result.paymentIssue}
        publishableKey={result.publishableKey}
      />
    </main>
  )
}
