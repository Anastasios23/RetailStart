import "server-only"

import type { HttpTypes } from "@medusajs/types"

import { getMedusaClient, getMedusaPricingContext } from "./client"
import {
  CartOperationError,
  isStaleCartReferenceError,
  toCartOperationError,
} from "./cart-errors"
import { readCartId, writeCartId } from "./cart-cookie"

const cartFields = "*items"

export type CurrentCartResult =
  | { kind: "missing" | "stale" }
  | { kind: "unavailable" }
  | { kind: "available"; cart: HttpTypes.StoreCart }

function logCartFailure(operation: string, error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined

  console.error("Medusa Store API cart operation failed", {
    operation,
    errorName: error instanceof Error ? error.name : "UnknownError",
    status,
  })
}

async function retrieveCart(cartId: string): Promise<HttpTypes.StoreCart> {
  const client = getMedusaClient()
  const response = await client.store.cart.retrieve(cartId, { fields: cartFields })

  return response.cart
}

async function createCart(): Promise<HttpTypes.StoreCart> {
  try {
    const client = getMedusaClient()
    const { region_id: regionId } = getMedusaPricingContext()
    const response = await client.store.cart.create(
      { region_id: regionId },
      { fields: cartFields }
    )

    await writeCartId(response.cart.id)
    return response.cart
  } catch (error) {
    logCartFailure("create", error)
    throw toCartOperationError(error, "create")
  }
}

export async function getCurrentCart(): Promise<CurrentCartResult> {
  const cartId = await readCartId()

  if (!cartId) {
    return { kind: "missing" }
  }

  try {
    return { kind: "available", cart: await retrieveCart(cartId) }
  } catch (error) {
    if (isStaleCartReferenceError(error)) {
      return { kind: "stale" }
    }

    logCartFailure("retrieve", error)
    return { kind: "unavailable" }
  }
}

export async function getOrCreateCart(): Promise<HttpTypes.StoreCart> {
  const cartId = await readCartId()

  if (cartId) {
    try {
      return await retrieveCart(cartId)
    } catch (error) {
      if (!isStaleCartReferenceError(error)) {
        logCartFailure("retrieve-before-create", error)
        throw new CartOperationError("retrieve", "backend_unavailable")
      }
    }
  }

  return createCart()
}

export async function addLineItem(
  variantId: string,
  quantity: number
): Promise<HttpTypes.StoreCart> {
  const cart = await getOrCreateCart()

  try {
    const client = getMedusaClient()
    const response = await client.store.cart.createLineItem(
      cart.id,
      { variant_id: variantId, quantity },
      { fields: cartFields }
    )

    return response.cart
  } catch (error) {
    logCartFailure("add-line-item", error)
    throw toCartOperationError(error, "add")
  }
}

async function requireCartId(
  operation: "update" | "remove"
): Promise<string> {
  const cartId = await readCartId()

  if (!cartId) {
    throw new CartOperationError(operation, "no_cart")
  }

  return cartId
}

export async function updateLineItem(
  lineItemId: string,
  quantity: number
): Promise<HttpTypes.StoreCart> {
  const cartId = await requireCartId("update")

  try {
    const client = getMedusaClient()
    const response = await client.store.cart.updateLineItem(
      cartId,
      lineItemId,
      { quantity },
      { fields: cartFields }
    )

    return response.cart
  } catch (error) {
    logCartFailure("update-line-item", error)
    throw toCartOperationError(error, "update")
  }
}

export async function removeLineItem(lineItemId: string): Promise<void> {
  const cartId = await requireCartId("remove")

  try {
    const client = getMedusaClient()
    await client.store.cart.deleteLineItem(
      cartId,
      lineItemId,
      { fields: cartFields }
    )

    return
  } catch (error) {
    logCartFailure("remove-line-item", error)
    throw toCartOperationError(error, "remove")
  }
}
