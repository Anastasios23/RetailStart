"use client"

import { useEffect, useRef } from "react"

import { clearCompletedCartAction } from "../../actions/checkout-actions"
import { formatMoney } from "../../../lib/money"

type ConfirmationClientProps = {
  currencyCode: string
  customDisplayId?: string
  displayId?: number
  total: number
}

export function ConfirmationClient({
  currencyCode,
  customDisplayId,
  displayId,
  total,
}: ConfirmationClientProps) {
  const clearStarted = useRef(false)

  useEffect(() => {
    if (clearStarted.current) {
      return
    }

    clearStarted.current = true
    void clearCompletedCartAction({
      displayId,
      customDisplayId,
      total,
      currencyCode,
    })
  }, [currencyCode, customDisplayId, displayId, total])

  const reference = customDisplayId || displayId

  return (
    <section className="checkout-section checkout-confirmation" aria-labelledby="checkout-confirmation-title">
      <p className="eyebrow">Payment complete</p>
      <h1 id="checkout-confirmation-title">Thank you for your order.</h1>
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
          <dd>{formatMoney(total, currencyCode, "en-CY")}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{currencyCode.toUpperCase()}</dd>
        </div>
      </dl>
      <a className="button-link" href="/products">
        Continue shopping
      </a>
    </section>
  )
}
