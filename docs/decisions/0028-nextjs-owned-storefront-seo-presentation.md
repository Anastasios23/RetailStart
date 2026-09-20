# ADR-0028: Next.js-owned storefront routing and SEO presentation

- Status: Accepted
- Date: 2026-09-19

## Context

V1 includes a responsive, branded storefront with basic SEO structure. The
storefront and commerce backend are independently deployable, and Medusa is the
authoritative catalog and commerce system rather than the owner of public page
rendering.

## Decision

Next.js owns public storefront routing and the basic SEO presentation layer.

Next.js is responsible for:

- public storefront routes;
- page titles and meta descriptions;
- canonical URL presentation;
- sitemap generation;
- robots configuration;
- Open Graph and social metadata;
- basic structured presentation markup where appropriate.

Medusa remains authoritative for product identity, product data, category
identity and hierarchy, catalog availability, and commerce data.

Client-specific branding and SEO presentation settings remain client
configuration.

Do not move storefront rendering or SEO responsibility into Medusa, and do not
introduce an external SEO or content platform in V1.

## Alternatives considered

### Medusa-owned storefront rendering and SEO

This would weaken the independent storefront boundary and couple presentation
concerns to the commerce backend.

### External SEO or content platform

This could provide richer publishing workflows, but would add a new service and
scope beyond the approved V1 foundation.

## Consequences

- Public presentation behavior remains within the Next.js storefront.
- Catalog facts and commerce availability remain sourced from Medusa.
- SEO presentation can evolve without changing the commerce data model.
- Client-specific metadata and branding must remain separate from reusable
  catalog authority.

## Not decided by this ADR

This decision does not select URL conventions, metadata fields, structured-data
scope, sitemap implementation details, rendering strategy, analytics, or
external SEO tooling for a future version.
