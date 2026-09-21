import type { CheckoutFieldErrors } from "../../lib/medusa/checkout-validation"

export type CheckoutActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: CheckoutFieldErrors
}

export const initialCheckoutActionState: CheckoutActionState = {
  status: "idle",
}
