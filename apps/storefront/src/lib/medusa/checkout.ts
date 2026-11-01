import "server-only"

import type { HttpTypes } from "@medusajs/types"

import { readCartId } from "./cart-cookie"
import {
  isStaleCheckoutReferenceError,
  logCheckoutFailure,
} from "./checkout-errors"
import {
  classifyStripePaymentSession,
  projectStripePaymentSession,
  STRIPE_PROVIDER_ID,
  type CheckoutPaymentIssue,
  type CheckoutPaymentProjection,
  type CheckoutConfirmation,
  projectCheckoutConfirmation,
} from "./checkout-payment"
import { hasStoredCheckoutContact } from "./checkout-validation"
import { getMedusaClient } from "./client"

export const checkoutCartFields = "region_id,email,currency_code,item_subtotal,item_tax_total,shipping_subtotal,shipping_tax_total,shipping_total,tax_total,subtotal,total,metadata,*shipping_address,*billing_address,*items,*shipping_methods,*payment_collection,*payment_collection.payment_sessions,completed_at"

export type CheckoutCountry = {
  code: string
  name: string
}

export type CheckoutPageData =
  | { kind: "redirect" }
  | { kind: "unavailable" }
  | { kind: "reconciliation-unavailable" }
  | { kind: "confirmation"; confirmation: CheckoutConfirmation }
  | {
      kind: "available"
      cart: HttpTypes.StoreCart
      countries: CheckoutCountry[]
      shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
      shippingOptionsUnavailable: boolean
      payment: CheckoutPaymentProjection | null
      paymentUnavailable: boolean
      paymentIssue: CheckoutPaymentIssue | null
      publishableKey: string | null
    }

export async function retrieveCheckoutCart(cartId: string): Promise<HttpTypes.StoreCart> {
  const client = getMedusaClient()
  const response = await client.store.cart.retrieve(cartId, {
    fields: checkoutCartFields,
  })

  return response.cart
}

export async function getCheckoutCountries(
  cart: HttpTypes.StoreCart
): Promise<CheckoutCountry[]> {
  if (!cart.region_id) {
    throw new Error("Checkout cart has no region")
  }

  const client = getMedusaClient()
  const response = await client.store.region.retrieve(cart.region_id, {
    fields: "id,*countries",
  })
  const countries = response.region.countries ?? []

  return countries.flatMap((country) => {
    const code = country.iso_2?.trim().toUpperCase()

    if (!code) {
      return []
    }

    return [
      {
        code,
        name: country.display_name?.trim() || country.name?.trim() || code,
      },
    ]
  })
}

export async function getAvailableShippingOptions(
  cartId: string
): Promise<HttpTypes.StoreCartShippingOptionWithServiceZone[]> {
  const client = getMedusaClient()
  const response = await client.store.fulfillment.listCartOptions({
    cart_id: cartId,
  })

  return response.shipping_options
}

function hasPaymentPrerequisites(cart: HttpTypes.StoreCart): boolean {
  return Boolean(
    cart.email &&
      hasStoredCheckoutContact(cart.email, cart.shipping_address) &&
      hasStoredCheckoutContact(cart.email, cart.billing_address) &&
      cart.shipping_methods?.length
  )
}

export async function initializeStripePaymentSession(
  cart: HttpTypes.StoreCart
): Promise<
  | { kind: "ready"; payment: CheckoutPaymentProjection }
  | { kind: "reconcile"; status: CheckoutPaymentIssue }
  | { kind: "failed"; status: "error" }
> {
  if (!cart.region_id || !hasPaymentPrerequisites(cart)) {
    throw new Error("Checkout payment prerequisites are incomplete")
  }

  const client = getMedusaClient()
  const response = await client.client.fetch<{
    state: "ready" | "reconcile" | "failed"
    issue?: CheckoutPaymentIssue
    payment: {
      paymentCollectionId: string
      paymentCollectionStatus: string
      paymentSessionId: string
      providerId: typeof STRIPE_PROVIDER_ID
      sessionStatus: string
      amount: number
      currencyCode: string
      clientSecret?: string
    } | null
  }>(`/store/carts/${encodeURIComponent(cart.id)}/payment-session`, {
    method: "POST",
    body: { provider_id: STRIPE_PROVIDER_ID },
  })

  if (response.state === "ready" && response.payment?.clientSecret) {
    return {
      kind: "ready",
      payment: {
        paymentCollectionId: response.payment.paymentCollectionId,
        paymentCollectionStatus: response.payment.paymentCollectionStatus,
        paymentSessionId: response.payment.paymentSessionId,
        providerId: response.payment.providerId,
        sessionStatus: response.payment.sessionStatus,
        clientSecret: response.payment.clientSecret,
      },
    }
  }

  if (
    response.state === "reconcile" &&
    response.issue &&
    response.issue !== "error"
  ) {
    return { kind: "reconcile", status: response.issue }
  }

  return { kind: "failed", status: "error" }
}

export async function getCheckoutPageData(): Promise<CheckoutPageData> {
  const cartId = await readCartId()

  if (!cartId) {
    return { kind: "redirect" }
  }

  let cart: HttpTypes.StoreCart

  try {
    cart = await retrieveCheckoutCart(cartId)
  } catch (error) {
    if (isStaleCheckoutReferenceError(error)) {
      return { kind: "redirect" }
    }

    logCheckoutFailure("retrieve", error)
    return { kind: "unavailable" }
  }

  if (cart.completed_at) {
    try {
      return {
        kind: "confirmation",
        confirmation: await retrieveCompletedCheckoutConfirmation(cartId),
      }
    } catch (error) {
      logCheckoutFailure("completed-order", error)
      return { kind: "reconciliation-unavailable" }
    }
  }

  if (!cart.items?.length) {
    return { kind: "redirect" }
  }

  let countries: CheckoutCountry[]

  try {
    countries = await getCheckoutCountries(cart)
  } catch (error) {
    logCheckoutFailure("region", error)
    return { kind: "unavailable" }
  }

  if (countries.length === 0) {
    console.error("Medusa checkout region has no allowed countries", {
      regionId: cart.region_id,
    })
    return { kind: "unavailable" }
  }

  let shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[] = []
  let shippingOptionsUnavailable = false

  if (cart.shipping_address && cart.email) {
    try {
      shippingOptions = await getAvailableShippingOptions(cartId)
    } catch (error) {
      logCheckoutFailure("shipping-options", error)
      shippingOptionsUnavailable = true
    }
  }

  let payment: CheckoutPaymentProjection | null = null
  let paymentUnavailable = false
  let paymentIssue: CheckoutPaymentIssue | null = null

  if (hasPaymentPrerequisites(cart)) {
    try {
      const decision = classifyStripePaymentSession(cart)

      if (decision.kind === "reuse") {
        payment = projectStripePaymentSession(cart.payment_collection!, decision.session)
      } else if (decision.kind === "initialize") {
        // Includes reason "stale" (amount/total drift): POST payment-session refreshes
        // the collection and returns a new client secret. Do not reuse the prior secret.
        const prepared = await initializeStripePaymentSession(cart)

        if (prepared.kind === "ready") {
          payment = prepared.payment
        } else {
          paymentIssue = prepared.status
        }
      } else if (decision.kind === "reconcile") {
        paymentIssue = decision.status
      } else {
        paymentIssue = decision.status
      }
    } catch (error) {
      logCheckoutFailure("payment-session", error)
      paymentUnavailable = true
    }
  }

  return {
    kind: "available",
    cart,
    countries,
    shippingOptions,
    shippingOptionsUnavailable,
    payment,
    paymentUnavailable,
    paymentIssue,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null,
  }
}

export async function retrieveCompletedCheckoutConfirmation(
  cartId: string
): Promise<CheckoutConfirmation> {
  const client = getMedusaClient()
  const response = await client.client.fetch<{
    confirmation: Parameters<typeof projectCheckoutConfirmation>[0]
  }>(`/store/carts/${encodeURIComponent(cartId)}/completed-order`)

  return projectCheckoutConfirmation(response.confirmation)
}
