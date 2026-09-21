import assert from "node:assert/strict"
import test from "node:test"

import {
  hasStoredCheckoutContact,
  validateCheckoutContact,
} from "./checkout-validation.ts"
import {
  deriveCheckoutProgress,
  hasCurrentCheckoutTotals,
} from "./checkout-presentation.ts"
import { getCheckoutActionErrorMessage } from "./checkout-errors.ts"

function validFormData(overrides = {}) {
  const values = {
    email: "guest@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "1 Example Street",
    city: "Nicosia",
    postal_code: "1010",
    country_code: "CY",
    ...overrides,
  }
  const formData = new FormData()

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}

test("checkout validation normalizes accepted input and preserves region authority", () => {
  const result = validateCheckoutContact(
    validFormData({ email: " guest@example.com ", country_code: "cy" }),
    ["CY"]
  )

  assert.equal(result.ok, true)

  if (result.ok) {
    assert.equal(result.value.email, "guest@example.com")
    assert.equal(result.value.address.country_code, "cy")
  }
})

test("checkout validation rejects malformed fields and out-of-region countries", () => {
  const result = validateCheckoutContact(
    validFormData({ email: "invalid", city: "", country_code: "GR" }),
    ["CY"]
  )

  assert.equal(result.ok, false)

  if (!result.ok) {
    assert.equal(result.fieldErrors.email, "Enter a valid email address.")
    assert.equal(result.fieldErrors.city, "City is required.")
    assert.equal(
      result.fieldErrors.country_code,
      "Choose a country supported by this cart's region."
    )
  }
})

test("stored checkout contact requires every approved address field", () => {
  const address = {
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "1 Example Street",
    city: "Nicosia",
    postal_code: "1010",
    country_code: "cy",
  }

  assert.equal(hasStoredCheckoutContact("guest@example.com", address), true)
  assert.equal(hasStoredCheckoutContact("", address), false)
  assert.equal(hasStoredCheckoutContact("guest@example.com", { ...address, city: "" }), false)
})

test("checkout presentation states require authoritative backend progression", () => {
  assert.equal(
    deriveCheckoutProgress({
      hasContactAddress: false,
      hasShippingMethod: false,
      hasCurrentTotals: false,
    }),
    "contact_address_incomplete"
  )
  assert.equal(
    deriveCheckoutProgress({
      hasContactAddress: true,
      hasShippingMethod: false,
      hasCurrentTotals: false,
    }),
    "shipping_required"
  )
  assert.equal(
    deriveCheckoutProgress({
      hasContactAddress: true,
      hasShippingMethod: true,
      hasCurrentTotals: true,
    }),
    "ready_for_payment"
  )
  assert.equal(
    hasCurrentCheckoutTotals({
      currency_code: "eur",
      item_subtotal: 25,
      item_tax_total: 4.75,
      shipping_subtotal: 5,
      shipping_tax_total: 0.95,
      shipping_total: 5.95,
      subtotal: 30,
      tax_total: 5.7,
      total: 35.7,
    }),
    true
  )
  assert.equal(
    hasCurrentCheckoutTotals({ currency_code: "eur", total: 35.7 }),
    false
  )
})

test("checkout errors expose safe messages without SDK payloads", () => {
  const result = getCheckoutActionErrorMessage(
    { status: 422, message: "private address details" },
    "address"
  )

  assert.equal(result.status, "error")
  assert.match(result.message, /contact or delivery details/i)
  assert.equal(result.message.includes("private address details"), false)
})
