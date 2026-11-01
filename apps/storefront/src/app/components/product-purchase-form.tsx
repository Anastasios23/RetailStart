"use client"

import type { HttpTypes } from "@medusajs/types"
import { useId, useState } from "react"

import {
  getAutomaticVariant,
  getCalculatedPrice,
  getInventoryStatus,
  getProductOptions,
  isVariantPurchasable,
  resolveVariantSelection,
} from "../../lib/medusa/product-variants"
import { formatMoney } from "../../lib/money"
import { AddToCartForm } from "./add-to-cart-form"

const inventoryLabels = {
  in_stock: "Διαθέσιμο",
  out_of_stock: "Εξαντλημένο",
  unavailable: "Μη διαθέσιμο",
} as const

const selectionMessages = {
  incomplete: "Επίλεξε όλες τις επιλογές για να δεις τη διαθεσιμότητα.",
  nonexistent: "Αυτός ο συνδυασμός δεν υπάρχει. Δοκίμασε άλλη επιλογή.",
  ambiguous: "Αυτός ο συνδυασμός δεν μπορεί να προστεθεί στο καλάθι.",
  malformed: "Τα στοιχεία παραλλαγής δεν είναι διαθέσιμα αυτή τη στιγμή.",
} as const

export function ProductPurchaseForm({ product }: { product: HttpTypes.StoreProduct }) {
  const [selections, setSelections] = useState<Record<string, string>>({})
  const id = useId()
  const options = getProductOptions(product)
  const automaticVariant = getAutomaticVariant(product)
  const result = resolveVariantSelection(product, selections)
  const variant = automaticVariant ?? result.variant
  const price = getCalculatedPrice(variant)
  const inventoryStatus = getInventoryStatus(variant)
  const purchasable = isVariantPurchasable(variant)
  const showSelectors = (product.variants?.length ?? 0) > 1 && !automaticVariant && options?.length
  const message = !(product.variants?.length)
    ? "Τα στοιχεία παραλλαγής δεν είναι διαθέσιμα. Δεν μπορεί να προστεθεί στο καλάθι."
    : variant
      ? !price
        ? "Δεν υπάρχει διαθέσιμη τιμή για αυτή την παραλλαγή."
        : !purchasable
          ? "Το προϊόν δεν είναι διαθέσιμο για προσθήκη στο καλάθι."
          : "Έτοιμο για προσθήκη στο καλάθι."
      : result.status === "resolved"
        ? "Τα στοιχεία παραλλαγής δεν είναι διαθέσιμα."
        : selectionMessages[result.status]

  return (
    <AddToCartForm variantId={purchasable ? variant!.id : null} disabled={!purchasable}>
      {showSelectors ? (
        <div className="flex flex-col gap-3">
          {options!.map((option) => (
            <div className="flex flex-col gap-1.5" key={option.id}>
              <label className="text-sm font-medium" htmlFor={`${id}-${option.id}`}>
                {option.title}
              </label>
              <select
                id={`${id}-${option.id}`}
                name={`option-${option.id}`}
                required
                value={selections[option.id] ?? ""}
                aria-describedby={`${id}-selection-status`}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setSelections((current) => ({
                    ...current,
                    [option.id]: event.target.value,
                  }))
                }
              >
                <option value="">Επίλεξε {option.title}</option>
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
        <p className="text-2xl font-bold tracking-tight">
          {price ? formatMoney(price.amount, price.currencyCode, "el-CY") : "Τιμή μη διαθέσιμη"}
        </p>
        <p className="text-sm text-muted-foreground">{inventoryLabels[inventoryStatus]}</p>
        <p
          id={`${id}-selection-status`}
          className={`text-sm ${purchasable ? "text-muted-foreground" : "text-destructive"}`}
        >
          {message}
        </p>
      </div>
    </AddToCartForm>
  )
}
