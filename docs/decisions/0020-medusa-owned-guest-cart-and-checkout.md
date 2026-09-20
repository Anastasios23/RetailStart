# ADR-0020: Medusa-owned guest cart and checkout lifecycle

- Status: Accepted
- Date: 2026-09-19

## Context

V1 uses guest checkout and explicitly excludes customer accounts, login, and
order history. Cart, checkout, price, inventory, shipping, and tax state must
remain consistent with the authoritative commerce system.

Maintaining a second cart or pricing model in Next.js would create stale or
conflicting state before payment and order creation.

## Decision

Medusa owns the anonymous cart and checkout lifecycle.

Medusa is authoritative for:

- cart contents;
- quantities;
- product and variant validation;
- pricing;
- inventory availability;
- shipping selection;
- tax calculation;
- checkout state.

Next.js only orchestrates the customer experience, keeps the opaque cart or
session reference needed to continue the guest session, and calls Medusa APIs
for cart and checkout operations.

Do not maintain a second cart or pricing model inside Next.js. Do not create
customer accounts for guest users.

## Alternatives considered

### Next.js-owned cart and pricing state

This could make immediate UI updates convenient, but would duplicate commerce
state and risk stale prices, quantities, inventory, shipping, or tax before
finalization.

### Customer accounts for guest users

This could simplify persistence in some implementations, but conflicts with the
approved guest-checkout boundary and introduces unnecessary identity lifecycle
work.

## Consequences

- Guest checkout remains account-free while Medusa retains authoritative cart
  and checkout state.
- Storefront state is a continuation reference and presentation projection, not
  a commerce authority.
- Cart and checkout failures must be handled through Medusa responses and safe
  retry behavior.
- The final purchase path can revalidate current price, inventory, shipping,
  and tax through one backend authority.

## Not decided by this ADR

This decision does not select the cookie or session mechanism, cart expiry
policy, checkout API flow, browser storage policy, or guest-data retention
period.
