"use server"

import { revalidatePath } from "next/cache"

import { readCartId } from "../../lib/medusa/cart-cookie"
import { getCheckoutActionErrorMessage } from "../../lib/medusa/checkout-errors"
import {
  getAvailableShippingOptions,
  getCheckoutCountries,
  retrieveCheckoutCart,
} from "../../lib/medusa/checkout"
import { getMedusaClient } from "../../lib/medusa/client"
import {
  canClearCartForResult,
  canCompleteCheckoutPaymentSession,
  canFinalizePaidPaymentSession,
  projectCheckoutConfirmation,
} from "../../lib/medusa/checkout-payment"
import { getIdentifier } from "../../lib/medusa/cart-validation"
import {
  hasStoredCheckoutContact,
  validateCheckoutContact,
} from "../../lib/medusa/checkout-validation"
import {
  isKayiaAcsPoint,
  isKayiaLocalDelivery,
  isKayiaPickup,
  isPostalCodeInLocalZone,
  KAYIA_PHARMACY_ADDRESS,
  resolveKayiaShippingMethod,
} from "../../lib/presentation/kayia-shipping"
import type { CheckoutActionState } from "./checkout-action-state"

// Checkout and other business mutations intentionally remain same-origin
// Next.js Server Actions. No broad allowedOrigins or separate CSRF token
// boundary is introduced; the HttpOnly cart cookie and the supported Next.js
// origin/host protections remain the request boundary for this guest-only phase.
// The only exception is the narrowly scoped confirmation cleanup Route Handler
// (app/checkout/confirmation/clear/route.ts), which removes the guest continuity
// cookie only after authoritative completed-order verification. It is not a
// Server Action because a cookie change in an action re-renders the page.

function errorState(message: string): CheckoutActionState {
  return { status: "error", message }
}

export async function updateCheckoutContactAction(
  _previousState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  const cartId = await readCartId()

  if (!cartId) {
    return errorState("This guest cart is no longer available. Return to the cart and try again.")
  }

  try {
    const cart = await retrieveCheckoutCart(cartId)

    if (!cart.items?.length) {
      return errorState("This cart is empty. Add an item before continuing to checkout.")
    }

    const countries = await getCheckoutCountries(cart)
    const validation = validateCheckoutContact(
      formData,
      countries.map((country) => country.code)
    )

    if (!validation.ok) {
      return {
        status: "error",
        message: "Check the highlighted checkout fields.",
        fieldErrors: validation.fieldErrors,
      }
    }

    const client = getMedusaClient()
    const address = validation.value.address

    await client.store.cart.update(
      cartId,
      {
        email: validation.value.email,
        shipping_address: address,
        billing_address: address,
      },
      { fields: "*items,*shipping_methods" }
    )

    revalidatePath("/checkout")
    revalidatePath("/cart")

    return {
      status: "success",
      message: "Contact and delivery details saved.",
    }
  } catch (error) {
    return getCheckoutActionErrorMessage(error, "address")
  }
}

export async function selectShippingMethodAction(
  _previousState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  const optionId = getIdentifier(formData.get("shippingOptionId"))

  if (!optionId) {
    return errorState("Επίλεξε διαθέσιμη μέθοδο αποστολής.")
  }

  const cartId = await readCartId()

  if (!cartId) {
    return errorState("This guest cart is no longer available. Return to the cart and try again.")
  }

  try {
    const cart = await retrieveCheckoutCart(cartId)

    if (!cart.items?.length) {
      return errorState("This cart is empty. Add an item before continuing to checkout.")
    }

    if (!hasStoredCheckoutContact(cart.email, cart.shipping_address)) {
      return errorState("Αποθήκευσε στοιχεία επικοινωνίας και διεύθυνση πριν την αποστολή.")
    }

    const options = await getAvailableShippingOptions(cartId)
    const selected = options.find((option) => option.id === optionId)

    if (!selected) {
      return errorState("Αυτή η μέθοδος αποστολής δεν είναι πλέον διαθέσιμη. Ανανέωσε τη σελίδα.")
    }

    const method = resolveKayiaShippingMethod(selected)
    const acsPickupPoint =
      typeof formData.get("acs_pickup_point") === "string"
        ? formData.get("acs_pickup_point")!.toString().trim()
        : ""

    if (isKayiaAcsPoint(method) && acsPickupPoint.length < 3) {
      return errorState("Συμπλήρωσε το σημείο ACS (όνομα ή διεύθυνση σημείου).")
    }

    if (isKayiaLocalDelivery(method)) {
      const postal = cart.shipping_address?.postal_code
      if (!isPostalCodeInLocalZone(postal)) {
        return errorState(
          "Ο Τ.Κ. δεν ανήκει στη ζώνη τοπικής παράδοσης. Επίλεξε παράδοση Κύπρου ή ACS."
        )
      }
    }

    const client = getMedusaClient()
    const existingMetadata =
      cart.metadata && typeof cart.metadata === "object" && !Array.isArray(cart.metadata)
        ? { ...cart.metadata }
        : {}

    const nextMetadata: Record<string, unknown> = {
      ...existingMetadata,
      kayia_shipping_method: method,
    }

    if (isKayiaAcsPoint(method)) {
      nextMetadata.acs_pickup_point = acsPickupPoint
    } else {
      delete nextMetadata.acs_pickup_point
    }

    const addressUpdate = isKayiaPickup(method)
      ? {
          shipping_address: { ...KAYIA_PHARMACY_ADDRESS },
          billing_address: {
            first_name: cart.shipping_address?.first_name || KAYIA_PHARMACY_ADDRESS.first_name,
            last_name: cart.shipping_address?.last_name || KAYIA_PHARMACY_ADDRESS.last_name,
            address_1: cart.shipping_address?.address_1 || KAYIA_PHARMACY_ADDRESS.address_1,
            city: cart.shipping_address?.city || KAYIA_PHARMACY_ADDRESS.city,
            postal_code: cart.shipping_address?.postal_code || KAYIA_PHARMACY_ADDRESS.postal_code,
            country_code: cart.shipping_address?.country_code || KAYIA_PHARMACY_ADDRESS.country_code,
          },
        }
      : {}

    await client.store.cart.update(
      cartId,
      {
        metadata: nextMetadata,
        ...addressUpdate,
      },
      { fields: "*items,*shipping_methods,*shipping_address" }
    )

    await client.store.cart.addShippingMethod(
      cartId,
      { option_id: optionId },
      { fields: "*items,*shipping_methods" }
    )

    revalidatePath("/checkout")
    revalidatePath("/cart")

    return {
      status: "success",
      message: "Η μέθοδος αποστολής αποθηκεύτηκε.",
    }
  } catch (error) {
    return getCheckoutActionErrorMessage(error, "shipping-method")
  }
}

// Shared completion. `finalizeOnly` re-checks, on the cart read at completion
// time, that the paid Stripe session still matches the cart before cart.complete.
async function completeCheckout(finalizeOnly: boolean): Promise<CheckoutActionState> {
  const cartId = await readCartId()

  if (!cartId) {
    return {
      status: "error",
      message: "This guest cart is no longer available. Return to the cart and try again.",
      paymentState: "pending",
    }
  }

  try {
    const cart = await retrieveCheckoutCart(cartId)

    if (
      !cart.items?.length ||
      !hasStoredCheckoutContact(cart.email, cart.shipping_address) ||
      !hasStoredCheckoutContact(cart.email, cart.billing_address) ||
      !cart.shipping_methods?.length
    ) {
      return {
        status: "error",
        message: "Finish the contact, address, and shipping steps before paying.",
        paymentState: "pending",
      }
    }

    if (finalizeOnly) {
      if (!canFinalizePaidPaymentSession(cart)) {
        return {
          status: "error",
          message:
            "Your payment session changed and can no longer be finalized. Refresh checkout so the current payment state can be reconciled.",
          paymentState: "pending",
        }
      }
    } else {
      if (!canCompleteCheckoutPaymentSession(cart)) {
        return {
          status: "error",
          message:
            "Your payment session is not ready for completion. Return to checkout and confirm your payment details.",
          paymentState: "pending",
        }
      }
    }

    const client = getMedusaClient()
    const result = await client.store.cart.complete(cartId, {
      fields: "display_id,custom_display_id,currency_code,*summary",
    })

    if (!canClearCartForResult(result)) {
      return {
        status: "error",
        message: "Payment is still being confirmed. Your cart remains available; try again shortly.",
        paymentState: "pending",
      }
    }

    const confirmation = projectCheckoutConfirmation(result.order)
    return {
      status: "success",
      message: "Payment received and order placed.",
      confirmation,
      paymentState: "ready",
    }
  } catch (error) {
    return {
      ...getCheckoutActionErrorMessage(error, "payment"),
      paymentState: "pending",
    }
  }
}

// Normal completion, used right after a successful Stripe confirmPayment.
export async function completeCheckoutAction(
  _previousState: CheckoutActionState,
  _formData: FormData
): Promise<CheckoutActionState> {
  return completeCheckout(false)
}

// Finalize-only completion for an already authorized/captured session; requires
// the freshly read cart to still pass canFinalizePaidPaymentSession.
export async function finalizeCheckoutAction(
  _previousState: CheckoutActionState,
  _formData: FormData
): Promise<CheckoutActionState> {
  return completeCheckout(true)
}
