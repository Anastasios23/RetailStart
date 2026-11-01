"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { addItemAction } from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type AddToCartFormProps = {
  variantId: string | null
  disabled?: boolean
  children?: React.ReactNode
}

export function AddToCartForm({ variantId, disabled = false, children }: AddToCartFormProps) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [state, formAction, pending] = useActionState(addItemAction, initialCartActionState)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (state.status === "success") {
      router.push("/cart")
    }
  }, [router, state.status])

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        if (!hydrated || !variantId || disabled || pending) event.preventDefault()
      }}
    >
      <input type="hidden" name="variantId" value={variantId ?? ""} />
      <input type="hidden" name="quantity" value="1" />
      <fieldset className="flex flex-col gap-4 border-0 p-0" disabled={!hydrated || pending}>
        <legend className="sr-only">Προσθήκη στο καλάθι</legend>
        {children}
        <Button
          type="submit"
          disabled={!hydrated || pending || disabled || !variantId}
          className="w-full sm:w-auto"
        >
          {pending ? "Προσθήκη…" : "Προσθήκη στο καλάθι"}
        </Button>
      </fieldset>
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
