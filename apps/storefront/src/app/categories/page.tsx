import type { Metadata } from "next"
import Link from "next/link"

import { MedusaCategoryRow } from "@/components/medusa-category-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listCategories } from "../../lib/medusa/categories"
import { StorefrontCatalogError } from "../../lib/medusa/products"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Κατηγορίες",
  description: "Περιήγηση κατηγοριών personal care, wellness και καλλυντικών.",
}

export default async function CategoriesPage() {
  let medusaCategories: Awaited<ReturnType<typeof listCategories>> = []
  let unavailable = false

  try {
    medusaCategories = await listCategories()
  } catch (error) {
    if (error instanceof StorefrontCatalogError) {
      unavailable = true
    } else {
      throw error
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="categories-title">
      <header className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
          Κατηγορίες
        </Badge>
        <h1 id="categories-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Κατηγορίες
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Επίλεξε κατηγορία για να δεις προϊόντα από τον κατάλογο του καταστήματος.
        </p>
      </header>

      {unavailable ? (
        <p className="text-sm text-muted-foreground">
          Οι κατηγορίες δεν είναι διαθέσιμες προσωρινά.
        </p>
      ) : (
        <>
          <MedusaCategoryRow categories={medusaCategories} />

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/products">Όλα τα προϊόντα</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">Αναζήτηση</Link>
            </Button>
          </div>

          {medusaCategories.length > 0 ? (
            <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {medusaCategories.map((category) => (
                <li key={category.id}>
                  <Card className="shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        <Link
                          className="hover:text-primary"
                          href={`/categories/${encodeURIComponent(category.handle)}`}
                        >
                          {category.name}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Προβολή προϊόντων κατηγορίας
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Δεν υπάρχουν κατηγορίες ακόμα. Δείτε όλα τα προϊόντα από τον κατάλογο.
            </p>
          )}
        </>
      )}
    </main>
  )
}
