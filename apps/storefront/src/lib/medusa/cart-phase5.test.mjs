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
  assert.equal(classifyCartError({ status: 404 }, "add"), "rejected")
  assert.equal(classifyCartError({ status: 409 }), "rejected")
  assert.equal(classifyCartError(new Error("connection refused")), "backend_unavailable")
  assert.deepEqual(getCartActionErrorMessage({ status: 409 }, "update"), {
    status: "error",
    message: "That quantity is not available. The cart was not changed.",
  })
  assert.deepEqual(getCartActionErrorMessage({ status: 404 }, "add"), {
    status: "error",
    message: "That item is currently unavailable in the requested quantity.",
  })
})

test("cartFields includes completed_at to detect completed carts", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("./cart.ts", import.meta.url), "utf8")
  const fieldsMatch = source.match(/const cartFields = "([^"]+)"/)
  assert.ok(fieldsMatch, "cart fields must remain explicit")
  const fields = fieldsMatch[1].split(",")
  assert.ok(fields.includes("completed_at"), "cart fields must request completed_at")
})

test("getOrCreateCart discards a completed cart and creates a new one", async () => {
  const { createModuleLoader } = await import("./test-support/load-module.mjs")
  const load = createModuleLoader(import.meta.url, { console: { error() {} } })
  let writtenId = null
  let cleared = false
  const fakeClient = {
    store: {
      cart: {
        retrieve: async (id) => ({
          cart: { id, completed_at: "2026-10-14T10:00:00.000Z", items: [] },
        }),
        create: async () => ({
          cart: { id: "cart_new", completed_at: null, items: [] },
        }),
      },
    },
  }
  const { getOrCreateCart } = load("./cart.ts", {
    "server-only": {},
    "./client": {
      getMedusaClient: () => fakeClient,
      getMedusaPricingContext: () => ({ region_id: "reg_1" }),
    },
    "./cart-cookie": {
      readCartId: async () => "cart_completed",
      writeCartId: async (id) => { writtenId = id },
      clearCartId: async () => { cleared = true },
    },
    "./cart-errors": {
      isStaleCartReferenceError: () => false,
      toCartOperationError: (err) => err,
      CartOperationError: class extends Error {},
    },
  })

  const cart = await getOrCreateCart()
  assert.equal(cart.id, "cart_new")
  assert.equal(writtenId, "cart_new")
})

test("readCartId sanitizes invalid or malicious cookie values", async () => {
  const { createModuleLoader } = await import("./test-support/load-module.mjs")
  const load = createModuleLoader(import.meta.url)

  let currentCookieValue = null
  const mockCookieStore = {
    get: (name) => (name === "retail_cart_id" ? { value: currentCookieValue } : undefined),
    set: () => {},
    delete: () => {},
  }

  const { readCartId } = load("./cart-cookie.ts", {
    "server-only": {},
    "next/headers": {
      cookies: async () => mockCookieStore,
    },
    "./cart-cookie-options": {
      createCartCookieOptions: () => ({}),
    },
    "./cart-validation": {
      getIdentifier,
    },
  })

  // Valid identifier passes
  currentCookieValue = "cart_01JABC123XYZ"
  assert.equal(await readCartId(), "cart_01JABC123XYZ")

  // Malicious path traversal / directory injection is rejected
  currentCookieValue = "../../admin"
  assert.equal(await readCartId(), null)

  // Injection with semicolon, space, or control chars is rejected
  currentCookieValue = "cart 123"
  assert.equal(await readCartId(), null)
  currentCookieValue = "bad;cookie"
  assert.equal(await readCartId(), null)

  // Empty or whitespace is rejected
  currentCookieValue = "   "
  assert.equal(await readCartId(), null)
  currentCookieValue = null
  assert.equal(await readCartId(), null)
})
