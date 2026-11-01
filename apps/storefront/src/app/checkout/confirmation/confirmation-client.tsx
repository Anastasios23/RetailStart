"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "../../../lib/money"

type ConfirmationClientProps = {
  currencyCode: string
  customDisplayId?: string
  displayId?: number
  total: number
}

export function ConfirmationClient({
  currencyCode,
  customDisplayId,
  displayId,
  total,
}: ConfirmationClientProps) {
  const clearStarted = useRef(false)

  useEffect(() => {
    if (clearStarted.current) {
      return
    }

    clearStarted.current = true
    // Same-origin Route Handler: it verifies the completed order itself and then
    // clears the continuity cookie without re-rendering this page. The posted
    // values come from the server-verified render above; they are not authority,
    // only the expected identity so a stale tab cannot clear a newer cart. A
    // failed request leaves the confirmation shown and the cookie in place.
    void fetch("/checkout/confirmation/clear", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayId, customDisplayId, total, currencyCode }),
    }).catch(() => {})
  }, [currencyCode, customDisplayId, displayId, total])

  const reference = customDisplayId || displayId

  return (
    <div className="flex flex-col gap-6">
      <Badge variant="secondary" className="w-fit bg-accent text-accent-foreground">
        Επιβεβαίωση
      </Badge>
      <Card className="shadow-none" aria-labelledby="checkout-confirmation-title">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">Πληρωμή ολοκληρώθηκε</p>
          <CardTitle id="checkout-confirmation-title">Ευχαριστούμε για την παραγγελία</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            Η πληρωμή καταχωρήθηκε και η παραγγελία επιβεβαιώθηκε.
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {reference !== undefined ? (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Αριθμός</dt>
                <dd className="font-semibold">{reference}</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Σύνολο</dt>
              <dd className="font-semibold">{formatMoney(total, currencyCode, "el-CY")}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Νόμισμα</dt>
              <dd className="font-semibold">{currencyCode.toUpperCase()}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/products">Συνέχεια αγορών</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
