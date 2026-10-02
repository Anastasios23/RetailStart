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
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  unavailable: "Availability unavailable",
} as const

const selectionMessages = {
  incomplete: "Choose an option for each field to view this variant.",
  nonexistent: "This option combination is not available. Choose another combination.",
  ambiguous: "This option combination cannot be uniquely identified and cannot be added to the cart.",
  malformed: "Variant details are currently unavailable. This item cannot be added to the cart.",
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
    ? "Variant details are currently unavailable. This item cannot be added to the cart."
    : variant
    ? !price
      ? "This variant has no available price and cannot be added to the cart."
      : !purchasable
        ? "This item is not currently available to add to the cart."
        : "Selected variant is available to add to the cart."
    : result.status === "resolved"
      ? "Variant details are currently unavailable."
      : selectionMessages[result.status]

  return (
    <AddToCartForm variantId={purchasable ? variant!.id : null} disabled={!purchasable}>
      {showSelectors ? (
        <div className="product-options">
          {options!.map((option) => (
            <div className="product-option" key={option.id}>
              <label htmlFor={`${id}-${option.id}`}>{option.title}</label>
              <select
                id={`${id}-${option.id}`}
                name={`option-${option.id}`}
                required
                value={selections[option.id] ?? ""}
                aria-describedby={`${id}-selection-status`}
                onChange={(event) => setSelections((current) => ({
                  ...current,
                  [option.id]: event.target.value,
                }))}
              >
                <option value="">Choose {option.title}</option>
                {option.values.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true">
        <section className="product-detail__summary" aria-labelledby={`${id}-summary-title`}>
          <h2 id={`${id}-summary-title`} className="sr-only">Product summary</h2>
          <p className="price price--large">
            {price ? formatMoney(price.amount, price.currencyCode, "en-CY") : "Price unavailable"}
          </p>
          <p className={`stock stock--${inventoryStatus}`}>{inventoryLabels[inventoryStatus]}</p>
        </section>
        {variant ? (
          <section className="variant-details" aria-labelledby={`${id}-variant-title`}>
            <h2 id={`${id}-variant-title`}>Variant</h2>
            <dl className="facts-list">
              {variant.title ? <div><dt>Name</dt><dd>{variant.title}</dd></div> : null}
              {variant.sku ? <div><dt>SKU</dt><dd>{variant.sku}</dd></div> : null}
              {automaticVariant && options?.map((option) => (
                <div key={option.id}>
                  <dt>{option.title}</dt>
                  <dd>{variant.options?.find((value) => value.option_id === option.id)?.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <p id={`${id}-selection-status`} className={`mutation-message${purchasable ? "" : " mutation-message--error"}`}>
          {message}
        </p>
      </div>
    </AddToCartForm>
  )
}
