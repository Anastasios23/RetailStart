import "server-only"

import { cookies } from "next/headers"

import { createCartCookieOptions } from "./cart-cookie-options"

export const CART_COOKIE_NAME = "retail_cart_id"

export async function readCartId(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(CART_COOKIE_NAME)?.value?.trim()

  return value || null
}

export async function writeCartId(cartId: string): Promise<void> {
  const normalizedCartId = cartId.trim()

  if (!normalizedCartId) {
    throw new Error("Cannot persist an empty cart reference")
  }

  const cookieStore = await cookies()
  cookieStore.set(
    CART_COOKIE_NAME,
    normalizedCartId,
    createCartCookieOptions(process.env.NODE_ENV === "production")
  )
}
