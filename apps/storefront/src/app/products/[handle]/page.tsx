import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ProductPurchaseForm } from "../../components/product-purchase-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getProductByHandle } from "../../../lib/medusa/products"

export const dynamic = "force-dynamic"

type ProductPageProps = {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    return {
      title: "Προϊόν μη διαθέσιμο",
      robots: { index: false, follow: false },
    }
  }

  return {
    title: product.title,
    description:
      product.description?.trim() ||
      `Λεπτομέρειες και διαθεσιμότητα για ${product.title}.`,
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    notFound()
  }

  const image = product.thumbnail || product.images?.[0]?.url

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="product-title">
      <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-primary">
        <Link href="/products">← Πίσω στα προϊόντα</Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="overflow-hidden border-border/80 shadow-none">
          <div className="relative aspect-square bg-secondary">
            {image ? (
              <Image
                src={image}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 22rem"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Χωρίς εικόνα
              </div>
            )}
          </div>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
                Προϊόν
              </Badge>
              <h1 id="product-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
                {product.title}
              </h1>
              {product.subtitle ? (
                <p className="text-sm text-muted-foreground">{product.subtitle}</p>
              ) : null}
            </div>

            {product.description?.trim() ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            ) : null}

            <ProductPurchaseForm key={product.id} product={product} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
