import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CheckoutForm } from "../components/checkout-form"
import { getCheckoutPageData } from "../../lib/medusa/checkout"
import { ConfirmationClient } from "./confirmation/confirmation-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Ολοκλήρωση παραγγελίας με στοιχεία επικοινωνίας, παράδοση και πληρωμή.",
}

function CheckoutUnavailableState() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
        Checkout
      </Badge>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Το checkout δεν είναι διαθέσιμο προσωρινά</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Δεν μπορέσαμε να φορτώσουμε την κατάσταση παραγγελίας. Το καλάθι σας δεν άλλαξε.
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/checkout">Δοκίμασε ξανά</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cart">Επιστροφή στο καλάθι</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

function CheckoutReconciliationUnavailableState() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
        Checkout
      </Badge>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Η επιβεβαίωση παραγγελίας δεν είναι διαθέσιμη</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Η πληρωμή φαίνεται ολοκληρωμένη, αλλά δεν μπορέσαμε να εμφανίσουμε την επιβεβαίωση. Μην
          πληρώσετε ξανά — ανανεώστε για έλεγχο κατάστασης.
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/checkout">Έλεγχος κατάστασης</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export default async function CheckoutPage() {
  const result = await getCheckoutPageData()

  if (result.kind === "redirect") {
    redirect("/cart")
  }

  if (result.kind === "unavailable") {
    return <CheckoutUnavailableState />
  }

  if (result.kind === "reconciliation-unavailable") {
    return <CheckoutReconciliationUnavailableState />
  }

  if (result.kind === "confirmation") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <ConfirmationClient {...result.confirmation} />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6" aria-labelledby="checkout-title">
      <header className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
          Checkout
        </Badge>
        <h1 id="checkout-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ολοκλήρωση παραγγελίας
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Συμπλήρωσε στοιχεία επικοινωνίας και παράδοσης, επίλεξε αποστολή και πλήρωσε ασφαλή με
          κάρτα.
        </p>
      </header>
      <CheckoutForm
        cart={result.cart}
        countries={result.countries}
        shippingOptions={result.shippingOptions}
        shippingOptionsUnavailable={result.shippingOptionsUnavailable}
        payment={result.payment}
        paymentUnavailable={result.paymentUnavailable}
        paymentIssue={result.paymentIssue}
        publishableKey={result.publishableKey}
      />
    </main>
  )
}
