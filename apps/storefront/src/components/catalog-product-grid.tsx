import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { DemoProduct } from "@/lib/presentation/demo-catalog"

function formatEuro(amount: number) {
  return new Intl.NumberFormat("el-CY", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export function CatalogProductGrid({
  products,
  emptyMessage = "Δεν βρέθηκαν προϊόντα.",
}: {
  products: DemoProduct[]
  emptyMessage?: string
}) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const href = `/catalog/${product.id}`

        return (
          <li key={product.id}>
            <Card className="h-full overflow-hidden border-border/80 shadow-none">
              <Link href={href} className="block min-h-0">
                <div className="relative aspect-square bg-secondary">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.image_alt || product.title}
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
              <CardContent className="flex flex-col gap-1 pt-3">
                {product.brand ? (
                  <p className="text-xs font-medium text-muted-foreground">{product.brand}</p>
                ) : null}
                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-foreground">
                  {product.title}
                </p>
                <p className="text-base font-bold tracking-tight">
                  {formatEuro(product.price_eur)}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" size="sm">
                  <Link href={href}>Προσθήκη</Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
