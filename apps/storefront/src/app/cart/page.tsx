import type { HttpTypes } from "@medusajs/types"
import type { Metadata } from "next"
import Link from "next/link"

import { CartItemActions } from "../components/cart-item-actions"
import { getCurrentCart } from "../../lib/medusa/cart"
import { formatMoney } from "../../lib/money"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the current items in your guest cart.",
}

const displayLocale = "en-CY"

function formatCartAmount(amount: number | undefined, currencyCode: string): string | null {
  if (amount === undefined || !Number.isFinite(amount)) {
    return null
  }

  return formatMoney(amount, currencyCode, displayLocale)
}

function CartEmptyState({ stale }: { stale: boolean }) {
  return (
    <section className="empty-state" aria-labelledby="empty-cart-title">
      <h2 id="empty-cart-title">Your cart is empty</h2>
      <p>
        {stale
          ? "The previous guest cart is no longer available. You can start a new cart from the catalog."
          : "Add a product to begin a guest cart."}
      </p>
      <Link className="button-link" href="/products">
        Browse products
      </Link>
    </section>
  )
}

function CartUnavailableState() {
  return (
    <section className="error-state" aria-labelledby="cart-unavailable-title">
      <h2 id="cart-unavailable-title">Cart temporarily unavailable</h2>
      <p>We could not read the current cart. Please refresh and try again.</p>
      <Link className="button-link button-link--secondary" href="/cart">
        Try again
      </Link>
    </section>
  )
}

function CartLineItem({ item, currencyCode }: { item: HttpTypes.StoreCartLineItem; currencyCode: string }) {
  const lineTotal = formatCartAmount(item.total ?? item.item_total, currencyCode)
  const unitPrice = formatCartAmount(item.unit_price, currencyCode)
  const variantLabel = item.variant_title || item.variant_sku

  return (
    <li className="cart-item">
      <div className="cart-item__main">
        <h2>{item.product_title || item.title}</h2>
        {variantLabel ? <p className="cart-item__variant">{variantLabel}</p> : null}
        {item.variant_sku && item.variant_title ? <p className="cart-item__variant">SKU: {item.variant_sku}</p> : null}
        <dl className="cart-item__facts">
          {unitPrice ? (
            <div>
              <dt>Unit price</dt>
              <dd>{unitPrice}</dd>
            </div>
          ) : null}
          {lineTotal ? (
            <div>
              <dt>Line total</dt>
              <dd>{lineTotal}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <CartItemActions lineItemId={item.id} quantity={item.quantity} />
    </li>
  )
}

function CartSummary({ cart }: { cart: HttpTypes.StoreCart }) {
  const subtotal = formatCartAmount(cart.subtotal, cart.currency_code)
  const total = formatCartAmount(cart.total, cart.currency_code)

  return (
    <aside className="cart-summary" aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title">Summary</h2>
      <dl>
        {subtotal ? (
          <div className="cart-summary__row">
            <dt>Subtotal</dt>
            <dd>{subtotal}</dd>
          </div>
        ) : null}
        {total ? (
          <div className="cart-summary__row cart-summary__row--total">
            <dt>Total</dt>
            <dd>{total}</dd>
          </div>
        ) : null}
      </dl>
      <p className="cart-summary__note">
        Prices and totals are supplied by the commerce backend. Payment is deferred to the next phase.
      </p>
      <Link className="button-link" href="/checkout">
        Continue to checkout
      </Link>
    </aside>
  )
}

export default async function CartPage() {
  const result = await getCurrentCart()

  return (
    <main className="page-shell cart-page" aria-labelledby="cart-title">
      <header className="page-heading">
        <p className="eyebrow">Guest cart</p>
        <h1 id="cart-title">Your cart</h1>
        <p className="lede">Review current Medusa cart state before the later checkout phase.</p>
      </header>

      {result.kind === "missing" ? <CartEmptyState stale={false} /> : null}
      {result.kind === "stale" ? <CartEmptyState stale /> : null}
      {result.kind === "unavailable" ? <CartUnavailableState /> : null}
      {result.kind === "available" ? (
        result.cart.items?.length ? (
          <div className="cart-layout">
            <section aria-labelledby="cart-items-title">
              <h2 id="cart-items-title" className="sr-only">Cart items</h2>
              <ul className="cart-items">
                {result.cart.items.map((item) => (
                  <CartLineItem
                    key={item.id}
                    item={item}
                    currencyCode={result.cart.currency_code}
                  />
                ))}
              </ul>
            </section>
            <CartSummary cart={result.cart} />
          </div>
        ) : (
          <CartEmptyState stale={false} />
        )
      ) : null}
    </main>
  )
}
