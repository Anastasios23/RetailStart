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

export function ProductCard({ product }: { product: DemoProduct }) {
  const href = `/catalog/${product.id}`

  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
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
        <p className="text-xs font-medium text-muted-foreground">{product.brand}</p>
        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-foreground">
          {product.title}
        </p>
        <p className="text-base font-bold tracking-tight">{formatEuro(product.price_eur)}</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" size="sm">
          <Link href={href}>Προσθήκη</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
