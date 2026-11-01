"use server"

import { revalidatePath } from "next/cache"

import { getCartActionErrorMessage } from "../../lib/medusa/cart-errors"
import {
  addLineItem,
  removeLineItem,
  updateLineItem,
} from "../../lib/medusa/cart"
import { getIdentifier, getPositiveSafeInteger } from "../../lib/medusa/cart-validation"
import type { CartActionState } from "./cart-action-state"

function invalidInput(message: string): CartActionState {
  return { status: "error", message }
}

export async function addItemAction(
  _previousState: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const variantId = getIdentifier(formData.get("variantId"))
  const quantity = getPositiveSafeInteger(formData.get("quantity"))

  if (!variantId) {
    return invalidInput("Αυτό το προϊόν δεν είναι διαθέσιμο.")
  }

  if (quantity === null) {
    return invalidInput("Δώστε έγκυρη ποσότητα μεγαλύτερη από μηδέν.")
  }

  try {
    await addLineItem(variantId, quantity)
    revalidatePath("/cart")

    return { status: "success", message: "Προστέθηκε στο καλάθι." }
  } catch (error) {
    return getCartActionErrorMessage(error, "add")
  }
}

/**
 * Legacy Wolt-mirror add-to-cart. Disabled by ADR-0154: browse/cart use Medusa
 * variants only via `addItemAction`.
 */
export async function addCatalogItemAction(
  _previousState: CartActionState,
  _formData: FormData
): Promise<CartActionState> {
  return invalidInput(
    "Αυτό το προϊόν δεν είναι διαθέσιμο από τον κατάλογο του καταστήματος."
  )
}

export async function updateItemAction(
  _previousState: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const lineItemId = getIdentifier(formData.get("lineItemId"))
  const quantity = getPositiveSafeInteger(formData.get("quantity"))

  if (!lineItemId) {
    return invalidInput("This cart item is not available.")
  }

  if (quantity === null) {
    return invalidInput("Enter a valid quantity greater than zero.")
  }

  try {
    await updateLineItem(lineItemId, quantity)
    revalidatePath("/cart")

    return { status: "success", message: "Cart quantity updated." }
  } catch (error) {
    return getCartActionErrorMessage(error, "update")
  }
}

export async function removeItemAction(
  _previousState: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const lineItemId = getIdentifier(formData.get("lineItemId"))

  if (!lineItemId) {
    return invalidInput("This cart item is not available.")
  }

  try {
    await removeLineItem(lineItemId)
    revalidatePath("/cart")

    return { status: "success", message: "Item removed from cart." }
  } catch (error) {
    return getCartActionErrorMessage(error, "remove")
  }
}
