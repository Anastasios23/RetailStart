"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  addItemAction,
} from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type AddToCartFormProps = {
  variantId: string | null
  disabled?: boolean
  children?: React.ReactNode
}

export function AddToCartForm({ variantId, disabled = false, children }: AddToCartFormProps) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [state, formAction, pending] = useActionState(
    addItemAction,
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
    <form
      action={formAction}
      className="cart-mutation-form"
      onSubmit={(event) => {
        if (!hydrated || !variantId || disabled || pending) event.preventDefault()
      }}
    >
      <input type="hidden" name="variantId" value={variantId ?? ""} />
      <input type="hidden" name="quantity" value="1" />
      <fieldset className="product-purchase-fields" disabled={!hydrated || pending}>
        <legend className="sr-only">Add product to cart</legend>
        {children}
        <button className="button-link" type="submit" disabled={!hydrated || pending || disabled || !variantId}>
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </fieldset>
      {state.status === "error" ? (
        <p className="mutation-message mutation-message--error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
