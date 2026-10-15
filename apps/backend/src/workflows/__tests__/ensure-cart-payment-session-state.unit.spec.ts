import {
  classifyCartPaymentSession,
  shouldRefreshPaymentCollection,
  buildPaymentSessionInput,
  type CartPaymentSnapshot,
} from "../ensure-cart-payment-session-state"

const baseCart = (overrides: Partial<CartPaymentSnapshot> = {}) => ({
  id: "cart_1",
  currency_code: "eur",
  total: 1200,
  payment_collection: {
    id: "paycol_1",
    status: "not_paid",
    amount: 1200,
    currency_code: "eur",
    payment_sessions: [
      {
        id: "paysess_1",
        provider_id: "pp_stripe_stripe",
        status: "pending",
        amount: 1200,
        currency_code: "eur",
        data: { client_secret: "pi_secret" },
      },
    ],
  },
  ...overrides,
}) satisfies CartPaymentSnapshot

describe("classifyCartPaymentSession", () => {
  it("reuses a current pending Stripe session with a client secret", () => {
    expect(classifyCartPaymentSession(baseCart())).toEqual({
      kind: "reuse",
      sessionId: "paysess_1",
    })
  })

  it("requires replacement when a pending session has a stale amount", () => {
    const cart = baseCart({
      total: 1500,
      payment_collection: {
        ...baseCart().payment_collection!,
        amount: 1500,
      },
    })

    expect(classifyCartPaymentSession(cart)).toEqual({
      kind: "initialize",
      reason: "stale",
    })
  })

  it("does not blindly initialize an authorized session", () => {
    const cart = baseCart({
      payment_collection: {
        ...baseCart().payment_collection!,
        payment_sessions: [
          {
            ...baseCart().payment_collection!.payment_sessions![0],
            status: "authorized",
          },
        ],
      },
    })

    expect(classifyCartPaymentSession(cart)).toEqual({
      kind: "reconcile",
      status: "authorized",
      sessionId: "paysess_1",
    })
  })

  it("marks an error session for explicit recovery", () => {
    const cart = baseCart({
      payment_collection: {
        ...baseCart().payment_collection!,
        payment_sessions: [
          {
            ...baseCart().payment_collection!.payment_sessions![0],
            status: "error",
          },
        ],
      },
    })

    expect(classifyCartPaymentSession(cart)).toEqual({
      kind: "failed",
      status: "error",
      sessionId: "paysess_1",
    })
  })

  it("requires replacement when payment collection amount is stale compared to cart total", () => {
    const cart = baseCart({
      total: 1500,
      payment_collection: {
        ...baseCart().payment_collection!,
        amount: 1200,
      },
    })

    expect(classifyCartPaymentSession(cart)).toEqual({
      kind: "initialize",
      reason: "stale",
    })
  })
})

describe("shouldRefreshPaymentCollection", () => {
  it("returns true when payment collection amount does not match cart total", () => {
    const cart = baseCart({
      total: 1500,
      payment_collection: {
        ...baseCart().payment_collection!,
        amount: 1200,
      },
    })

    expect(shouldRefreshPaymentCollection(cart)).toBe(true)
  })

  it("returns true when payment collection currency does not match cart currency", () => {
    const cart = baseCart({
      currency_code: "usd",
      payment_collection: {
        ...baseCart().payment_collection!,
        currency_code: "eur",
      },
    })

    expect(shouldRefreshPaymentCollection(cart)).toBe(true)
  })

  it("returns false when payment collection amount and currency already match cart", () => {
    expect(shouldRefreshPaymentCollection(baseCart())).toBe(false)
  })

  it("returns false when payment collection does not exist", () => {
    const cart = baseCart({ payment_collection: null })
    expect(shouldRefreshPaymentCollection(cart)).toBe(false)
  })
})

describe("buildPaymentSessionInput", () => {
  it("builds payment session input with deterministic idempotency key including cart, collection, currency, and total", () => {
    const cart = baseCart()
    const input = buildPaymentSessionInput(cart, "pp_stripe_stripe")

    expect(input).toEqual({
      payment_collection_id: "paycol_1",
      provider_id: "pp_stripe_stripe",
      context: {
        idempotency_key: "cart_cart_1_paycol_1_eur_1200",
      },
    })
  })

  it("throws not found when payment collection is missing", () => {
    const cart = baseCart({ payment_collection: null })
    expect(() => buildPaymentSessionInput(cart, "pp_stripe_stripe")).toThrow(
      "Cart payment collection was not created"
    )
  })
})
