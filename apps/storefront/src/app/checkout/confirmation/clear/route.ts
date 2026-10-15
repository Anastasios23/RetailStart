import { NextResponse, type NextRequest } from "next/server"

import { clearCartId, readCartId } from "../../../../lib/medusa/cart-cookie"
import { retrieveCompletedCheckoutConfirmation } from "../../../../lib/medusa/checkout"
import type { CheckoutConfirmation } from "../../../../lib/medusa/checkout-payment"

// Clears the guest continuity cookie after the confirmation page has rendered.
// This is a Route Handler, not a Server Action, on purpose: changing a cookie in
// a Server Action re-renders the current page, and the confirmation page calls
// notFound() once the cookie is gone. It performs no payment or order mutation.
//
// The posted confirmation is NOT commerce authority. It only binds the cleanup
// to the confirmation that initiated it, so a stale tab cannot clear the cookie
// of a newer cart. Medusa's completed-order lookup remains the authority.

const noStore = { "Cache-Control": "no-store" }

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")

  if (!origin) {
    return false
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

function parseExpectedConfirmation(value: unknown): CheckoutConfirmation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const { displayId, customDisplayId, total, currencyCode } = value as Record<string, unknown>

  if (typeof total !== "number" || !Number.isFinite(total)) {
    return null
  }

  if (typeof currencyCode !== "string" || !currencyCode.trim()) {
    return null
  }

  if (
    displayId !== undefined &&
    displayId !== null &&
    (typeof displayId !== "number" || !Number.isFinite(displayId))
  ) {
    return null
  }

  if (
    customDisplayId !== undefined &&
    customDisplayId !== null &&
    typeof customDisplayId !== "string"
  ) {
    return null
  }

  const normalizedDisplayId =
    typeof displayId === "number" && Number.isFinite(displayId) ? displayId : undefined
  const normalizedCustomDisplayId =
    typeof customDisplayId === "string" ? customDisplayId : undefined

  return {
    displayId: normalizedDisplayId,
    customDisplayId: normalizedCustomDisplayId,
    total,
    currencyCode,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Reject before touching the body, the cart cookie or Medusa.
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403, headers: noStore })
  }

  let expected: CheckoutConfirmation | null

  try {
    expected = parseExpectedConfirmation(await request.json())
  } catch {
    expected = null
  }

  if (!expected) {
    return new NextResponse(null, { status: 400, headers: noStore })
  }

  const cartId = await readCartId()

  if (!cartId) {
    return new NextResponse(null, { status: 204, headers: noStore })
  }

  let confirmation: CheckoutConfirmation

  try {
    // Medusa's completed-order lookup for the cookie's cart is the authority.
    confirmation = await retrieveCompletedCheckoutConfirmation(cartId)
  } catch {
    // Retain the continuity cookie until Medusa confirms the completed order.
    return new NextResponse(null, { status: 502, headers: noStore })
  }

  if (
    (confirmation.displayId ?? undefined) !== (expected.displayId ?? undefined) ||
    (confirmation.customDisplayId ?? undefined) !== (expected.customDisplayId ?? undefined) ||
    confirmation.total !== expected.total ||
    confirmation.currencyCode !== expected.currencyCode
  ) {
    // The cookie now points at a different completed order than the page that
    // asked for cleanup (for example a stale tab); leave it alone.
    return new NextResponse(null, { status: 409, headers: noStore })
  }

  // Known limitation: a cookie deletion matches by name, domain and path only,
  // so it cannot be conditional on the value. The cookie seen above is the
  // request's snapshot, not the browser's current jar. If another tab creates a
  // new cart and its Set-Cookie is applied while this request is in flight, this
  // deletion can remove that newer cookie too (the new cart then looks empty and
  // can be re-added). The window is the lookup time and the cost is a lost cart
  // reference; no payment or order is affected. The removed Server Action had
  // the same property. Accepted rather than adding a second mechanism.
  await clearCartId()

  return new NextResponse(null, { status: 204, headers: noStore })
}
