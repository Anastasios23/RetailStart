/**
 * Browse catalog mirrored from the pharmacy's public Wolt venue assortment.
 * Visual / discovery UX — Medusa remains the cart/checkout source of truth.
 */
import woltCatalog from "./wolt-catalog.json"

export type DemoProduct = {
  id: string
  title: string
  brand: string
  price_eur: number
  section: "featured" | "popular" | null
  image: string
  image_alt: string
  categories: string[]
}

export type CategoryChip = {
  label: string
  href: string
  icon: "sparkles" | "droplet" | "heart" | "pill" | "baby" | "sun"
}

type RawCatalogProduct = {
  id: string
  title: string
  brand: string
  price_eur: number
  image: string
  image_alt: string
  categories: string[]
  section: "featured" | "popular" | null
}

const PAGE_SIZE = 24

const rawProducts = woltCatalog.products as RawCatalogProduct[]

export const DEMO_PRODUCTS: DemoProduct[] = rawProducts.map((product) => ({
  ...product,
  section: product.section,
  image: product.image || "",
}))

export const CATALOG_COUNT = DEMO_PRODUCTS.length

export const CATEGORY_CHIPS: CategoryChip[] = [
  { label: "Πρόσωπο", href: "/products?q=face", icon: "sparkles" },
  { label: "Σώμα", href: "/products?q=body", icon: "droplet" },
  { label: "Μαλλιά", href: "/products?q=hair", icon: "heart" },
  { label: "Συμπληρώματα", href: "/products?q=vitamin", icon: "pill" },
  { label: "Παιδί", href: "/products?q=baby", icon: "baby" },
  { label: "Αντηλιακά", href: "/products?q=sun", icon: "sun" },
]

const queryAliases: Record<string, string[]> = {
  face: [
    "face",
    "dermocosmetic",
    "serum",
    "cream",
    "toner",
    "cleanser",
    "mask",
    "acne",
    "eye",
    "scrub",
  ],
  body: ["body", "shower", "hand", "foot", "deodorant", "wash", "intimate"],
  hair: ["hair", "shampoo", "conditioner", "dandruff", "nizoral", "curlie"],
  vitamin: [
    "supplement",
    "vitamin",
    "omega",
    "magnesium",
    "magnelon",
    "gummies",
    "protein",
  ],
  baby: ["baby", "kid", "kids", "mother", "mustela", "almiron"],
  sun: ["sun", "spf", "tanning", "sunscreen", "tan"],
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function productMatchesQuery(product: DemoProduct, query: string) {
  const q = normalize(query)
  if (!q) return true

  const aliases = queryAliases[q] ?? [q]
  const haystack = normalize(
    [product.title, product.brand, ...product.categories].join(" ")
  )

  return aliases.some((alias) => haystack.includes(alias))
}

export function productsForSection(section: "featured" | "popular") {
  const bySection = DEMO_PRODUCTS.filter((product) => product.section === section)
  if (bySection.length > 0) return bySection

  // Fallback if section tags are missing: first priced products with images
  return DEMO_PRODUCTS.filter((product) => product.image).slice(
    section === "featured" ? 0 : 8,
    section === "featured" ? 8 : 16
  )
}

export function getCatalogProduct(id: string) {
  return DEMO_PRODUCTS.find((product) => product.id === id) ?? null
}

export function listCatalogProducts({
  page = 1,
  query = "",
}: {
  page?: number
  query?: string
}) {
  const filtered = DEMO_PRODUCTS.filter((product) => productMatchesQuery(product, query))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * PAGE_SIZE

  return {
    products: filtered.slice(start, start + PAGE_SIZE),
    page: safePage,
    totalPages,
    total: filtered.length,
    query,
  }
}
