import type { Metadata } from "next"
import Link from "next/link"

import { CheckoutForm } from "../components/checkout-form"
import { getCheckoutPageData } from "../../lib/medusa/checkout"
import { redirect } from "next/navigation"

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

export default async function CheckoutPage() {
  const result = await getCheckoutPageData()

  if (result.kind === "redirect") {
    redirect("/cart")
  }

  if (result.kind === "unavailable") {
    return <CheckoutUnavailableState />
  }

  return (
    <main className="page-shell checkout-page" aria-labelledby="checkout-title">
      <CheckoutForm
        cart={result.cart}
        countries={result.countries}
        shippingOptions={result.shippingOptions}
        shippingOptionsUnavailable={result.shippingOptionsUnavailable}
      />
    </main>
  )
}
