"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { removeItemAction, updateItemAction } from "../actions/cart-actions"
import { initialCartActionState } from "../actions/cart-action-state"

type CartItemActionsProps = {
  lineItemId: string
  quantity: number
}

export function CartItemActions({ lineItemId, quantity }: CartItemActionsProps) {
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

  const isSuccess =
    Boolean(message) &&
    (message!.includes("updated") ||
      message!.includes("removed") ||
      message!.includes("ενημερώ") ||
      message!.includes("αφαιρέ"))

  return (
    <div className="flex flex-col gap-3">
      <form action={updateFormAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="lineItemId" value={lineItemId} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`quantity-${lineItemId}`} className="text-xs font-medium text-muted-foreground">
            Ποσότητα
          </label>
          <Input
            id={`quantity-${lineItemId}`}
            name="quantity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={quantity}
            required
            className="h-10 w-24 rounded-xl"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={updatePending}>
          {updatePending ? "Ενημέρωση…" : "Ενημέρωση"}
        </Button>
      </form>

      <form action={removeFormAction}>
        <input type="hidden" name="lineItemId" value={lineItemId} />
        <Button type="submit" variant="ghost" size="sm" className="px-0 text-destructive" disabled={removePending}>
          {removePending ? "Αφαίρεση…" : "Αφαίρεση"}
        </Button>
      </form>

      {message ? (
        <p
          className={`text-sm ${isSuccess ? "text-muted-foreground" : "text-destructive"}`}
          role={isSuccess ? "status" : "alert"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
