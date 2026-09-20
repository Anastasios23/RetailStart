# ADR-0119: Opaque guest-cart continuity

- Status: Accepted refinement of ADR-0020 and ADR-0054
- Date: 2026-09-19

## Context

ADR-0020 makes Medusa authoritative for anonymous cart and checkout state, and
ADR-0054 selects a secure opaque storefront reference for guest continuity.
The storefront needs to resume a guest flow without becoming a second cart
authority or storing commerce truth in browser storage.

## Decision

Use a secure opaque storefront reference for guest-cart continuity.

The storefront stores only an opaque Medusa cart or checkout-continuation
reference. The reference is narrowly scoped to continuity, not commerce
authority. Server-side Next.js access is preferred, with browser access limited
to flows that genuinely require it.

The continuity reference contains no cart contents, prices, totals, inventory,
shipping or tax calculations, payment state, or customer data.

If the reference is lost, replaced, expired, or invalid, Next.js does not
reconstruct commerce state from client-side copies. Medusa determines whether
the cart remains valid and creates a new cart through the normal backend-owned
flow when required.

Before correctness-sensitive operations, Medusa revalidates price, inventory,
shipping, tax, and checkout conditions.

Do not maintain a second authoritative cart in localStorage or sessionStorage,
persist commerce truth in the browser, introduce a separate guest-session
database, or infer cart validity solely from possession of the reference.

## Alternatives considered

### Browser-persisted cart state

This improves local continuity, but creates a competing client-side state
authority and exposes commerce data to browser persistence.

### Separate guest-session database

This provides durable continuity, but adds a second state boundary that is not
required for V1.

## Consequences

- Guest continuity survives ordinary navigation without duplicating cart state.
- Lost or stale references recover through Medusa rather than client inference.
- Cookie/session implementation must preserve the opaque, narrowly scoped
  boundary.

## Not decided by this ADR

This decision does not define cookie attributes, expiry, rotation, domain/path
scope, session mechanics, or lost-reference UX.
