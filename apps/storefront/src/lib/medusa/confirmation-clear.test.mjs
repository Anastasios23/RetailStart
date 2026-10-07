import assert from "node:assert/strict"
import test from "node:test"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })
const appOrigin = "http://localhost:8000"

// Boundary around the Route Handler: cookie store and Medusa lookup are stubs
// that record every call, so "no mutation" assertions are meaningful.
function handler({ cartId = "cart_1", lookup = async () => ({ displayId: 1 }) } = {}) {
  const calls = { read: 0, lookup: [], clear: 0 }
  const { POST } = load("../../app/checkout/confirmation/clear/route.ts", {
    "../../../../lib/medusa/cart-cookie": {
      readCartId: async () => { calls.read++; return cartId },
      clearCartId: async () => { calls.clear++ },
    },
    "../../../../lib/medusa/checkout": {
      retrieveCompletedCheckoutConfirmation: async (id) => { calls.lookup.push(id); return lookup(id) },
    },
  })
  const request = (origin) => ({
    headers: new Headers(origin === undefined ? {} : { origin }),
    nextUrl: { origin: appOrigin },
  })
  return { POST, calls, request }
}

test("same-origin request with a verified completed cart clears the cookie once", async () => {
  const { POST, calls, request } = handler()
  const response = await POST(request(appOrigin))
  assert.equal(response.status, 204)
  assert.deepEqual(calls.lookup, ["cart_1"])
  assert.equal(calls.clear, 1)
  assert.equal(response.headers.get("cache-control"), "no-store")
})

test("Origin is compared after normalization, not as a raw string", async () => {
  const { POST, calls, request } = handler()
  const response = await POST(request(`${appOrigin}/`))
  assert.equal(response.status, 204)
  assert.equal(calls.clear, 1)
})

test("absent cookie returns 204 without a lookup or a clear", async () => {
  const { POST, calls, request } = handler({ cartId: null })
  const response = await POST(request(appOrigin))
  assert.equal(response.status, 204)
  assert.equal(calls.lookup.length, 0)
  assert.equal(calls.clear, 0)
})

test("failed authoritative verification keeps the cookie and is not a 2xx", async () => {
  const { POST, calls, request } = handler({ lookup: async () => { throw new Error("not completed") } })
  const response = await POST(request(appOrigin))
  assert.equal(response.status, 502)
  assert.equal(calls.lookup.length, 1)
  assert.equal(calls.clear, 0)
})

test("cross-origin, missing and malformed Origin are rejected before any cookie or Medusa access", async () => {
  for (const origin of [
    "https://evil.example",
    "http://localhost:8001",
    "https://localhost:8000",
    "null",
    "not a url",
    "",
    undefined,
  ]) {
    const { POST, calls, request } = handler()
    const response = await POST(request(origin))
    assert.equal(response.status, 403, String(origin))
    assert.equal(calls.read, 0, String(origin))
    assert.equal(calls.lookup.length, 0, String(origin))
    assert.equal(calls.clear, 0, String(origin))
  }
})
