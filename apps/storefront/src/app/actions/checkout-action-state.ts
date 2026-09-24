import type { CheckoutFieldErrors } from "../../lib/medusa/checkout-validation"
import type {
  CheckoutConfirmation,
  CheckoutPaymentState,
} from "../../lib/medusa/checkout-payment"

export type CheckoutActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: CheckoutFieldErrors
  paymentState?: CheckoutPaymentState
  confirmation?: CheckoutConfirmation
}

export const initialCheckoutActionState: CheckoutActionState = {
  status: "idle",
}
