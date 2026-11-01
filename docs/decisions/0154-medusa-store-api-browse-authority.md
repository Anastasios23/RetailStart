# ADR-0154: Medusa Store API browse authority

- Status: Accepted
- Date: 2026-10-28

## Context

Demo browse used a Wolt-mirrored JSON catalog while cart/checkout used Medusa
via lazy `/store/catalog/ensure`. That split blocked Admin → storefront price
and catalog updates on listing pages. Happy-path order verification passed;
bidirectional commerce required a single browse authority.

## Decision

Medusa Store API is the sole authority for storefront product browse:

- `/products`, home product rails, and `/search` read Medusa listings.
- PDP remains `/products/[handle]`.
- Add-to-cart uses Medusa `variant_id` only; storefront does not call
  `/store/catalog/ensure`.
- Legacy `/catalog/[id]` Wolt routes redirect to Medusa handles when possible,
  otherwise to `/products`.
- Category chips/links use Medusa categories (`/categories/[handle]`).
- Bulk Wolt import into Medusa is out of scope for this step; the visible
  catalog is whatever is published in Medusa.

## Alternatives considered

### Keep Wolt JSON browse with Medusa prices overlay

Rejected: two sources of truth remain for listing identity and availability.

### Bulk-import all Wolt SKUs before switching browse

Deferred: large onboarding job; not required to prove Admin → front updates.

## Consequences

- Storefront catalog size follows Medusa publication, not the Wolt mirror file.
- `wolt-catalog.json` / `demo-catalog` are no longer the shopper browse path.
- Admin product/price changes are visible on listing and PDP after refresh.
