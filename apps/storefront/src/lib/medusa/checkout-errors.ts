import { FetchError } from "@medusajs/js-sdk"

export type CheckoutOperation =
  | "retrieve"
  | "region"
  | "address"
  | "shipping-options"
  | "shipping-method"

function getHttpStatus(error: unknown): number | undefined {
  if (error instanceof FetchError) {
    return error.status
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status

    return typeof status === "number" ? status : undefined
  }

  return undefined
}

export function isStaleCheckoutReferenceError(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 400 || status === 404
}

export function logCheckoutFailure(operation: CheckoutOperation, error: unknown) {
  console.error("Medusa Store API checkout operation failed", {
    operation,
    errorName: error instanceof Error ? error.name : "UnknownError",
    status: getHttpStatus(error),
  })
}

export type CheckoutActionResult = {
  status: "success" | "error"
  message: string
  fieldErrors?: Record<string, string>
}

export function getCheckoutActionErrorMessage(
  error: unknown,
  operation: Exclude<CheckoutOperation, "retrieve" | "region">
): CheckoutActionResult {
  if (isStaleCheckoutReferenceError(error)) {
    return {
      status: "error",
      message: "This guest cart is no longer available. Return to the cart and try again.",
    }
  }

  const status = getHttpStatus(error)

  if (status !== undefined && status >= 400 && status < 500) {
    return {
      status: "error",
      message:
        operation === "address"
          ? "Those contact or delivery details were rejected. Check the fields and try again."
          : "That shipping option is no longer available for this cart. Refresh and choose another option.",
    }
  }

  return {
    status: "error",
    message: "The checkout service is temporarily unavailable. Please try again.",
  }
}
