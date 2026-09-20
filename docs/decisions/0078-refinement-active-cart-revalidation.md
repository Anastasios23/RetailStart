# ADR-0078: Refinement of active-cart repricing and revalidation

- Status: Accepted refinement of ADR-0019, ADR-0021, ADR-0030, and ADR-0069
- Date: 2026-09-19

## Context

ADR-0019 excludes cached storefront data from commerce authority, ADR-0021
makes Medusa authoritative for inventory, ADR-0030 defines structured
commerce outcomes, and ADR-0069 makes Medusa authoritative for monetary values.

Active carts may contain presentation data that is stale because catalog,
pricing, inventory, shipping, tax, discount, or other commerce configuration
has changed.

## Relationship to related decisions

This record refines those decisions. It does not create a second pricing,
inventory, caching, or outcome authority.

## Decision

Use Medusa-owned repricing and revalidation for active carts.

For V1, Medusa remains authoritative for product and variant validity, current
pricing, inventory availability, shipping eligibility and cost, tax
calculation, discounts, and other commerce configuration affecting totals.

Cart mutations revalidate affected authoritative state where appropriate.
Checkout completion performs final authoritative revalidation before the order
is confirmed. Stale storefront or cached presentation data is never final
commerce truth.

If price, availability, shipping, tax, or relevant configuration changes,
Medusa returns a structured backend outcome. Next.js presents the changed state
and requires customer review or the backend-approved recovery action before
continuing. Where the final amount changes, the updated authoritative result
is shown before the transaction proceeds.

Prices are not automatically frozen when items are first added to the cart.

## Alternatives considered

### Freeze prices on cart addition

This could provide a predictable customer experience but introduces expiry,
promotion, pricing-policy, and margin complexity not required by V1.

### Next.js recalculation or approval

This would duplicate commerce calculations and could not safely own inventory,
shipping, tax, or final-total authority.

### Trust cached catalog data through checkout

This could improve apparent flow speed but risks incorrect totals, overselling,
or invalid shipping and tax outcomes.

## Consequences

- Final checkout correctness remains in Medusa.
- Customers may need to review changed authoritative results before continuing.
- Cached catalog data remains useful for browsing but cannot approve purchase
  state.
- Repricing and revalidation outcomes must be mapped consistently by Next.js.

## Not decided by this ADR

This refinement does not select repricing timing, cart expiry, future
price-freeze rules, change-detection fields, UX behavior, or API response
schema.

