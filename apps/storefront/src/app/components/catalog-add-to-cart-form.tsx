"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { addCatalogItemAction } from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type CatalogAddToCartFormProps = {
  catalogId: string
  title: string
  brand: string
  priceEur: number
  image: string
}

export function CatalogAddToCartForm({
  catalogId,
  title,
  brand,
  priceEur,
  image,
}: CatalogAddToCartFormProps) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [state, formAction, pending] = useActionState(
    addCatalogItemAction,
    initialCartActionState
  )

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (state.status === "success") {
      router.push("/cart")
    }
  }, [router, state.status])

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="catalogId" value={catalogId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="brand" value={brand} />
      <input type="hidden" name="priceEur" value={String(priceEur)} />
      <input type="hidden" name="image" value={image} />
      <Button type="submit" disabled={!hydrated || pending} className="w-full sm:w-auto">
        {pending ? "Προσθήκη…" : "Προσθήκη στο καλάθι"}
      </Button>
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
