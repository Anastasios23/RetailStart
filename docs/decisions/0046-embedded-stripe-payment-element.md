# ADR-0046: Embedded Stripe Payment Element for V1

- Status: Accepted
- Date: 2026-09-19

## Context

The V1 storefront needs a customer-facing card-payment experience while
Medusa remains authoritative for payment collections, Stripe payment sessions,
payment status, order completion, retries, ambiguous outcomes, and
reconciliation.

The approved architecture also requires that Stripe secret credentials remain
backend-only and that the application never stores raw card details.

## Decision

Use Stripe Payment Element embedded in the Next.js storefront for the V1
customer-facing payment UI.

Medusa creates and owns the payment collection and Stripe payment session.
Next.js renders the Payment Element using only client-safe payment-session data
and coordinates the customer interaction. Stripe secret credentials remain
backend-only.

Medusa, verified Stripe provider events, and backend-owned reconciliation
remain authoritative for payment state. Next.js must not infer successful
payment or order completion from client-side UI state alone. Payment
confirmation, retry, ambiguous-state handling, and reconciliation follow the
backend-owned lifecycle established by ADR-0005, ADR-0030, ADR-0032,
ADR-0040, and ADR-0045.

The branded payment experience remains within the Retail Starter storefront.

## Alternatives considered

### Stripe-hosted Checkout

Stripe-hosted Checkout could reduce storefront payment UI implementation and
move more of the payment-page responsibility to Stripe. It would introduce a
redirect-based payment experience with less control over the branded checkout
surface and would require confirming how a Checkout Session maps to Medusa's
payment-session lifecycle. It is excluded from V1 unless a later requirement
justifies changing the payment UX model.

### Custom server-side card form

A custom server-side card form would increase security and compliance scope,
create unnecessary handling of sensitive payment data, and conflict with the
approved rule that raw card details are never stored by the application.

## Consequences

- The storefront retains a branded, embedded payment experience.
- Stripe.js/Payment Element handles the customer-facing payment fields while
  application servers do not receive raw card details.
- Next.js needs explicit handling for client-secret use, payment actions such
  as 3DS, redirects where required, and recoverable return states.
- The backend must continue to resolve payment success, failure, cancellation,
  ambiguity, retries, and reconciliation through authoritative provider state.
- Stripe-hosted Checkout is not part of the V1 payment UX model.

## Not decided by this ADR

This decision does not select the Payment Element layout, supported payment
methods, 3DS presentation, redirect behavior, client-side component structure,
or recovery UX.

