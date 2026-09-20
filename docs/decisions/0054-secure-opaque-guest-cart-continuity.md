# ADR-0054: Secure opaque guest-cart continuity

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0020 makes Medusa authoritative for the anonymous cart and checkout
lifecycle. ADR-0051 establishes a hybrid server-first storefront integration.
The storefront needs a way to resume a guest cart without storing a second
cart, pricing model, checkout state, or customer account.

## Decision

Use a secure, scoped storefront cookie to preserve only an opaque Medusa cart or
checkout-continuation reference.

For V1:

- Medusa remains the authoritative owner of the guest cart and checkout
  lifecycle.
- The cookie contains only the minimum opaque reference needed to resume that
  lifecycle.
- The cookie does not contain cart contents, prices, inventory state,
  shipping/tax calculations, payment state, customer data, or commerce
  authority.
- Server-side access is preferred under the hybrid server-first model.
- Narrow browser-side use is allowed only where an approved interaction
  genuinely requires it.
- Losing, expiring, or replacing the cookie must not create competing cart
  state or cause Next.js to reconstruct authoritative commerce data locally.
- The reference is never proof that a price, inventory level, payment, or
  checkout state remains current; Medusa revalidates authoritative state.

Do not use localStorage or sessionStorage as the primary guest-cart continuity
mechanism. Do not introduce a separate server-side session database solely for
V1 guest-cart continuity or create guest customer accounts merely to preserve
cart state.

## Alternatives considered

### Browser localStorage or sessionStorage

This could simplify browser-direct continuity but is JavaScript-readable and
has weaker exposure, persistence, tab, and device-sharing characteristics.

### Separate server-side session database

This could centralize continuation state but would add stateful infrastructure
without replacing Medusa's cart authority.

### Cart state stored in the cookie

This would create a second cart and pricing representation, become stale, and
could not safely represent authoritative checkout state.

## Consequences

- The storefront retains only a minimal opaque continuation reference.
- Medusa remains the sole source of cart, checkout, pricing, inventory,
  shipping, tax, and payment truth.
- Cookie loss or expiry becomes a recoverable continuation problem rather than
  a local commerce-state reconstruction problem.
- Cookie and cross-origin behavior require explicit security and integration
  testing.

## Not decided by this ADR

This decision does not select cookie attributes, the HttpOnly or browser-access
pattern, SameSite policy, Secure setting, domain/path scope, expiration,
rotation, cross-origin behavior, cart-expiry alignment, or lost-reference
recovery behavior.

