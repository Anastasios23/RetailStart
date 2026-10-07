import assert from "node:assert/strict"
import test from "node:test"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })
const appOrigin = "http://localhost:8000"

const confirmationA = { displayId: 17, customDisplayId: "A-17", total: 30, currencyCode: "eur" }
const confirmationB = { displayId: 18, customDisplayId: "B-18", total: 45, currencyCode: "eur" }

// Boundary around the Route Handler: cookie store and Medusa lookup are stubs
// that record every call, so "no mutation" assertions are meaningful. `cartId`
// is the current cookie; `lookup` is the authoritative completed-order lookup.
function handler({ cartId = "cart_A", lookup = async () => confirmationA } = {}) {
  const calls = { json: 0, read: 0, lookup: [], clear: 0 }
  const { POST } = load("../../app/checkout/confirmation/clear/route.ts", {
    "../../../../lib/medusa/cart-cookie": {
      readCartId: async () => { calls.read++; return cartId },
      clearCartId: async () => { calls.clear++ },
    },
    "../../../../lib/medusa/checkout": {
      retrieveCompletedCheckoutConfirmation: async (id) => { calls.lookup.push(id); return lookup(id) },
    },
  })
  // `body` may be a value, or a function that throws to model unparsable JSON.
  // Arguments are positional so an explicit `undefined` (absent Origin) is not
  // replaced by a default.
  const request = (...args) => {
    const origin = args.length > 0 ? args[0] : appOrigin
    const body = args.length > 1 ? args[1] : confirmationA
    return {
      headers: new Headers(origin === undefined ? {} : { origin }),
      nextUrl: { origin: appOrigin },
      json: async () => { calls.json++; if (typeof body === "function") return body(); return body },
    }
  }
  return { POST, calls, request }
}

test("same-origin request with a matching verified confirmation clears the cookie once", async () => {
  const { POST, calls, request } = handler()
  const response = await POST(request())
  assert.equal(response.status, 204)
  assert.deepEqual(calls.lookup, ["cart_A"])
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
  const response = await POST(request())
  assert.equal(response.status, 204)
  assert.equal(calls.lookup.length, 0)
  assert.equal(calls.clear, 0)
})

test("failed authoritative verification keeps the cookie and is not a 2xx", async () => {
  const { POST, calls, request } = handler({ lookup: async () => { throw new Error("not completed") } })
  const response = await POST(request())
  assert.equal(response.status, 502)
  assert.equal(calls.lookup.length, 1)
  assert.equal(calls.clear, 0)
})

test("stale tab: request says confirmation A but the cookie now points at cart B, so nothing is cleared", async () => {
  const { POST, calls, request } = handler({ cartId: "cart_B", lookup: async () => confirmationB })
  const response = await POST(request(appOrigin, confirmationA))
  assert.equal(response.status, 409)
  assert.deepEqual(calls.lookup, ["cart_B"])
  assert.equal(calls.clear, 0)
})

test("any single differing field is a mismatch and keeps the cookie", async () => {
  const variants = {
    displayId: { ...confirmationA, displayId: 99 },
    customDisplayId: { ...confirmationA, customDisplayId: "other" },
    total: { ...confirmationA, total: 31 },
    currencyCode: { ...confirmationA, currencyCode: "usd" },
  }
  for (const [field, expected] of Object.entries(variants)) {
    const { POST, calls, request } = handler()
    const response = await POST(request(appOrigin, expected))
    assert.equal(response.status, 409, field)
    assert.equal(calls.clear, 0, field)
  }
})

test("optional identifiers match when both sides omit them", async () => {
  const bare = { total: 30, currencyCode: "eur" }
  const { POST, calls, request } = handler({ lookup: async () => bare })
  const response = await POST(request(appOrigin, bare))
  assert.equal(response.status, 204)
  assert.equal(calls.clear, 1)
})

test("cross-origin, missing and malformed Origin are rejected before the body, cookie or Medusa are touched", async () => {
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
    assert.equal(calls.json, 0, String(origin))
    assert.equal(calls.read, 0, String(origin))
    assert.equal(calls.lookup.length, 0, String(origin))
    assert.equal(calls.clear, 0, String(origin))
  }
})

test("missing, malformed or invalid confirmation JSON is a 400 before any cookie or Medusa access", async () => {
  const invalid = [
    () => { throw new SyntaxError("Unexpected end of JSON input") },
    null,
    [],
    "confirmation",
    {},
    { currencyCode: "eur" },
    { total: "30", currencyCode: "eur" },
    { total: Number.NaN, currencyCode: "eur" },
    { total: Number.POSITIVE_INFINITY, currencyCode: "eur" },
    { total: 30 },
    { total: 30, currencyCode: "" },
    { total: 30, currencyCode: "  " },
    { total: 30, currencyCode: 978 },
    { total: 30, currencyCode: "eur", displayId: "17" },
    { total: 30, currencyCode: "eur", displayId: Number.NaN },
    { total: 30, currencyCode: "eur", customDisplayId: 17 },
  ]
  for (const [index, body] of invalid.entries()) {
    const { POST, calls, request } = handler()
    const response = await POST(request(appOrigin, body))
    assert.equal(response.status, 400, `case ${index}`)
    assert.equal(calls.read, 0, `case ${index}`)
    assert.equal(calls.lookup.length, 0, `case ${index}`)
    assert.equal(calls.clear, 0, `case ${index}`)
  }
})
