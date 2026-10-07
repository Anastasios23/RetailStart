import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  getAutomaticVariant,
  getCalculatedPrice,
  getInventoryStatus,
  getProductOptions,
  isVariantPurchasable,
  resolveVariantSelection,
} from "./product-variants.ts"
import { getIdentifier, getPositiveSafeInteger } from "./cart-validation.ts"
import * as cartErrors from "./cart-errors.ts"
import { formatMoney } from "../money.ts"
import { createModuleLoader } from "./test-support/load-module.mjs"

const loadModule = createModuleLoader(import.meta.url)

function variant(id, size, color, overrides = {}) {
  return {
    id, title: `${size} / ${color}`, sku: `SKU-${id}`,
    manage_inventory: true, inventory_quantity: 4,
    calculated_price: { calculated_amount: 25, currency_code: "eur" },
    options: [
      { id: `value-size-${size}`, option_id: "opt_size", value: size },
      { id: `value-color-${color}`, option_id: "opt_color", value: color },
    ],
    ...overrides,
  }
}

function product() {
  return {
    id: "prod_fixture", title: "Variant fixture",
    options: [
      { id: "opt_size", title: "Size", values: [
        { id: "size-s", value: "S" }, { id: "size-m", value: "M" },
      ] },
      { id: "opt_color", title: "Color", values: [
        { id: "color-red", value: "Red" }, { id: "color-blue", value: "Blue" },
      ] },
    ],
    variants: [
      variant("variant_s_red", "S", "Red"),
      variant("variant_m_red", "M", "Red"),
      variant("variant_m_blue", "M", "Blue", { inventory_quantity: 0 }),
    ],
  }
}

test("single variant with no product options keeps its direct purchase path", () => {
  const single = { ...product(), options: [], variants: [variant("variant_single", "", "", { options: [] })] }
  assert.equal(getAutomaticVariant(single)?.id, "variant_single")
  assert.equal(isVariantPurchasable(single.variants[0]), true)
})

test("Medusa options are rendered by identity and exact values", () => {
  assert.deepEqual(getProductOptions(product()), [
    { id: "opt_size", title: "Size", values: ["S", "M"] },
    { id: "opt_color", title: "Color", values: ["Red", "Blue"] },
  ])
  const sameTitles = product()
  sameTitles.options[1].title = "Size"
  assert.equal(resolveVariantSelection(sameTitles, { opt_size: "M", opt_color: "Red" }).variant?.id, "variant_m_red")
})

test("existing product helper retains Medusa options without widening productFields", async () => {
  const fixture = product()
  let query
  const helpers = { getCalculatedPrice, getInventoryStatus }
  const { getProductByHandle, productFields } = loadModule("./products.ts", {
    "./product-variants": helpers,
    "./client": {
      getMedusaClient: () => ({ store: { product: { list: async (input) => {
        query = input
        return { products: [fixture] }
      } } } }),
      getMedusaPricingContext: () => ({ region_id: "reg_fixture", country_code: "cy" }),
    },
  })
  const result = await getProductByHandle("fixture")
  assert.equal(result, fixture)
  assert.equal(productFields, "*variants.calculated_price,+variants.inventory_quantity")
  assert.equal(query.fields, productFields)
  assert.equal(resolveVariantSelection(result, { opt_size: "M", opt_color: "Red" }).variant?.id, "variant_m_red")
})

test("incomplete selections fail closed", () => {
  for (const selection of [{}, { opt_size: "S" }, { opt_size: "S", opt_color: "" }]) {
    assert.notEqual(resolveVariantSelection(product(), selection).status, "resolved")
  }
})

test("exact combination and changing selection resolve the actual Medusa variant", () => {
  const fixture = product()
  assert.equal(resolveVariantSelection(fixture, { opt_size: "S", opt_color: "Red" }).variant?.id, "variant_s_red")
  assert.equal(resolveVariantSelection(fixture, { opt_size: "M", opt_color: "Red" }).variant?.id, "variant_m_red")
  assert.notEqual(resolveVariantSelection(fixture, { opt_size: "S", opt_color: "red" }).status, "resolved")
})

test("nonexistent and ambiguous combinations fail closed", () => {
  const fixture = product()
  assert.notEqual(resolveVariantSelection(fixture, { opt_size: "S", opt_color: "Blue" }).status, "resolved")
  fixture.variants.push(variant("variant_duplicate", "S", "Red"))
  assert.equal(resolveVariantSelection(fixture, { opt_size: "S", opt_color: "Red" }).status, "ambiguous")
  assert.equal(getAutomaticVariant(fixture), undefined)
})

test("malformed product schema and variant mappings fail closed", () => {
  const mutations = [
    (p) => { p.options = null },
    (p) => { p.options = [] },
    (p) => { p.options[0].values = [] },
    (p) => { p.options[0].id = "" },
    (p) => { p.options[1].id = p.options[0].id },
    (p) => { p.options[0].values.push({ id: "duplicate", value: "S" }) },
    (p) => { p.variants[0].options = null },
    (p) => { p.variants[0].options.pop() },
    (p) => { p.variants[0].options[0].option_id = null },
    (p) => { p.variants[0].options[0].value = "Unknown" },
    (p) => { p.variants[0].options.push(p.variants[0].options[0]) },
  ]
  for (const mutate of mutations) {
    const fixture = product()
    mutate(fixture)
    assert.notEqual(resolveVariantSelection(fixture, { opt_size: "S", opt_color: "Red" }).status, "resolved")
    assert.equal(getAutomaticVariant(fixture), undefined)
  }
})

test("only one purchasable variant is automatic and identifies its exact options", () => {
  const fixture = product()
  fixture.variants[1].inventory_quantity = 0
  assert.equal(getAutomaticVariant(fixture)?.id, "variant_s_red")
  fixture.variants.push(variant("variant_duplicate", "S", "Red", { inventory_quantity: 0 }))
  assert.equal(getAutomaticVariant(fixture), undefined)
})

test("out of stock, unknown inventory and missing/invalid prices cannot be purchased", () => {
  for (const inventory_quantity of [0, -1, null, undefined, NaN, Infinity]) {
    assert.equal(isVariantPurchasable(variant("v", "S", "Red", { inventory_quantity })), false)
  }
  for (const calculated_price of [null, undefined, {},
    { calculated_amount: NaN, currency_code: "eur" },
    { calculated_amount: -1, currency_code: "eur" },
    { calculated_amount: 25, currency_code: "" }]) {
    assert.equal(getCalculatedPrice(variant("v", "S", "Red", { calculated_price })), null)
  }
  assert.equal(isVariantPurchasable(variant("v", "S", "Red", { manage_inventory: false, inventory_quantity: undefined })), true)
  assert.equal(getInventoryStatus(undefined), "unavailable")
  assert.equal(isVariantPurchasable(variant("v", "S", "Red", { calculated_price: { calculated_amount: 0, currency_code: "eur" } })), true)
})

function nodes(element, predicate) {
  if (!element || typeof element !== "object") return []
  if (Array.isArray(element)) return element.flatMap((child) => nodes(child, predicate))
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)]
}

function purchaseHarness({ hydrated = true } = {}) {
  let selection
  let formHydrated = hydrated
  const effects = []
  let pending = false
  let outcome = { status: "idle" }
  let action
  const hooks = {
    ...React,
    useState: (initial) => {
      if (selection === undefined) selection = typeof initial === "function" ? initial() : initial
      return [selection, (next) => { selection = typeof next === "function" ? next(selection) : next }]
    },
    useId: () => "fixture-options",
    useEffect: () => {},
    useActionState: (serverAction) => { action = serverAction; return [outcome, () => {}, pending] },
  }
  const addAction = () => {}
  const { AddToCartForm } = loadModule("../../app/components/add-to-cart-form.tsx", {
    react: {
      ...hooks,
      useState: () => [formHydrated, (value) => { formHydrated = value }],
      useEffect: (effect) => { effects.push(effect) },
    }, "next/navigation": { useRouter: () => ({ push() {} }) },
    "../actions/cart-actions": { addItemAction: addAction },
    "../actions/cart-action-state": { initialCartActionState: { status: "idle" } },
  })
  const helpers = { getAutomaticVariant, getCalculatedPrice, getInventoryStatus, getProductOptions, isVariantPurchasable, resolveVariantSelection }
  const { ProductPurchaseForm } = loadModule("../../app/components/product-purchase-form.tsx", {
    react: hooks, "./add-to-cart-form": { AddToCartForm },
    "../../lib/medusa/product-variants": helpers, "../../lib/money": { formatMoney },
  })
  return {
    render: (fixture) => ProductPurchaseForm({ product: fixture }),
    markup: (fixture) => renderToStaticMarkup(React.createElement(ProductPurchaseForm, { product: fixture })),
    form: (element) => {
      const node = nodes(element, (n) => n.type === AddToCartForm)[0]
      assert.ok(node, "purchase UI must reuse AddToCartForm")
      return AddToCartForm(node.props)
    },
    pending: (value) => { pending = value },
    flushEffects: () => { effects.splice(0).forEach((effect) => effect()) },
    outcome: (value) => { outcome = value },
    action: () => action,
    addAction,
  }
}

test("purchase controls stay disabled until hydration, then enable and respect pending", () => {
  const harness = purchaseHarness({ hydrated: false })
  const fixture = { ...product(), variants: [variant("variant_single", "S", "Red")] }
  const element = harness.render(fixture)
  let form = harness.form(element)
  assert.equal(nodes(form, (n) => n.type === "fieldset")[0].props.disabled, true)
  assert.equal(nodes(form, (n) => n.type === "button")[0].props.disabled, true)
  let prevented = false
  form.props.onSubmit({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  harness.flushEffects()
  form = harness.form(element)
  assert.equal(nodes(form, (n) => n.type === "fieldset")[0].props.disabled, false)
  assert.equal(nodes(form, (n) => n.type === "button")[0].props.disabled, false)
  harness.pending(true)
  form = harness.form(element)
  assert.equal(nodes(form, (n) => n.type === "fieldset")[0].props.disabled, true)
  assert.equal(nodes(form, (n) => n.type === "button")[0].props.disabled, true)
})

test("server-rendered purchase controls cannot accept input before handlers attach", () => {
  const { AddToCartForm } = loadModule("../../app/components/add-to-cart-form.tsx", {
    react: React, "next/navigation": { useRouter: () => ({ push() {} }) },
    "../actions/cart-actions": { addItemAction: () => {} },
    "../actions/cart-action-state": { initialCartActionState: { status: "idle" } },
  })
  const markup = renderToStaticMarkup(React.createElement(AddToCartForm, {
    variantId: "variant_single",
    children: React.createElement("select", { name: "Size" }, React.createElement("option", null, "S")),
  }))
  assert.match(markup, /<fieldset[^>]*disabled=""/)
  assert.match(markup, /<button[^>]*disabled=""/)
})

test("purchase UI labels options and prevents incomplete, nonexistent and out-of-stock submissions", () => {
  const harness = purchaseHarness()
  const fixture = product()
  let element = harness.render(fixture)
  const selects = nodes(element, (n) => n.type === "select")
  assert.equal(selects.length, 2)
  const labels = nodes(element, (n) => n.type === "label")
  for (const control of selects) assert.ok(labels.some((label) => label.props.htmlFor === control.props.id))
  assert.match(harness.markup(fixture), /Size/)
  assert.match(harness.markup(fixture), /Color/)
  assert.equal(nodes(harness.form(element), (n) => n.type === "button")[0].props.disabled, true)
  let prevented = false
  harness.form(element).props.onSubmit({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  selects[0].props.onChange({ target: { value: "S" } })
  element = harness.render(fixture)
  assert.equal(nodes(harness.form(element), (n) => n.type === "button")[0].props.disabled, true)
  nodes(element, (n) => n.type === "select")[1].props.onChange({ target: { value: "Blue" } })
  element = harness.render(fixture)
  assert.equal(nodes(harness.form(element), (n) => n.type === "button")[0].props.disabled, true)
  nodes(element, (n) => n.type === "select")[0].props.onChange({ target: { value: "M" } })
  element = harness.render(fixture)
  assert.equal(nodes(harness.form(element), (n) => n.type === "button")[0].props.disabled, true)
})

test("changing option controls updates the submitted ID; pending disables controls and guards submit", () => {
  const harness = purchaseHarness()
  const fixture = product()
  let element = harness.render(fixture)
  nodes(element, (n) => n.type === "select")[0].props.onChange({ target: { value: "S" } })
  element = harness.render(fixture)
  nodes(element, (n) => n.type === "select")[1].props.onChange({ target: { value: "Red" } })
  element = harness.render(fixture)
  const submittedId = () => nodes(harness.form(element), (n) => n.type === "input" && n.props.name === "variantId")[0].props.value
  assert.equal(submittedId(), "variant_s_red")
  assert.equal(nodes(harness.form(element), (n) => n.type === "button")[0].props.disabled, false)
  assert.equal(harness.action(), harness.addAction)
  nodes(element, (n) => n.type === "select")[0].props.onChange({ target: { value: "M" } })
  element = harness.render(fixture)
  assert.equal(submittedId(), "variant_m_red")
  harness.pending(true)
  const form = harness.form(element)
  assert.equal(nodes(form, (n) => n.type === "fieldset")[0].props.disabled, true)
  let prevented = false
  form.props.onSubmit({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
})

test("single purchase UI omits unnecessary selectors and missing price disables purchase", () => {
  const harness = purchaseHarness()
  const fixture = { ...product(), variants: [variant("variant_single", "S", "Red")] }
  assert.equal(nodes(harness.render(fixture), (n) => n.type === "select").length, 0)
  assert.match(harness.markup(fixture), /SKU-variant_single/)
  fixture.variants[0].calculated_price = null
  assert.equal(nodes(harness.form(harness.render(fixture)), (n) => n.type === "button")[0].props.disabled, true)
})

test("selected ID passes through the existing action and adapter; cart renders Medusa variant identity", async () => {
  const chosen = resolveVariantSelection(product(), { opt_size: "M", opt_color: "Red" }).variant
  let payload
  let reject = false
  const cart = { id: "cart_fixture", currency_code: "eur", subtotal: 25, total: 25, items: [{
    id: "item_fixture", product_title: "Backend product", variant_id: chosen.id,
    variant_title: "Backend M / Red", variant_sku: "BACKEND-M-RED", quantity: 1, unit_price: 25, total: 25,
  }] }
  const { addLineItem } = loadModule("./cart.ts", {
    "server-only": {}, "./client": {
      getMedusaClient: () => ({ store: { cart: {
        retrieve: async () => ({ cart }),
        createLineItem: async (_cartId, input) => {
          payload = input
          if (reject) throw { status: 400 }
          return { cart }
        },
      } } }),
      getMedusaPricingContext: () => ({ region_id: "reg_fixture" }),
    }, "./cart-errors": cartErrors,
    "./cart-cookie": { readCartId: async () => cart.id, writeCartId: async () => {} },
  })
  const paths = []
  const { addItemAction } = loadModule("../../app/actions/cart-actions.ts", {
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "../../lib/medusa/cart-errors": cartErrors,
    "../../lib/medusa/cart": { addLineItem },
    "../../lib/medusa/cart-validation": { getIdentifier, getPositiveSafeInteger },
  })
  const form = new FormData()
  form.set("variantId", chosen.id)
  form.set("quantity", "1")
  assert.equal((await addItemAction({ status: "idle" }, form)).status, "success")
  assert.equal(payload.variant_id, "variant_m_red")
  assert.equal(payload.quantity, 1)
  assert.deepEqual(paths, ["/cart"])
  const { default: CartPage } = loadModule("../../app/cart/page.tsx", {
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "../components/cart-item-actions": { CartItemActions: () => null },
    "../../lib/medusa/cart": { getCurrentCart: async () => ({ kind: "available", cart }) },
    "../../lib/money": { formatMoney },
  })
  const markup = renderToStaticMarkup(await CartPage())
  assert.match(markup, /Backend M \/ Red/)
  assert.match(markup, /BACKEND-M-RED/)
  reject = true
  const result = await addItemAction({ status: "idle" }, form)
  assert.equal(result.status, "error")
  assert.equal(result.message, "That item is currently unavailable in the requested quantity.")
  assert.deepEqual(paths, ["/cart"])
})
