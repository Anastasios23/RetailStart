import assert from "node:assert/strict"
import test from "node:test"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })

const contact = { address_1: "1 Main", city: "Nicosia", postal_code: "1000", country_code: "cy", first_name: "A", last_name: "B", phone: "1" }
const paidCart = (overrides = {}) => ({
  id: "cart_1", email: "a@example.com", currency_code: "eur", total: 50, completed_at: null,
  items: [{ id: "item_1" }], shipping_methods: [{ id: "sm_1" }],
  shipping_address: contact, billing_address: contact,
  payment_collection: {
    id: "pay_col_1", amount: 50, currency_code: "eur",
    payment_sessions: [{ id: "ps_1", provider_id: "pp_stripe_stripe", status: "authorized", amount: 50, currency_code: "eur", payment_collection: { id: "pay_col_1" } }],
  },
  ...overrides,
})

// Boundary: the action reads a (possibly different) fresh cart at completion time.
function actions(freshCart) {
  const calls = { complete: 0 }
  const payment = load("../../lib/medusa/checkout-payment.ts", {})
  const module = load("../../app/actions/checkout-actions.ts", {
    "next/cache": { revalidatePath() {} },
    "../../lib/medusa/cart-cookie": { readCartId: async () => "cart_1", clearCartId: async () => {} },
    "../../lib/medusa/checkout-errors": { getCheckoutActionErrorMessage: () => ({ status: "error", message: "failed" }) },
    "../../lib/medusa/checkout": {
      getAvailableShippingOptions: async () => [], getCheckoutCountries: async () => [],
      retrieveCheckoutCart: async () => freshCart, retrieveCompletedCheckoutConfirmation: async () => ({}),
    },
    "../../lib/medusa/client": { getMedusaClient: () => ({ store: { cart: { complete: async () => {
      calls.complete++
      return { type: "order", order: { id: "order_1", display_id: 1, currency_code: "eur", summary: { current_order_total: 50 } } }
    } } } }) },
    "../../lib/medusa/checkout-payment": payment,
    "../../lib/medusa/cart-validation": { getIdentifier: (v) => v },
    "../../lib/medusa/checkout-validation": { hasStoredCheckoutContact: (email, address) => Boolean(email && address), validateCheckoutContact: () => ({ ok: false }) },
  })
  return { module, calls, payment }
}

test("the render-time cart is finalizeable, so the guard itself passes for the matching cart", () => {
  const { payment } = actions(paidCart())
  assert.equal(payment.canFinalizePaidPaymentSession(paidCart()), true)
})

test("finalize action completes when the freshly read cart still matches", async () => {
  const { module, calls } = actions(paidCart())
  const result = await module.finalizeCheckoutAction({}, new FormData())
  assert.equal(calls.complete, 1)
  assert.equal(result.status, "success")
})

test("finalize action refuses to complete when the cart changed after render", async () => {
  const staleCarts = {
    "stale amount": paidCart({ total: 60 }),
    "stale currency": paidCart({ currency_code: "usd" }),
    "session no longer authorized": paidCart({ payment_collection: { ...paidCart().payment_collection, payment_sessions: [{ ...paidCart().payment_collection.payment_sessions[0], status: "pending" }] } }),
    "session amount mismatch": paidCart({ payment_collection: { ...paidCart().payment_collection, payment_sessions: [{ ...paidCart().payment_collection.payment_sessions[0], amount: 40 }] } }),
    "no payment session": paidCart({ payment_collection: { id: "pay_col_1", amount: 50, currency_code: "eur", payment_sessions: [] } }),
  }
  for (const [name, cart] of Object.entries(staleCarts)) {
    const { module, calls } = actions(cart)
    const result = await module.finalizeCheckoutAction({}, new FormData())
    assert.equal(calls.complete, 0, name)
    assert.equal(result.status, "error", name)
    assert.match(result.message, /Refresh checkout/, name)
  }
})

test("normal completion after a successful confirmPayment is unchanged", async () => {
  const pending = paidCart({ payment_collection: { ...paidCart().payment_collection, payment_sessions: [{ ...paidCart().payment_collection.payment_sessions[0], status: "pending" }] } })
  const { module, calls } = actions(pending)
  const result = await module.completeCheckoutAction({}, new FormData())
  assert.equal(calls.complete, 1)
  assert.equal(result.status, "success")
})
