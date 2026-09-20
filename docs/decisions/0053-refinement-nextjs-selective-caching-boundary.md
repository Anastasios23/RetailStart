# ADR-0053: Refinement of the Next.js selective caching boundary

- Status: Accepted refinement of ADR-0019
- Date: 2026-09-19

## Context

ADR-0019 established selective caching for safe read-oriented storefront data
and excluded commerce correctness state from caching authority. Q53 clarifies
where that safe caching may occur without creating a second independent
caching decision or authority.

## Relationship to ADR-0019

This record refines ADR-0019. It does not replace, conflict with, or create a
second independent caching authority.

## Decision

Safe read-oriented storefront data may be cached at the Next.js/rendering
boundary.

Eligible data includes:

- catalog presentation data;
- category pages;
- basic search results;
- static and presentation content.

Caching must use explicit freshness, revalidation, or invalidation rules.

Cached data is never authoritative for commerce correctness. Cart, checkout,
inventory availability, final prices, totals, shipping, tax, payment, orders,
and refunds must resolve through authoritative Medusa state whenever
correctness matters.

Do not place a general authoritative cache inside the Medusa commerce domain
merely for storefront performance.

## Consequences

- ADR-0019 remains the primary selective-caching decision.
- Next.js may optimize safe public reads without becoming a commerce authority.
- Cache freshness and invalidation behavior must be explicit for each eligible
  data class.
- Purchase and other correctness-sensitive flows must revalidate against
  Medusa rather than trusting cached reads.

## Not decided by this ADR

This refinement does not select cache technology, TTLs, invalidation
mechanisms, CDN usage, or Next.js rendering strategy.

