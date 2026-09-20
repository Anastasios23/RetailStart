# ADR-0120: Payment Element client boundary

- Status: Accepted refinement of ADR-0005, ADR-0046, ADR-0071, and ADR-0084
- Date: 2026-09-19

## Context

ADR-0005 makes Medusa authoritative for Stripe payments, ADR-0046 selects the
embedded Stripe Payment Element, ADR-0071 confines provider SDKs to backend
adapters except for the browser Payment Element, and ADR-0084 selects
automatic capture.

## Decision

Use the Stripe Payment Element as a client interaction surface only.

For V1:

- Medusa creates and owns the payment collection and Stripe payment-session
  lifecycle;
- Next.js renders the Payment Element using only client-safe session data;
- raw card data is handled by Stripe components and does not pass through
  Next.js or Medusa application code;
- Stripe secrets and privileged payment credentials remain backend-only;
- Next.js may initiate the approved payment interaction but does not determine
  authoritative payment completion;
- Medusa and verified Stripe/provider events determine authoritative payment
  state;
- ambiguous payment outcomes remain pending and reconcilable; and
- automatic capture follows the approved Medusa/Stripe lifecycle.

Do not let Next.js declare an order paid from browser results alone, expose
secret keys, collect raw card data through custom forms, or introduce
Stripe-hosted Checkout without explicitly reconsidering the embedded-checkout
architecture.

## Alternatives considered

### Stripe-hosted Checkout

This reduces storefront payment UI responsibility, but conflicts with the
approved branded embedded-checkout experience.

### Custom card collection

This creates unnecessary payment-data and PCI risk and is explicitly excluded.

## Consequences

- The storefront owns payment interaction UX while Medusa owns payment truth.
- Stripe handles sensitive card entry through the approved client component.
- Browser success and transport responses cannot bypass backend ambiguity and
  reconciliation handling.

## Not decided by this ADR

This decision does not define Payment Element layout, payment methods, 3DS and
redirect behavior, client component structure, or recovery UX.
