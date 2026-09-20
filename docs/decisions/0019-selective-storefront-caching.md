# ADR-0019: Selective storefront caching

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires a responsive storefront while preserving Medusa as the authority
for prices, inventory, checkout, shipping, tax, payments, orders, refunds, and
other commerce state. Catalog and presentation data can tolerate different
freshness characteristics from transactional data, provided stale data cannot
produce an incorrect commerce outcome.

## Decision

Use selective caching only for safe, read-oriented storefront data.

Suitable candidates include:

- catalog presentation data;
- category pages;
- basic search results;
- static and presentation content.

Caching must use explicit freshness, revalidation, or invalidation rules.

Do not treat cached data as authoritative for:

- inventory availability;
- cart state;
- checkout state;
- final prices and totals;
- shipping;
- tax;
- payments;
- orders;
- refunds.

Before purchase confirmation, the storefront must obtain or validate the
authoritative current commerce state through Medusa.

Stale cached catalog data may affect browsing presentation but must never be
allowed to create an incorrect order, payment, or inventory outcome.

## Alternatives considered

### No caching in V1

This would simplify freshness management, but would give up safe performance
improvements for read-oriented catalog and presentation data.

### Aggressive caching of storefront data

This could improve apparent performance, but would risk stale prices,
availability, shipping, tax, payment, order, and refund state.

## Consequences

- Caches are performance aids, not commerce authorities.
- The final purchase path must always validate current state with Medusa.
- Cache invalidation and freshness failures must degrade toward authoritative
  reads rather than silently use unsafe stale state.
- Safe cached data and authoritative transactional data have distinct test and
  observability expectations.

## Not decided by this ADR

This decision does not select cache technology, TTLs, invalidation strategy,
CDN configuration, or Next.js rendering strategy.
