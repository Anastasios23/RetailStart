import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ConfirmationClient } from "./confirmation-client"
import { readCartId } from "../../../lib/medusa/cart-cookie"
import { retrieveCompletedCheckoutConfirmation } from "../../../lib/medusa/checkout"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your guest order has been confirmed.",
}

export default async function CheckoutConfirmationPage() {
  const cartId = await readCartId()

  if (!cartId) {
    notFound()
  }

  let confirmation
  try {
    confirmation = await retrieveCompletedCheckoutConfirmation(cartId)
  } catch {
    return (
      <main className="page-shell checkout-page" aria-labelledby="checkout-confirmation-title">
        <header className="page-heading">
          <p className="eyebrow">Guest checkout</p>
          <h1 id="checkout-confirmation-title">We’re checking your order</h1>
          <p className="lede">
            We couldn’t verify the order just now. Your cart is still saved, and
            you haven’t been asked to pay again.
          </p>
        </header>
        <div className="action-row checkout-unavailable__actions">
          <Link className="button-link" href="/checkout">Check order status</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell checkout-page" aria-labelledby="checkout-confirmation-title">
      <ConfirmationClient {...confirmation} />
    </main>
  )
}
