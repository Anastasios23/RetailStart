"use server"

import { revalidatePath } from "next/cache"

import { clearCartId, readCartId } from "../../lib/medusa/cart-cookie"
import { getCheckoutActionErrorMessage } from "../../lib/medusa/checkout-errors"
import {
  getAvailableShippingOptions,
  getCheckoutCountries,
  retrieveCheckoutCart,
  retrieveCompletedCheckoutConfirmation,
} from "../../lib/medusa/checkout"
import { getMedusaClient } from "../../lib/medusa/client"
import {
  canClearCartForResult,
  projectCheckoutConfirmation,
  type CheckoutConfirmation,
} from "../../lib/medusa/checkout-payment"
import { getIdentifier } from "../../lib/medusa/cart-validation"
import {
  hasStoredCheckoutContact,
  validateCheckoutContact,
} from "../../lib/medusa/checkout-validation"
import type { CheckoutActionState } from "./checkout-action-state"

// These mutations intentionally remain same-origin Next.js Server Actions.
// No broad allowedOrigins or separate CSRF token boundary is introduced; the
// HttpOnly cart cookie and the supported Next.js origin/host protections remain
// the request boundary for this guest-only phase.

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
    return errorState("Choose an available shipping option.")
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
      return errorState("Save your contact and delivery details before choosing shipping.")
    }

    const options = await getAvailableShippingOptions(cartId)

    if (!options.some((option) => option.id === optionId)) {
      return errorState("That shipping option is no longer available. Refresh and choose another option.")
    }

    const client = getMedusaClient()

    await client.store.cart.addShippingMethod(
      cartId,
      { option_id: optionId },
      { fields: "*items,*shipping_methods" }
    )

    revalidatePath("/checkout")
    revalidatePath("/cart")

    return {
      status: "success",
      message: "Shipping method saved.",
    }
  } catch (error) {
    return getCheckoutActionErrorMessage(error, "shipping-method")
  }
}

export async function completeCheckoutAction(
  _previousState: CheckoutActionState,
  _formData: FormData
): Promise<CheckoutActionState> {
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

export async function clearCompletedCartAction(
  expectedConfirmation: CheckoutConfirmation
): Promise<void> {
  const cartId = await readCartId()

  if (!cartId) {
    return
  }

  try {
    const confirmation = await retrieveCompletedCheckoutConfirmation(cartId)

    if (
      confirmation.displayId !== expectedConfirmation.displayId ||
      confirmation.customDisplayId !== expectedConfirmation.customDisplayId ||
      confirmation.total !== expectedConfirmation.total ||
      confirmation.currencyCode !== expectedConfirmation.currencyCode
    ) {
      return
    }

    await clearCartId()
  } catch {
    // Retain the continuity reference until Medusa confirms its completed order.
  }
}
