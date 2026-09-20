"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  addItemAction,
} from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type AddToCartFormProps = {
  variantId: string
}

export function AddToCartForm({ variantId }: AddToCartFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    addItemAction,
    initialCartActionState
  )

  useEffect(() => {
    if (state.status === "success") {
      router.push("/cart")
    }
  }, [router, state.status])

  return (
    <form action={formAction} className="cart-mutation-form">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <button className="button-link" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add to cart"}
      </button>
      {state.status === "error" ? (
        <p className="mutation-message mutation-message--error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
