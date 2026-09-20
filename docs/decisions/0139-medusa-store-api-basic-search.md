# ADR-0139: Medusa Store API basic search

- Status: Accepted refinement of ADR-0018 and ADR-0023
- Date: 2026-09-19

## Context

ADR-0018 selects backend-owned basic product search, and ADR-0023 makes the
public Store API the storefront integration boundary. V1 does not require an
external search engine or advanced search behavior.

## Decision

Use Medusa Store API basic search for V1.

Next.js sends search queries through the public Store API and renders returned
results. Medusa remains the authoritative catalog and search boundary. Use
supported Medusa keyword/query filtering and category or collection browsing
where sufficient.

Search results remain subject to Medusa catalog, pricing, and availability
rules. Next.js does not maintain an independent searchable catalog authority.

If an approved V1 requirement cannot be met by supported Medusa behavior, add
the smallest backend-owned extension necessary while preserving Medusa
authority and the Store API boundary.

Do not introduce an external search engine, separate search-indexing pipeline,
advanced relevance/ranking infrastructure, typo tolerance, semantic/vector
search, or browser-owned full-catalog search as authority in V1. Client-side
filtering of an already returned result set remains presentation behavior only.

## Alternatives considered

### External search engine

This may improve advanced search, but adds catalog synchronization, freshness,
indexing, ranking, and recovery complexity outside Medusa.

### Browser-owned full-catalog search

This can feel responsive for small catalogs, but cannot remain authoritative as
catalog, price, and availability change.

## Consequences

- Search remains consistent with the authoritative Medusa catalog boundary.
- V1 avoids external indexing and ranking infrastructure.
- Future advanced search can be added behind a deliberate backend extension or
  separate architecture decision.

## Not decided by this ADR

This decision does not define query syntax, result schema, pagination, ranking,
or future search-provider architecture.
