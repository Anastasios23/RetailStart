import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as variants from "./product-variants.ts"
import { createModuleLoader } from "./test-support/load-module.mjs"

const load = createModuleLoader(import.meta.url, { console: { error() {} } })
const Link = ({ children, ...props }) => React.createElement("a", props, children)
const markup = (element) => renderToStaticMarkup(element)

const catalog = (size, prefix = "Product") =>
  Array.from({ length: size }, (_, i) => ({
    id: `prod_${String(i).padStart(4, "0")}`,
    handle: `p${i}`,
    title: `${prefix} ${i}`,
    variants: [
      {
        id: `v${i}`,
        manage_inventory: true,
        inventory_quantity: 1,
        calculated_price: { calculated_amount: 15, currency_code: "eur" },
      },
    ],
  }))

function boundary(all) {
  const queries = []
  const client = {
    store: {
      product: {
        list: async (q) => {
          queries.push(q)
          let filtered = all
          if (q.q) {
            filtered = all.filter((p) =>
              p.title.toLowerCase().includes(q.q.toLowerCase())
            )
          }
          return {
            products: filtered.slice(q.offset, q.offset + q.limit),
            count: filtered.length,
            offset: q.offset,
            limit: q.limit,
          }
        },
      },
    },
  }
  const products = load("./products.ts", {
    "./client": {
      getMedusaClient: () => client,
      getMedusaPricingContext: () => ({ region_id: "reg", country_code: "cy" }),
    },
    "./product-variants": variants,
  })
  return { products, queries }
}

test("searchProducts sends trimmed 'q' parameter to Medusa Store API with pagination parameters", async () => {
  const b = boundary(catalog(30, "Shoe"))
  const result = await b.products.searchProducts("  shoe  ", 1)

  assert.equal(b.queries.length, 1)
  assert.equal(b.queries[0].q, "shoe")
  assert.equal(b.queries[0].limit, 24)
  assert.equal(b.queries[0].offset, 0)
  assert.equal(b.queries[0].order, "id")
  assert.equal(result.products.length, 24)
  assert.equal(result.count, 30)
  assert.equal(result.totalPages, 2)

  const page2 = await b.products.searchProducts("shoe", 2)
  assert.equal(b.queries[1].offset, 24)
  assert.equal(page2.products.length, 6)
})

test("searchProducts with empty or whitespace string omits 'q' parameter", async () => {
  const b = boundary(catalog(5))
  const result = await b.products.searchProducts("   ", 1)

  assert.equal(b.queries.length, 1)
  assert.equal(b.queries[0].q, undefined)
  assert.equal(result.products.length, 5)
})

test("pagination component appends '&page=' when basePath contains existing query parameters", () => {
  const { Pagination } = load("../../app/components/pagination.tsx", {
    "next/link": { default: Link },
  })
  const html = markup(
    React.createElement(Pagination, {
      basePath: "/search?q=runner",
      page: 1,
      totalPages: 3,
    })
  )

  assert.match(html, /href="\/search\?q=runner&amp;page=2"[^>]*>Next/)
  assert.match(html, /Page 1 of 3/)
  assert.doesNotMatch(html, /Previous/)

  const page2Html = markup(
    React.createElement(Pagination, {
      basePath: "/search?q=runner",
      page: 2,
      totalPages: 3,
    })
  )
  assert.match(page2Html, /href="\/search\?q=runner"[^>]*>Previous/)
  assert.match(page2Html, /href="\/search\?q=runner&amp;page=3"[^>]*>Next/)
})

test("search page renders search form and prompt when query is not provided", async () => {
  const b = boundary(catalog(10))
  const grid = ({ products }) =>
    React.createElement("p", null, `grid:${products.length}`)
  const pagination = load("../../app/components/pagination.tsx", {
    "next/link": { default: Link },
  })
  const notFound = () => {
    throw new Error("NEXT_NOT_FOUND")
  }
  const searchPage = load("../../app/search/page.tsx", {
    "next/navigation": { notFound },
    "../../lib/medusa/products": b.products,
    "../components/pagination": pagination,
    "../components/product-grid": { ProductGrid: grid },
  }).default

  const html = markup(
    await searchPage({ searchParams: Promise.resolve({}) })
  )

  assert.match(html, /<form[^>]*action="\/search"/)
  assert.match(html, /Enter a keyword to search the product catalog/)
  assert.equal(b.queries.length, 0, "Should not query Medusa when search term is omitted")
})

test("search page queries Medusa and renders matching results, count, and grid", async () => {
  const b = boundary([
    ...catalog(3, "Sneaker"),
    ...catalog(2, "Jacket"),
  ])
  const grid = ({ products }) =>
    React.createElement("div", { className: "product-grid-test" }, `items:${products.map((p) => p.title).join(",")}`)
  const pagination = load("../../app/components/pagination.tsx", {
    "next/link": { default: Link },
  })
  const notFound = () => {
    throw new Error("NEXT_NOT_FOUND")
  }
  const searchPage = load("../../app/search/page.tsx", {
    "next/navigation": { notFound },
    "../../lib/medusa/products": b.products,
    "../components/pagination": pagination,
    "../components/product-grid": { ProductGrid: grid },
  }).default

  const html = markup(
    await searchPage({
      searchParams: Promise.resolve({ q: "sneaker" }),
    })
  )

  assert.equal(b.queries.length, 1)
  assert.equal(b.queries[0].q, "sneaker")
  assert.match(html, /Found 3 products for [“"]sneaker[”"]/)
  assert.match(html, /value="sneaker"/)
  assert.match(html, /items:Sneaker 0,Sneaker 1,Sneaker 2/)
})

test("search page renders explicit empty state when query has 0 matches", async () => {
  const b = boundary(catalog(5, "T-Shirt"))
  const grid = ({ products }) =>
    React.createElement("p", null, `grid:${products.length}`)
  const pagination = load("../../app/components/pagination.tsx", {
    "next/link": { default: Link },
  })
  const notFound = () => {
    throw new Error("NEXT_NOT_FOUND")
  }
  const searchPage = load("../../app/search/page.tsx", {
    "next/navigation": { notFound },
    "../../lib/medusa/products": b.products,
    "../components/pagination": pagination,
    "../components/product-grid": { ProductGrid: grid },
  }).default

  const html = markup(
    await searchPage({
      searchParams: Promise.resolve({ q: "boots" }),
    })
  )

  assert.equal(b.queries.length, 1)
  assert.match(html, /No products found matching [“"]boots[”"]/)
  assert.doesNotMatch(html, /grid:/)
})

test("search page triggers notFound when requested page is out of range", async () => {
  const b = boundary(catalog(5, "Hat"))
  const grid = ({ products }) =>
    React.createElement("p", null, `grid:${products.length}`)
  const pagination = load("../../app/components/pagination.tsx", {
    "next/link": { default: Link },
  })
  const notFound = () => {
    throw new Error("NEXT_NOT_FOUND")
  }
  const searchPage = load("../../app/search/page.tsx", {
    "next/navigation": { notFound },
    "../../lib/medusa/products": b.products,
    "../components/pagination": pagination,
    "../components/product-grid": { ProductGrid: grid },
  }).default

  await assert.rejects(
    searchPage({
      searchParams: Promise.resolve({ q: "hat", page: "2" }),
    }),
    /NEXT_NOT_FOUND/
  )
})

test("search page fails closed with StorefrontCatalogError on backend Store API failure", async () => {
  const products = load("./products.ts", {
    "./client": {
      getMedusaClient: () => ({
        store: {
          product: {
            list: async () => {
              throw new Error("Backend connection failed")
            },
          },
        },
      }),
      getMedusaPricingContext: () => ({}),
    },
    "./product-variants": variants,
  })
  const grid = () => null
  const pagination = () => null
  const notFound = () => {}
  const searchPage = load("../../app/search/page.tsx", {
    "next/navigation": { notFound },
    "../../lib/medusa/products": products,
    "../components/pagination": pagination,
    "../components/product-grid": { ProductGrid: grid },
  }).default

  await assert.rejects(
    searchPage({
      searchParams: Promise.resolve({ q: "error-test" }),
    }),
    { name: "StorefrontCatalogError" }
  )
})
