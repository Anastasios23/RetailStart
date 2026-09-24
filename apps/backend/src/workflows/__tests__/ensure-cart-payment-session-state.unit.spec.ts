import {
  classifyCartPaymentSession,
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
})
