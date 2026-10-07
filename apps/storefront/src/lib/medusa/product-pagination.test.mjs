import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as variants from "./product-variants.ts"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })
const Link = ({ children, ...props }) => React.createElement("a", props, children)
const markup = (element) => renderToStaticMarkup(element)

const catalog = (size) => Array.from({ length: size }, (_, i) => ({
  id: `prod_${String(i).padStart(4, "0")}`, handle: `p${i}`, title: `Product ${i}`,
  variants: [{ id: `v${i}`, manage_inventory: true, inventory_quantity: 1,
    calculated_price: { calculated_amount: 5, currency_code: "eur" } }],
}))

// Fake Store API honouring limit/offset like Medusa, and recording each query.
function boundary(all) {
  const queries = []
  const client = { store: { product: { list: async (q) => {
    queries.push(q)
    return { products: all.slice(q.offset, q.offset + q.limit), count: all.length, offset: q.offset, limit: q.limit }
  } } } }
  const products = load("./products.ts", {
    "./client": { getMedusaClient: () => client, getMedusaPricingContext: () => ({ region_id: "reg", country_code: "cy" }) },
    "./product-variants": variants,
  })
  return { products, queries }
}

test("page param: missing, malformed, zero, negative and unsafe values fall back to page 1", () => {
  const { products } = boundary([])
  for (const value of [undefined, "", "abc", "0", "-3", "1.5", "2e1", " 2", "99999999999999999999", ["2", "3"]]) {
    assert.equal(products.parsePageParam(value), 1, String(value))
  }
  assert.equal(products.parsePageParam("1"), 1)
  assert.equal(products.parsePageParam("7"), 7)
})

test("more than 100 products are all reachable through pages without duplicates or gaps", async () => {
  const all = catalog(250)
  const b = boundary(all)
  const first = await b.products.listProducts(1)
  assert.equal(first.pageSize, 24)
  assert.equal(first.count, 250)
  assert.equal(first.totalPages, 11)
  const seen = []
  for (let page = 1; page <= first.totalPages; page++) {
    const result = await b.products.listProducts(page)
    assert.equal(b.products.isPageOutOfRange(result), false)
    seen.push(...result.products.map((p) => p.id))
  }
  assert.deepEqual(seen, all.map((p) => p.id))
  assert.equal(b.queries.at(-1).offset, 240)
  assert.equal(b.queries.at(-1).limit, 24)
  assert.equal(b.queries.at(-1).order, "id")
  assert.equal(b.queries.at(-1).category_id, undefined)
})

test("category listing pages keep direct category_id filtering", async () => {
  const b = boundary(catalog(30))
  const result = await b.products.listProductsByCategory("cat_a", 2)
  assert.deepEqual(Array.from(b.queries[0].category_id), ["cat_a"])
  assert.equal(b.queries[0].offset, 24)
  assert.equal(result.products.length, 6)
})

test("page range: an empty catalog has only page 1; otherwise pages up to ceil(count / 24)", async () => {
  const outOfRange = async (size, page) => {
    const { products } = boundary(catalog(size))
    return products.isPageOutOfRange(await products.listProducts(page))
  }
  assert.equal(await outOfRange(0, 1), false)
  assert.equal(await outOfRange(0, 2), true)
  assert.equal(await outOfRange(25, 2), false)
  assert.equal(await outOfRange(25, 3), true)
  assert.equal((await boundary([]).products.listProducts(1)).totalPages, 1)
})

test("malformed or shifted Store API pages fail closed", async () => {
  const bad = [
    { products: [], count: -1, offset: 0 },
    { products: [], count: "3", offset: 0 },
    { products: [], count: 5, offset: 24 },
    { products: catalog(25), count: 25, offset: 0 },
    { products: [catalog(1)[0], catalog(1)[0]], count: 2, offset: 0 },
  ]
  for (const response of bad) {
    const products = load("./products.ts", {
      "./client": { getMedusaClient: () => ({ store: { product: { list: async () => response } } }), getMedusaPricingContext: () => ({}) },
      "./product-variants": variants,
    })
    await assert.rejects(products.listProducts(1), { name: "StorefrontCatalogError" })
  }
})

test("pagination links: Previous/Next, Page X of Y, page 1 omits the query", () => {
  const { Pagination } = load("../../app/components/pagination.tsx", { "next/link": { default: Link } })
  const render = (page, totalPages) => markup(React.createElement(Pagination, { basePath: "/products", page, totalPages }))
  assert.equal(render(1, 1), "")
  assert.match(render(1, 3), /^<nav class="pagination" aria-label="Pagination">/)
  assert.doesNotMatch(render(1, 3) + render(3, 3), /aria-disabled|disabled|href="#"/)
  const first = render(1, 3)
  assert.match(first, /Page 1 of 3/)
  assert.match(first, /href="\/products\?page=2"[^>]*>Next/)
  assert.doesNotMatch(first, /Previous/)
  const middle = render(2, 3)
  assert.match(middle, /href="\/products"[^>]*>Previous/)
  assert.match(middle, /href="\/products\?page=3"[^>]*>Next/)
  const last = render(3, 3)
  assert.match(last, /href="\/products\?page=2"[^>]*>Previous/)
  assert.doesNotMatch(last, /Next/)
})

test("listing pages: invalid page shows page 1, valid page past the end is not found", async () => {
  const b = boundary(catalog(30))
  const empty = boundary([])
  const grid = ({ products }) => React.createElement("p", null, `grid:${products.length}`)
  const pagination = load("../../app/components/pagination.tsx", { "next/link": { default: Link } })
  const notFound = () => { throw new Error("NEXT_NOT_FOUND") }
  const productsPage = load("../../app/products/page.tsx", {
    "next/navigation": { notFound }, "../../lib/medusa/products": b.products,
    "../components/pagination": pagination, "../components/product-grid": { ProductGrid: grid },
  }).default
  const html = markup(await productsPage({ searchParams: Promise.resolve({ page: "abc" }) }))
  assert.match(html, /grid:24/)
  assert.match(html, /Page 1 of 2/)
  assert.match(markup(await productsPage({ searchParams: Promise.resolve({ page: "2" }) })), /grid:6/)
  await assert.rejects(productsPage({ searchParams: Promise.resolve({ page: "3" }) }), /NEXT_NOT_FOUND/)
  const emptyProductsPage = load("../../app/products/page.tsx", {
    "next/navigation": { notFound }, "../../lib/medusa/products": empty.products,
    "../components/pagination": pagination, "../components/product-grid": { ProductGrid: grid },
  }).default
  assert.match(markup(await emptyProductsPage({ searchParams: Promise.resolve({}) })), /grid:0/)
  await assert.rejects(emptyProductsPage({ searchParams: Promise.resolve({ page: "2" }) }), /NEXT_NOT_FOUND/)

  const categories = { getCategoryByHandle: async () => ({ id: "cat_a", handle: "a b", name: "Cat" }) }
  const categoryPage = load("../../app/categories/[handle]/page.tsx", {
    "next/link": { default: Link }, "next/navigation": { notFound },
    "../../../lib/medusa/categories": categories, "../../../lib/medusa/products": b.products,
    "../../components/pagination": pagination, "../../components/product-grid": { ProductGrid: grid },
  }).default
  const params = Promise.resolve({ handle: "a b" })
  assert.match(markup(await categoryPage({ params, searchParams: Promise.resolve({ page: "1" }) })), /href="\/categories\/a%20b\?page=2"/)
  await assert.rejects(categoryPage({ params, searchParams: Promise.resolve({ page: "9" }) }), /NEXT_NOT_FOUND/)
  const emptyCategoryPage = load("../../app/categories/[handle]/page.tsx", {
    "next/link": { default: Link }, "next/navigation": { notFound },
    "../../../lib/medusa/categories": categories, "../../../lib/medusa/products": empty.products,
    "../../components/pagination": pagination, "../../components/product-grid": { ProductGrid: grid },
  }).default
  assert.match(markup(await emptyCategoryPage({ params, searchParams: Promise.resolve({}) })), /grid:0/)
  await assert.rejects(emptyCategoryPage({ params, searchParams: Promise.resolve({ page: "2" }) }), /NEXT_NOT_FOUND/)
})
