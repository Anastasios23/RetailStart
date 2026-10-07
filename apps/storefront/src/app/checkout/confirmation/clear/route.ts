import { NextResponse, type NextRequest } from "next/server"

import { clearCartId, readCartId } from "../../../../lib/medusa/cart-cookie"
import { retrieveCompletedCheckoutConfirmation } from "../../../../lib/medusa/checkout"

// Clears the guest continuity cookie after the confirmation page has rendered.
// This is a Route Handler, not a Server Action, on purpose: changing a cookie in
// a Server Action re-renders the current page, and the confirmation page calls
// notFound() once the cookie is gone. It performs no payment or order mutation.

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Reject before touching the cart cookie or Medusa.
  if (!isSameOrigin(request)) {
    return new NextResponse(null, { status: 403, headers: noStore })
  }

  const cartId = await readCartId()

  if (!cartId) {
    return new NextResponse(null, { status: 204, headers: noStore })
  }

  try {
    // Medusa's completed-order lookup for this cart is the authority.
    await retrieveCompletedCheckoutConfirmation(cartId)
  } catch {
    // Retain the continuity cookie until Medusa confirms the completed order.
    return new NextResponse(null, { status: 502, headers: noStore })
  }

  await clearCartId()

  return new NextResponse(null, { status: 204, headers: noStore })
}
