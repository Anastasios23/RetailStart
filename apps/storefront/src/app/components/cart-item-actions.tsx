"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { removeItemAction, updateItemAction } from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type CartItemActionsProps = {
  lineItemId: string
  quantity: number
}

export function CartItemActions({
  lineItemId,
  quantity,
}: CartItemActionsProps) {
  const router = useRouter()
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateItemAction,
    initialCartActionState
  )
  const [removeState, removeFormAction, removePending] = useActionState(
    removeItemAction,
    initialCartActionState
  )

  useEffect(() => {
    if (updateState.status === "success" || removeState.status === "success") {
      router.refresh()
    }
  }, [removeState.status, router, updateState.status])

  const message =
    updateState.status === "error"
      ? updateState.message
      : removeState.status === "error"
        ? removeState.message
        : updateState.status === "success"
          ? updateState.message
          : removeState.status === "success"
            ? removeState.message
            : null

  return (
    <div className="cart-item__actions">
      <form action={updateFormAction} className="cart-mutation-form cart-mutation-form--quantity">
        <input type="hidden" name="lineItemId" value={lineItemId} />
        <label htmlFor={`quantity-${lineItemId}`}>Quantity</label>
        <input
          id={`quantity-${lineItemId}`}
          name="quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          defaultValue={quantity}
          required
        />
        <button className="button-link button-link--secondary" type="submit" disabled={updatePending}>
          {updatePending ? "Updating…" : "Update"}
        </button>
      </form>
      <form action={removeFormAction} className="cart-mutation-form">
        <input type="hidden" name="lineItemId" value={lineItemId} />
        <button className="text-button" type="submit" disabled={removePending}>
          {removePending ? "Removing…" : "Remove"}
        </button>
      </form>
      {message ? (
        <p
          className={`mutation-message${message.includes("updated") || message.includes("removed") ? "" : " mutation-message--error"}`}
          role={message.includes("updated") || message.includes("removed") ? "status" : "alert"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
