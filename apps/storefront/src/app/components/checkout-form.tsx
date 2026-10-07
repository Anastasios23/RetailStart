"use client"

import { useActionState, useEffect, useState } from "react"
import type { FormEvent, FocusEvent, InvalidEvent } from "react"
import type { HttpTypes } from "@medusajs/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  selectShippingMethodAction,
  updateCheckoutContactAction,
} from "../actions/checkout-actions"
import {
  initialCheckoutActionState,
  type CheckoutActionState,
} from "../actions/checkout-action-state"
import type { CheckoutCountry } from "../../lib/medusa/checkout"
import {
  hasStoredCheckoutContact,
} from "../../lib/medusa/checkout-validation"
import type { CheckoutFieldName } from "../../lib/medusa/checkout-validation"
import {
  deriveCheckoutProgress,
  hasCurrentCheckoutTotals,
} from "../../lib/medusa/checkout-presentation"
import { CheckoutFinalizeOrder } from "./checkout-finalize-order"
import { StripePaymentForm } from "./stripe-payment-form"
import type {
  CheckoutPaymentIssue,
  CheckoutPaymentProjection,
} from "../../lib/medusa/checkout-payment"
import { canFinalizePaidPaymentSession } from "../../lib/medusa/checkout-payment"
import { formatMoney } from "../../lib/money"

type CheckoutFormProps = {
  cart: HttpTypes.StoreCart
  countries: CheckoutCountry[]
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  shippingOptionsUnavailable: boolean
  payment: CheckoutPaymentProjection | null
  paymentUnavailable: boolean
  paymentIssue: CheckoutPaymentIssue | null
  publishableKey: string | null
}

type FieldElement = HTMLInputElement | HTMLSelectElement

function getFieldError(state: CheckoutActionState, field: CheckoutFieldName): string | undefined {
  return state.fieldErrors?.[field]
}

function formatAmount(amount: unknown, currencyCode: string): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || !currencyCode.trim()) {
    return null
  }

  return formatMoney(amount, currencyCode, "en-CY")
}

function getShippingOptionAmount(
  option: HttpTypes.StoreCartShippingOptionWithServiceZone
): number | null {
  const calculatedAmount = option.calculated_price?.calculated_amount

  if (typeof calculatedAmount === "number" && Number.isFinite(calculatedAmount)) {
    return calculatedAmount
  }

  return typeof option.amount === "number" && Number.isFinite(option.amount)
    ? option.amount
    : null
}

function ActionMessage({ state }: { state: CheckoutActionState }) {
  if (state.status === "idle" || !state.message) {
    return null
  }

  return (
    <p
      className={`checkout-message${state.status === "error" ? " checkout-message--error" : ""}`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null
  }

  return (
    <p id={id} className="checkout-field__error" role="alert">
      <span aria-hidden="true">!</span> {message}
    </p>
  )
}

function CheckoutSummary({ cart }: { cart: HttpTypes.StoreCart }) {
  const currencyCode = cart.currency_code
  const shippingMethod = cart.shipping_methods?.[0]
  const totals = [
    ["Item subtotal", cart.item_subtotal],
    ["Shipping", cart.shipping_subtotal],
    ["Tax", cart.tax_total],
    ["Subtotal", cart.subtotal],
    ["Total", cart.total],
  ] as const

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">Order summary</h2>
      <ul className="checkout-summary__items">
        {(cart.items ?? []).map((item) => (
          <li key={item.id}>
            <span>
              {item.product_title || item.title} × {item.quantity}
            </span>
            <strong>
              {formatAmount(item.total ?? item.item_total, currencyCode) ?? "Unavailable"}
            </strong>
          </li>
        ))}
      </ul>
      {shippingMethod ? (
        <div className="checkout-summary__shipping">
          <span>{shippingMethod.name}</span>
          <strong>{formatAmount(shippingMethod.total ?? shippingMethod.amount, currencyCode) ?? "Unavailable"}</strong>
        </div>
      ) : null}
      <dl className="checkout-summary__totals">
        {totals.map(([label, amount]) => (
          <div className={label === "Total" ? "checkout-summary__total" : ""} key={label}>
            <dt>{label}</dt>
            <dd>{formatAmount(amount, currencyCode) ?? "Unavailable"}</dd>
          </div>
        ))}
      </dl>
      <p className="checkout-summary__currency">
        Currency: <strong>{currencyCode ? currencyCode.toUpperCase() : "Unavailable"}</strong>
      </p>
      {!hasCurrentCheckoutTotals(cart) ? (
        <p className="checkout-summary__warning" role="alert">
          Current totals are unavailable from the commerce backend. No local amount has been calculated.
        </p>
      ) : null}
    </aside>
  )
}

function ShippingOptions({
  cart,
  options,
  unavailable,
}: {
  cart: HttpTypes.StoreCart
  options: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  unavailable: boolean
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    selectShippingMethodAction,
    initialCheckoutActionState
  )
  const selectedOptionId = cart.shipping_methods?.[0]?.shipping_option_id

  useEffect(() => {
    if (state.status === "success") {
      router.refresh()
    }
  }, [router, state.status])

  if (unavailable) {
    return (
      <section className="checkout-section" aria-labelledby="shipping-title">
        <h2 id="shipping-title">Shipping method</h2>
        <p className="checkout-unavailable" role="alert">
          Shipping options are temporarily unavailable. Refresh to try again.
        </p>
        <Link className="button-link button-link--secondary" href="/checkout">
          Refresh checkout
        </Link>
      </section>
    )
  }

  if (options.length === 0) {
    return (
      <section className="checkout-section" aria-labelledby="shipping-title">
        <h2 id="shipping-title">Shipping method</h2>
        <p className="checkout-unavailable" role="alert">
          No shipping option is currently available for this addressed cart.
        </p>
        <Link className="button-link button-link--secondary" href="/checkout">
          Refresh checkout
        </Link>
      </section>
    )
  }

  return (
    <section className="checkout-section" aria-labelledby="shipping-title">
      <h2 id="shipping-title">Shipping method</h2>
      <p className="checkout-section__intro">
        Choose an option reported as available by Medusa. The final price comes from the cart after selection.
      </p>
      <form action={formAction} className="checkout-form checkout-form--shipping">
        <fieldset>
          <legend className="sr-only">Available shipping options</legend>
          <div className="shipping-options">
            {options.map((option) => {
              const amount = getShippingOptionAmount(option)
              const amountLabel = formatAmount(amount, cart.currency_code)

              return (
                <label className="shipping-option" key={option.id}>
                  <input
                    type="radio"
                    name="shippingOptionId"
                    value={option.id}
                    defaultChecked={option.id === selectedOptionId}
                    disabled={amount === null}
                    required
                  />
                  <span className="shipping-option__details">
                    <strong>{option.name}</strong>
                    <span>{amountLabel ?? "Price unavailable"}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <button className="button-link" type="submit" disabled={pending}>
          {pending ? "Saving shipping…" : "Save shipping method"}
        </button>
        <ActionMessage state={state} />
      </form>
    </section>
  )
}

export function CheckoutForm({
  cart,
  countries,
  shippingOptions,
  shippingOptionsUnavailable,
  payment,
  paymentUnavailable,
  paymentIssue,
  publishableKey,
}: CheckoutFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    updateCheckoutContactAction,
    initialCheckoutActionState
  )
  const [clientInvalidFields, setClientInvalidFields] = useState<Set<string>>(new Set())
  const address = cart.shipping_address
  const hasContactAddress = hasStoredCheckoutContact(cart.email, address)
  const hasShippingMethod = Boolean(
    !shippingOptionsUnavailable &&
      cart.shipping_methods?.some((method) =>
        shippingOptions.some((option) => option.id === method.shipping_option_id)
      )
  )
  const progress = deriveCheckoutProgress({
    hasContactAddress,
    hasShippingMethod,
    hasCurrentTotals: hasCurrentCheckoutTotals(cart),
  })

  useEffect(() => {
    if (state.status === "success") {
      router.refresh()
    }
  }, [router, state.status])

  function syncNativeValidity(field: FieldElement) {
    setClientInvalidFields((previous) => {
      const next = new Set(previous)

      if (field.validity.valid) {
        next.delete(field.name)
      } else {
        next.add(field.name)
      }

      return next
    })
  }

  function getFieldFromEvent(event: { target: EventTarget | null }): FieldElement | null {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target
      : null
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)

    if (field) {
      syncNativeValidity(field)
    }
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)

    if (field) {
      syncNativeValidity(field)
    }
  }

  function handleInvalid(event: InvalidEvent<HTMLFormElement>) {
    const field = getFieldFromEvent(event)

    if (field) {
      syncNativeValidity(field)
    }
  }

  function fieldProps(name: CheckoutFieldName, errorId: string) {
    const error = getFieldError(state, name)

    return {
      "aria-invalid": error || clientInvalidFields.has(name) ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
    }
  }

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <header className="page-heading">
          <p className="eyebrow">Guest checkout</p>
          <h1 id="checkout-title">Delivery details</h1>
          <p className="lede">
            Enter your contact and delivery details, choose shipping, then pay securely through Stripe.
          </p>
        </header>

        <p className="checkout-progress" aria-live="polite">
          {progress === "contact_address_incomplete"
            ? "Contact and address details are incomplete."
            : progress === "shipping_required"
              ? "Choose a shipping method to continue."
              : progress === "totals_unavailable"
                ? "Current checkout totals are unavailable."
                : "Ready for secure payment."}
        </p>

        <section className="checkout-section" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact and delivery address</h2>
          <p className="checkout-section__intro">
            Billing uses this same validated address for the initial guest checkout flow.
          </p>
          <form
            action={formAction}
            className="checkout-form"
            onBlur={handleBlur}
            onInput={handleInput}
            onInvalid={handleInvalid}
          >
            <fieldset>
              <legend className="sr-only">Contact and delivery address fields</legend>
              <div className="checkout-form__grid">
                <div className="checkout-field">
                  <label htmlFor="checkout-email">Email <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    defaultValue={cart.email ?? ""}
                    required
                    {...fieldProps("email", "checkout-email-error")}
                  />
                  <FieldError id="checkout-email-error" message={getFieldError(state, "email")} />
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-first-name">First name <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-first-name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    maxLength={100}
                    defaultValue={address?.first_name ?? ""}
                    required
                    {...fieldProps("first_name", "checkout-first-name-error")}
                  />
                  <FieldError id="checkout-first-name-error" message={getFieldError(state, "first_name")} />
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-last-name">Last name <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-last-name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    maxLength={100}
                    defaultValue={address?.last_name ?? ""}
                    required
                    {...fieldProps("last_name", "checkout-last-name-error")}
                  />
                  <FieldError id="checkout-last-name-error" message={getFieldError(state, "last_name")} />
                </div>
                <div className="checkout-field checkout-field--wide">
                  <label htmlFor="checkout-address-1">Address line 1 <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-address-1"
                    name="address_1"
                    type="text"
                    autoComplete="address-line1"
                    maxLength={200}
                    defaultValue={address?.address_1 ?? ""}
                    required
                    {...fieldProps("address_1", "checkout-address-1-error")}
                  />
                  <FieldError id="checkout-address-1-error" message={getFieldError(state, "address_1")} />
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-city">City <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    maxLength={100}
                    defaultValue={address?.city ?? ""}
                    required
                    {...fieldProps("city", "checkout-city-error")}
                  />
                  <FieldError id="checkout-city-error" message={getFieldError(state, "city")} />
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-postal-code">Postal code <span aria-hidden="true">*</span></label>
                  <input
                    id="checkout-postal-code"
                    name="postal_code"
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={40}
                    defaultValue={address?.postal_code ?? ""}
                    required
                    {...fieldProps("postal_code", "checkout-postal-code-error")}
                  />
                  <FieldError id="checkout-postal-code-error" message={getFieldError(state, "postal_code")} />
                </div>
                <div className="checkout-field">
                  <label htmlFor="checkout-country">Country <span aria-hidden="true">*</span></label>
                  <select
                    id="checkout-country"
                    name="country_code"
                    autoComplete="country"
                    defaultValue={address?.country_code?.toUpperCase() ?? ""}
                    required
                    {...fieldProps("country_code", "checkout-country-error")}
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="checkout-country-error" message={getFieldError(state, "country_code")} />
                </div>
              </div>
            </fieldset>
            <button className="button-link" type="submit" disabled={pending}>
              {pending ? "Saving details…" : "Save contact and address"}
            </button>
            <ActionMessage state={state} />
          </form>
        </section>

        {hasContactAddress ? (
          <ShippingOptions
            cart={cart}
            options={shippingOptions}
            unavailable={shippingOptionsUnavailable}
          />
        ) : null}

        {progress === "ready_for_payment" && payment ? (
          <StripePaymentForm payment={payment} publishableKey={publishableKey} />
        ) : null}

        {progress === "ready_for_payment" &&
        paymentIssue &&
        canFinalizePaidPaymentSession(cart) ? (
          <CheckoutFinalizeOrder
            intro={`Medusa reports this payment as ${paymentIssue}. Complete the order without entering payment details again.`}
          />
        ) : null}

        {progress === "ready_for_payment" &&
        paymentIssue &&
        !canFinalizePaidPaymentSession(cart) ? (
          <section className="checkout-section" aria-labelledby="payment-status-title">
            <h2 id="payment-status-title">Payment status</h2>
            <p className="checkout-message checkout-message--error" role="alert">
              {paymentIssue === "pending_authorization"
                ? "Payment is awaiting provider authorization. Refresh checkout to reconcile it; do not enter payment details again."
                : paymentIssue === "error"
                  ? "The current payment session failed. Refresh checkout to recover it before trying again."
                  : paymentIssue === "authorized" || paymentIssue === "captured"
                    ? `Medusa reports this payment as ${paymentIssue}, but it no longer matches the current cart total or currency. Refresh checkout to reconcile it; do not enter payment details or finalize from this stale state.`
                  : `Medusa reports this payment as ${paymentIssue}. Refresh checkout to reconcile it before trying again.`}
            </p>
            <Link className="button-link button-link--secondary" href="/checkout">
              Refresh checkout
            </Link>
          </section>
        ) : null}

        {progress === "ready_for_payment" && !payment && !paymentIssue && paymentUnavailable ? (
          <section className="checkout-section" aria-labelledby="payment-unavailable-title">
            <h2 id="payment-unavailable-title">Payment temporarily unavailable</h2>
            <p className="checkout-message checkout-message--error" role="alert">
              Stripe payment could not be prepared. Your cart remains available; refresh checkout to try again.
            </p>
            <Link className="button-link button-link--secondary" href="/checkout">
              Refresh checkout
            </Link>
          </section>
        ) : null}
      </div>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
