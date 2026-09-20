# ADR-0140: Selective storefront caching boundary

- Status: Accepted refinement of ADR-0019, ADR-0053, ADR-0078, and ADR-0137
- Date: 2026-09-19

## Context

ADR-0019 permits caching only for safe read-oriented storefront data. ADR-0053
places that cache at the Next.js/rendering boundary, while ADR-0078 requires
active-cart repricing and revalidation. Cached browsing data must never become
commerce authority.

## Decision

Use selective caching for safe read-oriented storefront data.

V1 candidates include catalog presentation, category or collection pages, basic
search-result pages, public product presentation, navigation,
static/presentation content, and other data whose temporary staleness cannot
create an incorrect commerce transition.

Caching uses explicit freshness, revalidation, or invalidation behavior.
Cached values are never authoritative for cart, checkout, inventory,
reservations, final prices, discounts affecting checkout, shipping, tax,
totals, payment, orders, refunds, or fulfillment.

Cached catalog or search responses may display price or availability for
browsing only. Before correctness-sensitive operations, Medusa revalidates
current authoritative values. Next.js rendering caches do not become a second
commerce-state store.

Do not cache all Store API responses indiscriminately, depend on invalidation
for payment or inventory correctness, use cached results to bypass repricing or
availability checks, or disable safe read caching without need.

## Alternatives considered

### Cache all storefront responses

This risks stale inventory, pricing, shipping, tax, payment, or order behavior.

### Disable all caching

This avoids staleness, but gives up safe performance improvements for
read-oriented data without improving commerce authority.

## Consequences

- Browsing performance can improve without weakening commerce correctness.
- Cache policy must distinguish presentation reads from authoritative
  transitions.
- Final checkout behavior remains dependent on current Medusa state.

## Not decided by this ADR

This decision does not define Next.js caching primitives, TTLs, keys, tags,
revalidation strategy, CDN behavior, or invalidation triggers.
