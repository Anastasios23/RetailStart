import type { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  getCalculatedPrice,
  getInventoryStatus,
  getPrimaryVariant,
} from "@/lib/medusa/products"
import { formatMoney } from "@/lib/money"

const displayLocale = "el-CY"

export function ProductGrid({
  products,
  emptyMessage = "Δεν υπάρχουν προϊόντα αυτή τη στιγμή.",
}: {
  products: HttpTypes.StoreProduct[]
  emptyMessage?: string
}) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="grid list-none grid-cols-2 items-stretch gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const variant = getPrimaryVariant(product)
        const price = getCalculatedPrice(variant)
        const inventoryStatus = getInventoryStatus(variant)
        const href = product.handle ? `/products/${product.handle}` : "/products"
        const image = product.thumbnail || product.images?.[0]?.url
        const outOfStock = inventoryStatus !== "in_stock"
        const subtitle = product.subtitle?.trim()

        return (
          <li key={product.id} className="min-h-0">
            <Card className="flex h-full flex-col overflow-hidden border-border/80 shadow-none">
              <Link href={href} className="block shrink-0">
                <div className="relative aspect-square bg-secondary">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 220px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm font-medium text-muted-foreground">
                      Χωρίς εικόνα
                    </div>
                  )}
                </div>
              </Link>

              <CardContent className="flex flex-1 flex-col gap-1.5 pt-3">
                {subtitle ? (
                  <p className="truncate text-xs font-medium leading-4 text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-foreground">
                  {product.title}
                </p>

                <div className="mt-auto flex flex-col gap-1 pt-2">
                  <p className="text-base font-bold leading-6 tracking-tight">
                    {price
                      ? formatMoney(price.amount, price.currencyCode, displayLocale)
                      : "Τιμή μη διαθέσιμη"}
                  </p>
                  {outOfStock ? (
                    <p className="text-xs font-medium leading-4 text-muted-foreground">
                      Εξαντλημένο
                    </p>
                  ) : null}
                </div>
              </CardContent>

              <CardFooter className="mt-auto pt-0">
                {outOfStock ? (
                  <Button className="w-full" size="sm" disabled>
                    Μη διαθέσιμο
                  </Button>
                ) : (
                  <Button asChild className="w-full" size="sm">
                    <Link href={href}>Προβολή</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
