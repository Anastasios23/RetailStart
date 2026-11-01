import type { HttpTypes } from "@medusajs/types"
import type { Metadata } from "next"
import Link from "next/link"

import { CartItemActions } from "@/app/components/cart-item-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getCurrentCart } from "@/lib/medusa/cart"
import { formatMoney } from "@/lib/money"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Καλάθι",
  description: "Δείτε τα προϊόντα στο καλάθι σας πριν το checkout.",
}

const displayLocale = "el-CY"

function formatCartAmount(amount: number | undefined, currencyCode?: string | null): string | null {
  if (amount === undefined || !Number.isFinite(amount)) {
    return null
  }

  return formatMoney(amount, currencyCode?.trim() || "eur", displayLocale)
}

function CartEmptyState({ stale }: { stale: boolean }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Το καλάθι είναι άδειο</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {stale
          ? "Το προηγούμενο καλάθι δεν είναι πλέον διαθέσιμο. Ξεκινήστε νέο από τον κατάλογο."
          : "Προσθέστε ένα προϊόν για να ξεκινήσετε την παραγγελία."}
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/products">Δες προϊόντα</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function CartUnavailableState() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Το καλάθι δεν είναι διαθέσιμο</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Δεν μπορέσαμε να φορτώσουμε το καλάθι. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/cart">Δοκίμασε ξανά</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function CartLineItem({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
}) {
  const lineTotal = formatCartAmount(item.total ?? item.item_total, currencyCode)
  const unitPrice = formatCartAmount(item.unit_price, currencyCode)
  const variantLabel = item.variant_title || item.variant_sku

  return (
    <li>
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="text-base font-semibold leading-snug">
              {item.product_title || item.title}
            </h2>
            {variantLabel ? (
              <p className="text-sm text-muted-foreground">{variantLabel}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {unitPrice ? (
                <p>
                  <span className="text-muted-foreground">Τιμή: </span>
                  <span className="font-medium">{unitPrice}</span>
                </p>
              ) : null}
              {lineTotal ? (
                <p>
                  <span className="text-muted-foreground">Σύνολο γραμμής: </span>
                  <span className="font-semibold">{lineTotal}</span>
                </p>
              ) : null}
            </div>
          </div>
          <CartItemActions lineItemId={item.id} quantity={item.quantity} />
        </CardContent>
      </Card>
    </li>
  )
}

function CartSummary({ cart }: { cart: HttpTypes.StoreCart }) {
  const subtotal = formatCartAmount(cart.subtotal, cart.currency_code)
  const total = formatCartAmount(cart.total, cart.currency_code)

  return (
    <aside aria-labelledby="cart-summary-title">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle id="cart-summary-title">Σύνοψη</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {subtotal ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Υποσύνολο</span>
              <span className="font-medium">{subtotal}</span>
            </div>
          ) : null}
          {total ? (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="font-semibold">Σύνολο</span>
                <span className="font-bold">{total}</span>
              </div>
            </>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Οι τιμές έρχονται από το σύστημα του φαρμακείου. Η πληρωμή ολοκληρώνεται στο checkout.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/checkout">Συνέχεια στο checkout</Link>
          </Button>
        </CardFooter>
      </Card>
    </aside>
  )
}

export default async function CartPage() {
  const result = await getCurrentCart()

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="cart-title">
      <header className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
          Καλάθι
        </Badge>
        <h1 id="cart-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Το καλάθι σου
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Έλεγχος προϊόντων πριν την ολοκλήρωση της παραγγελίας.
        </p>
      </header>

      {result.kind === "missing" ? <CartEmptyState stale={false} /> : null}
      {result.kind === "stale" ? <CartEmptyState stale /> : null}
      {result.kind === "unavailable" ? <CartUnavailableState /> : null}
      {result.kind === "available" ? (
        result.cart.items?.length ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="cart-items-title">
              <h2 id="cart-items-title" className="sr-only">
                Προϊόντα καλαθιού
              </h2>
              <ul className="flex list-none flex-col gap-3 p-0">
                {result.cart.items.map((item) => (
                  <CartLineItem
                    key={item.id}
                    item={item}
                    currencyCode={result.cart.currency_code}
                  />
                ))}
              </ul>
            </section>
            <CartSummary cart={result.cart} />
          </div>
        ) : (
          <CartEmptyState stale={false} />
        )
      ) : null}
    </main>
  )
}
