#!/usr/bin/env node
/**
 * Red-capable feedback loop for Kayia storefront order/UX bugs.
 * Exit 0 = all checks green; exit 1 = one or more FAIL.
 *
 * Usage: node scripts/diagnose-storefront.mjs
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const STORE = process.env.STOREFRONT_URL || "http://localhost:8000"
const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

function loadEnvLocal() {
  const path = resolve("apps/storefront/.env.local")
  const env = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue
    const i = line.indexOf("=")
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

const env = loadEnvLocal()
const PK = env.MEDUSA_PUBLISHABLE_KEY
const REGION = env.MEDUSA_REGION_ID
const SECRET = env.CATALOG_ENSURE_SECRET

const results = []

function check(name, ok, detail = "") {
  results.push({ name, ok, detail })
  const mark = ok ? "PASS" : "FAIL"
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`)
}

async function getHtml(path) {
  const res = await fetch(`${STORE}${path}`, { redirect: "manual" })
  const html = await res.text()
  return { status: res.status, html, location: res.headers.get("location") }
}

async function main() {
  // --- health ---
  const health = await fetch(`${BACKEND}/health`).then((r) => r.status).catch(() => 0)
  check("backend health", health === 200, `status=${health}`)

  const home = await getHtml("/")
  check("home loads", home.status === 200, `status=${home.status}`)
  check(
    "home uses shadcn shell (no legacy page-shell hero)",
    home.status === 200 &&
      home.html.includes("Τι ψάχνεις σήμερα") &&
      home.html.includes("Δες προϊόντα") &&
      !home.html.includes('class="page-shell'),
    "search + products CTA"
  )

  // --- catalog browse (Medusa SoT, ADR-0154) ---
  const products = await getHtml("/products")
  check("products page loads", products.status === 200)
  check(
    "products shows Medusa catalog chrome",
    products.html.includes("προϊόντα") || products.html.includes("Προϊόντα"),
    "catalog messaging present"
  )
  check(
    "products does not use Wolt-only chip copy as authority",
    !products.html.includes("3.979 προϊόντα από το κατάστημα")
  )

  // --- Store API product + cart line item (no ensure) ---
  if (!PK || !REGION) {
    check("env secrets present", false, "missing MEDUSA_*")
  } else {
    const listRes = await fetch(
      `${BACKEND}/store/products?limit=1&fields=*variants,*variants.calculated_price`,
      { headers: { "x-publishable-api-key": PK } }
    )
    const listBody = await listRes.json().catch(() => ({}))
    const product = (listBody.products || [])[0]
    const variantId = product?.variants?.[0]?.id
    const handle = product?.handle
    check(
      "store products list returns a variant",
      listRes.ok && Boolean(variantId),
      `status=${listRes.status} variant=${variantId || "none"}`
    )

    if (handle) {
      const pdp = await getHtml(`/products/${encodeURIComponent(handle)}`)
      check("Medusa PDP loads", pdp.status === 200)
      check(
        "Medusa PDP has Greek add-to-cart (not Wolt order CTA)",
        (pdp.html.includes("Προσθήκη") || pdp.html.includes("καλάθι")) &&
          !pdp.html.includes("Παράγγειλε στο Wolt")
      )
    } else {
      check("Medusa PDP loads", false, "no product handle")
      check("Medusa PDP has Greek add-to-cart (not Wolt order CTA)", false, "no product handle")
    }

    if (variantId) {
      const cartRes = await fetch(`${BACKEND}/store/carts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": PK,
        },
        body: JSON.stringify({ region_id: REGION }),
      })
      const cartBody = await cartRes.json().catch(() => ({}))
      const cartId = cartBody.cart?.id
      check("create cart", Boolean(cartId), `status=${cartRes.status}`)

      if (cartId) {
        const lineRes = await fetch(`${BACKEND}/store/carts/${cartId}/line-items`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-publishable-api-key": PK,
          },
          body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
        })
        const lineBody = await lineRes.json().catch(() => ({}))
        const items = lineBody.cart?.items || []
        check(
          "add line item to cart",
          lineRes.ok && items.length >= 1,
          `status=${lineRes.status} items=${items.length}`
        )
        const currency = lineBody.cart?.currency_code
        const total = lineBody.cart?.total ?? lineBody.cart?.subtotal
        check(
          "cart has currency + total for summary UI",
          Boolean(currency) && total != null && Number.isFinite(Number(total)),
          `currency=${currency || "missing"} total=${total ?? "missing"}`
        )
      }
    }
  }

  // --- cart / checkout HTML ---
  const cartPage = await getHtml("/cart")
  check("cart page loads without server error", cartPage.status === 200 && !cartPage.html.includes("Application error"))
  check(
    "cart page uses Greek shadcn chrome",
    cartPage.html.includes("Το καλάθι σου") || cartPage.html.includes("άδειο")
  )

  // Empty-cart checkout redirects to /cart (307) — expected.
  // With an API cart cookie we cannot easily set here; assert redirect or Greek chrome.
  const checkout = await getHtml("/checkout")
  const checkoutOk =
    (checkout.status === 200 &&
      !checkout.html.includes("Application error") &&
      (checkout.html.includes("Ολοκλήρωση") ||
        checkout.html.includes("checkout") ||
        checkout.html.includes("Το καλάθι"))) ||
    (checkout.status >= 300 &&
      checkout.status < 400 &&
      (checkout.location || "").includes("/cart"))
  check("checkout page loads or redirects empty cart to /cart", checkoutOk, `status=${checkout.status}`)
  check(
    "checkout chrome is Greek when rendered",
    checkout.status !== 200 ||
      checkout.html.includes("Ολοκλήρωση παραγγελίας") ||
      checkout.html.includes("Το καλάθι") ||
      !checkout.html.includes("Guest checkout"),
    "legacy English guest checkout chrome"
  )

  // --- Medusa PDP / categories leftover English ---
  const medusaPdp = await getHtml("/products/development-physical-goods-test-product")
  if (medusaPdp.status === 200) {
    check(
      "Medusa PDP Greek/shadcn (not English Add to cart / page-shell)",
      medusaPdp.html.includes("Προσθήκη στο καλάθι") &&
        !medusaPdp.html.includes(">Add to cart<") &&
        !medusaPdp.html.includes("Product detail") &&
        !medusaPdp.html.includes('class="page-shell'),
      "legacy English PDP still present"
    )
  } else {
    check("Medusa PDP reachable", false, `status=${medusaPdp.status}`)
  }

  const categories = await getHtml("/categories")
  check(
    "categories page Greek/shadcn",
    categories.status === 200 &&
      categories.html.includes("Κατηγορίες") &&
      !categories.html.includes(">Catalog<") &&
      !categories.html.includes('class="page-shell'),
    "legacy English categories"
  )

  // --- search ---
  const search = await getHtml("/search?q=korres")
  check("search returns results chrome", search.status === 200)
  check(
    "search shows Greek results copy",
    search.html.includes("προϊόν") || search.html.includes("Αναζήτηση")
  )

  const failed = results.filter((r) => !r.ok)
  console.log("\n---")
  console.log(`${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.log("Failures:")
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("LOOP CRASH", err)
  process.exit(1)
})
