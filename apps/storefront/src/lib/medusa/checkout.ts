import "server-only"

import type { HttpTypes } from "@medusajs/types"

import { readCartId } from "./cart-cookie"
import {
  isStaleCheckoutReferenceError,
  logCheckoutFailure,
} from "./checkout-errors"
import { getMedusaClient } from "./client"

export const checkoutCartFields = "*items,*shipping_methods"

export type CheckoutCountry = {
  code: string
  name: string
}

export type CheckoutPageData =
  | { kind: "redirect" }
  | { kind: "unavailable" }
  | {
      kind: "available"
      cart: HttpTypes.StoreCart
      countries: CheckoutCountry[]
      shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
      shippingOptionsUnavailable: boolean
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

  return {
    kind: "available",
    cart,
    countries,
    shippingOptions,
    shippingOptionsUnavailable,
  }
}
