# ADR-0018: Backend-owned basic product search

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires basic keyword search across product names, categories, and
available basic product data, along with category-based browsing. Advanced
search behavior and external search services are outside scope.

Medusa remains the authoritative catalog boundary, and the storefront must not
create a competing search index or catalog authority.

## Decision

Use backend-owned basic product search through the Medusa Store API boundary.

Next.js sends the search query and renders returned results. Medusa remains the
authoritative catalog and search boundary.

Use Medusa's standard keyword filtering or search capabilities where they are
sufficient. Support category-based browsing and filtering through Medusa's
catalog APIs.

If approved V1 search behavior is not fully satisfied by standard Medusa
capabilities, implement only the smallest backend-owned extension required.

Do not implement client-side catalog search as the authoritative mechanism, add
an external search engine in V1, or introduce typo tolerance, autocomplete,
faceted search, semantic search, or custom ranking.

## Alternatives considered

### Client-side authoritative search

This could reduce request traffic for small catalogs, but would become stale,
would not reliably represent the backend catalog, and would move catalog
responsibility into the storefront.

### External search engine in V1

This could provide advanced indexing and ranking, but would add a separate
indexing boundary and operational dependency outside the approved V1 need.

## Consequences

- Search results remain consistent with the authoritative catalog boundary.
- The storefront remains a query and presentation client rather than a search
  authority.
- A future advanced-search requirement can replace or extend the backend search
  boundary without changing the storefront's authority model.
- Basic search behavior depends on the capabilities and performance of the
  backend catalog query path.

## Not decided by this ADR

This decision does not select a search index, database indexing strategy, API
transport details, caching policy, or future external search provider.

## References

- [Medusa integrations](https://docs.medusajs.com/resources/integrations)
- [Medusa storefront product API](https://docs.medusajs.com/api/store/products)
