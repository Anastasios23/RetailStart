# ADR-0023: Thin Next.js to Medusa Store API boundary

- Status: Accepted
- Date: 2026-09-19

## Context

Next.js owns storefront presentation and customer interaction, while Medusa
owns commerce operations and validation. Medusa provides a Store API boundary
for separate storefront applications.

Adding a general-purpose BFF in Next.js would create another API surface and a
possible location for duplicated commerce rules.

## Decision

Next.js consumes Medusa's Store API through a thin, typed integration client.

For V1:

- use Medusa's standard Store API and/or official JS SDK where appropriate;
- keep the integration boundary small and explicit;
- allow Next.js to orchestrate presentation flows without exposing a second
  general-purpose commerce API;
- prohibit direct PostgreSQL access from Next.js;
- keep backend commerce rules out of duplicated storefront implementations;
- retain Medusa as the authority for commerce operations and validation.

A narrowly scoped Next.js route may be introduced later for a documented
presentation or security concern, but it must not become a general BFF that
mirrors Medusa.

Do not add a general-purpose BFF layer in V1.

## Alternatives considered

### General-purpose Next.js BFF

This could normalize every backend response, but would add proxy logic,
another error and authorization surface, and pressure to duplicate commerce
orchestration.

### Direct database access from Next.js

This could reduce API calls in selected paths, but would bypass Medusa's
authority, validation, and state-transition boundaries.

### Browser calls to multiple commerce services

This would distribute integration knowledge into the client and weaken the
single storefront-to-commerce boundary.

## Consequences

- The storefront integration remains small and replaceable.
- Medusa API contracts become the primary storefront/backend integration seam.
- Presentation-specific adaptation is allowed only when it does not become a
  second commerce authority.
- API errors, authentication, versioning, and SDK usage must be handled at the
  thin integration boundary.

## Not decided by this ADR

This decision does not select SDK usage in every route, request authentication
mechanics, API versioning, server-versus-browser request placement, caching, or
specific route adapters.

## Reference

- [Medusa Storefront Development](https://docs.medusajs.com/learn/storefront-development)
