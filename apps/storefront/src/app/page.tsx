import Link from "next/link"

import { ProductGrid } from "@/app/components/product-grid"
import { MedusaCategoryRow } from "@/components/medusa-category-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CLIENT_STORE,
  getActivePresentationConfig,
} from "@/lib/presentation/client-bundle"
import { listCategories } from "@/lib/medusa/categories"
import { listProducts, StorefrontCatalogError } from "@/lib/medusa/products"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const presentation = getActivePresentationConfig()

  let featured: Awaited<ReturnType<typeof listProducts>>["products"] = []
  let popular: Awaited<ReturnType<typeof listProducts>>["products"] = []
  let categories: Awaited<ReturnType<typeof listCategories>> = []

  try {
    const [productPage, medusaCategories] = await Promise.all([
      listProducts(1),
      listCategories(),
    ])
    featured = productPage.products.slice(0, 8)
    popular = productPage.products.slice(0, 8)
    categories = medusaCategories
  } catch (error) {
    if (!(error instanceof StorefrontCatalogError)) {
      throw error
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <section className="rounded-3xl bg-secondary px-5 py-6 sm:px-8 sm:py-8">
        <Badge variant="secondary" className="mb-3 bg-white text-primary">
          Λατσιά · Home delivery
        </Badge>
        <h1 className="max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {presentation.static_content?.hero?.heading ?? presentation.branding.name}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {presentation.static_content?.hero?.subheading}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/products">Δες προϊόντα</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${CLIENT_STORE.phone_tel}`}>Κάλεσε μας</a>
          </Button>
        </div>
      </section>

      <MedusaCategoryRow categories={categories} />

      <section className="flex flex-col gap-4" aria-labelledby="featured-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="featured-title" className="text-xl font-bold tracking-tight">
            Νέα
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href="/products">Όλα</Link>
          </Button>
        </div>
        <ProductGrid
          products={featured}
          emptyMessage="Δεν υπάρχουν προϊόντα στον κατάλογο ακόμα."
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="popular-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="popular-title" className="text-xl font-bold tracking-tight">
            Δημοφιλή
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href="/products">Όλα</Link>
          </Button>
        </div>
        <ProductGrid
          products={popular}
          emptyMessage="Δεν υπάρχουν προϊόντα στον κατάλογο ακόμα."
        />
      </section>

      <section className="rounded-3xl border border-border bg-card px-5 py-5 text-sm text-muted-foreground">
        Συνταγές και φαρμακευτική συμβουλή στο κατάστημα ·{" "}
        <a className="font-medium text-foreground" href={`tel:${CLIENT_STORE.phone_tel}`}>
          {CLIENT_STORE.phone}
        </a>
      </section>
    </main>
  )
}
