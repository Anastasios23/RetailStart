import { FetchError } from "@medusajs/js-sdk"

export type CartOperation = "create" | "retrieve" | "add" | "update" | "remove"

export type CartErrorCategory =
  | "stale_reference"
  | "backend_unavailable"
  | "rejected"
  | "no_cart"

export class CartOperationError extends Error {
  public readonly operation: CartOperation
  public readonly category: CartErrorCategory

  constructor(
    operation: CartOperation,
    category: CartErrorCategory
  ) {
    super(`Cart ${operation} failed: ${category}`)
    this.name = "CartOperationError"
    this.operation = operation
    this.category = category
  }
}

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

export function isStaleCartReferenceError(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 400 || status === 404
}

export function classifyCartError(
  error: unknown,
  operation?: CartOperation
): Exclude<CartErrorCategory, "no_cart"> {
  const status = getHttpStatus(error)

  if (status === 404) {
    if (operation === "add") {
      return "rejected"
    }

    return "stale_reference"
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return "rejected"
  }

  return "backend_unavailable"
}

export function toCartOperationError(
  error: unknown,
  operation: CartOperation
): CartOperationError {
  if (error instanceof CartOperationError) {
    return error
  }

  return new CartOperationError(operation, classifyCartError(error, operation))
}

export type CartActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export function getCartActionErrorMessage(
  error: unknown,
  operation: Exclude<CartOperation, "create" | "retrieve">
): CartActionResult {
  const cartError = toCartOperationError(error, operation)

  if (cartError.category === "rejected") {
    return {
      status: "error",
      message:
        operation === "update"
          ? "That quantity is not available. The cart was not changed."
          : operation === "add"
            ? "That item is currently unavailable in the requested quantity."
            : "The item could not be removed right now. Please try again.",
    }
  }

  if (cartError.category === "stale_reference" || cartError.category === "no_cart") {
    return {
      status: "error",
      message: "This guest cart is no longer available. Add the item again to start a new cart.",
    }
  }

  return {
    status: "error",
    message: "The cart service is temporarily unavailable. Please try again.",
  }
}
