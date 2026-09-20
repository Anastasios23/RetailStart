# ADR-0141: Next.js SEO presentation authority

- Status: Accepted refinement of ADR-0028
- Date: 2026-09-19

## Context

ADR-0028 assigns public storefront routing and SEO presentation to Next.js
while Medusa remains authoritative for catalog identity and commerce facts.
SEO presentation needs storefront flexibility without creating a second catalog
identity model.

## Decision

Next.js owns public SEO presentation for storefront routes, page titles, meta
descriptions, canonical URLs, sitemaps, robots configuration, Open Graph/social
metadata, basic structured presentation markup, and other public presentation
metadata.

Medusa remains authoritative for product and variant identity,
category/collection identity and hierarchy, catalog data, availability, and
other commerce facts used to produce that presentation.

Next.js may transform backend facts into SEO-friendly presentation, including
supported route slugs and canonical structure, but it does not create a
competing catalog identity model. Structured data uses current authoritative
commerce facts where relevant.

Do not move SEO ownership into Medusa, duplicate catalog identity or commerce
state for SEO, add an external SEO platform in V1, or let stale metadata become
commerce authority.

## Alternatives considered

### Medusa-owned SEO rendering

This mixes commerce authority with storefront presentation and reduces route
and metadata flexibility.

### External SEO platform

This adds a V1 content dependency and another source of presentation metadata
without an approved need.

## Consequences

- Storefront presentation and commerce facts have clear ownership.
- SEO can evolve with Next.js without duplicating Medusa catalog authority.
- Backend data freshness remains important for commerce-derived metadata.

## Not decided by this ADR

This decision does not define Next.js metadata APIs, sitemap generation,
robots handling, canonical conventions, or structured-data implementation.
