export type CheckoutProgress =
  | "contact_address_incomplete"
  | "shipping_required"
  | "totals_unavailable"
  | "ready_for_payment"

export function deriveCheckoutProgress(input: {
  hasContactAddress: boolean
  hasShippingMethod: boolean
  hasCurrentTotals: boolean
}): CheckoutProgress {
  if (!input.hasContactAddress) {
    return "contact_address_incomplete"
  }

  if (!input.hasShippingMethod) {
    return "shipping_required"
  }

  if (!input.hasCurrentTotals) {
    return "totals_unavailable"
  }

  return "ready_for_payment"
}

export function hasCurrentCheckoutTotals(cart: {
  currency_code?: string
  item_subtotal?: number
  item_tax_total?: number
  shipping_subtotal?: number
  shipping_tax_total?: number
  shipping_total?: number
  subtotal?: number
  tax_total?: number
  total?: number
}): boolean {
  const requiredValues = [
    cart.item_subtotal,
    cart.item_tax_total,
    cart.shipping_subtotal,
    cart.shipping_tax_total,
    cart.shipping_total,
    cart.subtotal,
    cart.tax_total,
    cart.total,
  ]

  return Boolean(
    cart.currency_code?.trim() &&
      requiredValues.every((value) => typeof value === "number" && Number.isFinite(value))
  )
}
