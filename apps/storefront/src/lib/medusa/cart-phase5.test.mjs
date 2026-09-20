import assert from "node:assert/strict"
import test from "node:test"

const { createCartCookieOptions } = await import("./cart-cookie-options.ts")
const { getIdentifier, getPositiveSafeInteger } = await import("./cart-validation.ts")
const { classifyCartError, getCartActionErrorMessage } = await import("./cart-errors.ts")

test("cart cookie options are session-scoped and environment-aware", () => {
  assert.deepEqual(createCartCookieOptions(false), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  })
  assert.equal(createCartCookieOptions(true).secure, true)
})

test("cart mutation validation accepts identifiers and positive safe integers only", () => {
  assert.equal(getIdentifier("variant_123"), "variant_123")
  assert.equal(getIdentifier(""), null)
  assert.equal(getIdentifier("variant with spaces"), null)
  assert.equal(getIdentifier(new File(["variant_123"], "id.txt")), null)
  assert.equal(getPositiveSafeInteger("1"), 1)
  assert.equal(getPositiveSafeInteger(" 4 "), 4)
  assert.equal(getPositiveSafeInteger("0"), null)
  assert.equal(getPositiveSafeInteger("1.5"), null)
  assert.equal(getPositiveSafeInteger(String(Number.MAX_SAFE_INTEGER + 1)), null)
})

test("cart error mapping keeps backend details out of UI outcomes", () => {
  assert.equal(classifyCartError({ status: 404 }), "stale_reference")
  assert.equal(classifyCartError({ status: 409 }), "rejected")
  assert.equal(classifyCartError(new Error("connection refused")), "backend_unavailable")
  assert.deepEqual(getCartActionErrorMessage({ status: 409 }, "update"), {
    status: "error",
    message: "That quantity is not available. The cart was not changed.",
  })
})
