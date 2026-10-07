import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as variants from "./product-variants.ts"
import { formatMoney } from "../money.ts"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })
const Link = ({ children, ...props }) => React.createElement("a", props, children)
const category = (id, handle = id, overrides = {}) => ({ id, handle, name: `Category ${id}`, parent_category_id: null, ...overrides })
const product = (id, categories = []) => ({ id, handle: id, title: `Product ${id}`, categories, variants: [{
  id: `variant_${id}`, manage_inventory: true, inventory_quantity: 3,
  calculated_price: { calculated_amount: 25, currency_code: "eur" },
}] })
const pricing = { region_id: "reg_fixture", country_code: "cy" }
function boundary(categoryRead, productRead = async () => ({ products: [] })) {
  const queries = { categories: [], products: [] }
  const client = { store: {
    category: { list: async (q) => { queries.categories.push(q); return categoryRead(q) } },
    product: { list: async (q) => { queries.products.push(q); return productRead(q) } },
  } }
  const clientModule = { getMedusaClient: () => client, getMedusaPricingContext: () => pricing }
  const products = load("./products.ts", { "./client": clientModule, "./product-variants": variants })
  const categories = load("./categories.ts", { "./client": clientModule, "./products": products })
  return { products, categories, queries }
}
const response = (data, count = data.length, offset = 0) => ({ product_categories: data, count, offset, limit: 100 })
const markup = (element) => renderToStaticMarkup(element)
const grid = load("../../app/components/product-grid.tsx", {
  "next/link": { default: Link },
  "../../lib/medusa/products": { ...variants, getPrimaryVariant: (p) => p.variants?.[0] },
  "../../lib/money": { formatMoney },
}).ProductGrid
function detail(b) {
  return load("../../app/categories/[handle]/page.tsx", {
    "next/link": { default: Link }, "next/navigation": { notFound() { throw new Error("NEXT_NOT_FOUND") } },
    "../../../lib/medusa/categories": b.categories, "../../../lib/medusa/products": b.products,
    "../../components/product-grid": { ProductGrid: grid },
  }).default
}
function index(b) {
  return load("../../app/categories/page.tsx", {
    "next/link": { default: Link }, "../../lib/medusa/categories": b.categories,
  }).default
}

test("index renders authoritative Medusa names, handles and parent relationship", async () => {
  const b = boundary(async () => response([category("parent", "parent"), category("child", "child handle", {
    name: "Medusa child name", parent_category_id: "parent", parent_category: category("parent"),
  })]))
  const html = markup(await index(b)())
  assert.match(html, /Medusa child name/)
  assert.match(html, /href="\/categories\/child%20handle"/)
  assert.match(html, /Within Category parent/)
  assert.equal(b.queries.categories[0].include_descendants_tree, false)
})
test("hierarchy labels use only public categories returned in discovery", async () => {
  const b = boundary(async () => response([category("child", "child", {
    parent_category_id: "hidden", parent_category: { name: "Private category name" },
  })]))
  const html = markup(await index(b)())
  assert.match(html, /Category child/)
  assert.doesNotMatch(html, /Private category name|Within/)
  assert.equal(b.queries.categories[0].fields, "id,name,handle,parent_category_id")
})
test("category pagination reads all pages and fails closed on a later-page API failure", async () => {
  const first = Array.from({ length: 100 }, (_, i) => category(`id_${i}`))
  const b = boundary(async (q) => response(q.offset === 0 ? first : [category("last")], 101, q.offset))
  assert.equal((await b.categories.listCategories()).length, 101)
  assert.deepEqual(b.queries.categories.map(q => q.offset), [0, 100])
  assert.equal(b.queries.categories[0].order, "id")
  const failed = boundary(async (q) => { if (q.offset) throw new Error("private failure"); return response(first, 101) })
  await assert.rejects(index(failed)(), { name: "StorefrontCatalogError" })
})
test("inconsistent counts, stalled pages and duplicate pages cannot return a complete index", async () => {
  for (const next of [response([], 2, 1), response([category("first")], 2, 1), response([category("last")], 3, 1)]) {
    const b = boundary(async q => q.offset === 0 ? response([category("first")], 2) : next)
    await assert.rejects(b.categories.listCategories(), { name: "StorefrontCatalogError" })
  }
})
test("successful empty category list renders empty copy; list API failure rejects", async () => {
  const empty = boundary(async () => response([]))
  assert.match(markup(await index(empty)()), /No categories are available right now/)
  const failed = boundary(async () => { throw new Error("private upstream details") })
  await assert.rejects(index(failed)(), { name: "StorefrontCatalogError" })
})
test("handle resolves identity; direct and multi-category products appear, descendants do not", async () => {
  const parent = category("cat_authoritative", "customer-handle", { category_children: [category("child")] })
  const all = [product("direct", [parent]), product("multi", [parent, category("other")]), product("descendant", [category("child")])]
  const b = boundary(async q => { assert.equal(q.handle, "customer-handle"); return response([parent]) }, async q => ({
    products: all.filter(p => p.categories.some(c => q.category_id.includes(c.id))),
  }))
  const html = markup(await detail(b)({ params: Promise.resolve({ handle: "customer-handle" }) }))
  assert.deepEqual(Array.from(b.queries.products[0].category_id), ["cat_authoritative"])
  assert.equal(b.queries.products[0].fields, b.products.productFields)
  assert.equal(b.queries.products[0].region_id, pricing.region_id)
  assert.equal(b.queries.products[0].country_code, "cy")
  assert.equal(b.queries.products[0].limit, 100)
  assert.match(html, /Product direct/)
  assert.match(html, /Product multi/)
  assert.doesNotMatch(html, /Product descendant/)
  assert.match(html, /href="\/products\/multi"/)
})
test("valid empty category keeps heading and explicit category-empty copy", async () => {
  const b = boundary(async () => response([category("empty")]))
  const html = markup(await detail(b)({ params: Promise.resolve({ handle: "empty" }) }))
  assert.match(html, /<h1 id="category-title">Category empty<\/h1>/)
  assert.match(html, /No products are available in this category right now/)
})
test("nonexistent category uses Next notFound without reading products", async () => {
  const b = boundary(async () => response([]))
  await assert.rejects(detail(b)({ params: Promise.resolve({ handle: "missing" }) }), /NEXT_NOT_FOUND/)
  assert.equal(b.queries.products.length, 0)
})
test("category lookup API failure remains unavailable, including upstream 404", async () => {
  const b = boundary(async () => { throw Object.assign(new Error("upstream"), { status: 404 }) })
  await assert.rejects(detail(b)({ params: Promise.resolve({ handle: "missing" }) }), { name: "StorefrontCatalogError" })
  assert.equal(b.queries.products.length, 0)
})
test("product-read API failure remains unavailable, not an empty category", async () => {
  const b = boundary(async () => response([category("valid")]), async () => { throw new Error("product read failed") })
  await assert.rejects(detail(b)({ params: Promise.resolve({ handle: "valid" }) }), { name: "StorefrontCatalogError" })
})
test("ambiguous or mismatched handle responses cannot become an arbitrary category", async () => {
  for (const data of [[category("wrong")], [category("wanted"), category("wanted")]]) {
    const b = boundary(async () => response(data))
    await assert.rejects(b.categories.getCategoryByHandle("wanted"), { name: "StorefrontCatalogError" })
  }
})
test("existing products list query, empty copy, detail link and first-variant semantics remain intact", async () => {
  const p = product("existing")
  p.variants.push({ calculated_price: { calculated_amount: 1, currency_code: "eur" }, inventory_quantity: 0 })
  const b = boundary(async () => response([]), async () => ({ products: [p] }))
  const page = load("../../app/products/page.tsx", {
    "../../lib/medusa/products": b.products, "../components/product-grid": { ProductGrid: grid },
  }).default
  const html = markup(await page())
  assert.equal(b.queries.products[0].category_id, undefined)
  assert.equal(b.queries.products[0].limit, 100)
  assert.match(html, /href="\/products\/existing"/)
  assert.match(html, /25\.00/)
  assert.match(html, /In stock/)
  assert.match(markup(React.createElement(grid, { products: [] })), /No products are available right now/)
})
test("category failure UI is safe and retryable; not-found links back to categories", () => {
  let resets = 0
  let refreshes = 0
  const error = load("../../app/categories/error.tsx", {
    react: { useEffect() {}, startTransition(callback) { callback() } }, "next/link": { default: Link },
    "next/navigation": { useRouter: () => ({ refresh() { refreshes++ } }) },
  }).default({ error: new Error("secret backend details"), reset() { resets++ } })
  const html = markup(error)
  assert.match(html, /We could not load the category catalog/)
  assert.match(html, /Try again/)
  assert.doesNotMatch(html, /secret backend details|No categories|could not find/)
  error.props.children[3].props.children[0].props.onClick()
  assert.equal(resets, 1)
  assert.equal(refreshes, 1)
  const notFound = load("../../app/categories/not-found.tsx", { "next/link": { default: Link } }).default
  assert.match(markup(React.createElement(notFound)), /href="\/categories"/)
})
