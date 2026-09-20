# ADR-0051: Hybrid server-first storefront integration

- Status: Accepted
- Date: 2026-09-19

## Context

Next.js must consume Medusa through the thin typed Store API boundary while
keeping private/admin APIs, backend credentials, and database access out of the
browser. Some storefront interactions require browser state or a client-side
SDK, especially Stripe Payment Element and selected guest-cart operations.

Using the browser for every request would unnecessarily expand the public
request surface. Introducing a general-purpose Next.js BFF would duplicate
Medusa's API and business authority.

## Decision

Use a hybrid server-first storefront integration.

For V1:

- Next.js server code handles catalog reads, SEO and presentation data, and
  trusted storefront orchestration through the thin typed Medusa client.
- Browser-side code is limited to interactions that genuinely require browser
  state or client-side SDKs.
- Stripe Payment Element remains browser-side while payment authority remains
  with Medusa.
- Selected guest-cart interactions may use browser-side Store API access when
  that is the simplest safe flow.
- Browser access is limited to Medusa's public Store API and opaque guest/cart
  references.
- Private/admin APIs, backend credentials, and database access are never
  exposed to the browser.

When either server-side or browser-side placement works equally well, prefer
server-side access.

Server-side placement does not bypass the existing Store API boundary and does
not authorize duplicate Medusa business rules in Next.js routes.

## Alternatives considered

### Browser-direct Store API for all operations

This could simplify request placement, but would increase browser exposure,
session and cross-origin complexity, and duplicated request handling without a
clear V1 benefit.

### General-purpose Next.js BFF

This could centralize browser requests, but would mirror Medusa APIs, duplicate
orchestration, and create a competing integration boundary. It is excluded by
ADR-0023.

### Server-only access for every operation

This could reduce browser API exposure, but would add unnecessary proxy-like
routes or server actions for interactions that naturally require browser state
or client-side SDKs.

## Consequences

- Read-oriented storefront rendering and SEO can use server-side access by
  default.
- Browser-side code remains limited and receives only safe public data and
  opaque references.
- Payment UI and selected guest-cart flows retain the browser capabilities they
  require without moving commerce authority out of Medusa.
- Each browser-side exception must be justified by the interaction's state or
  SDK requirements.
- The Store API remains the only commerce integration boundary for both server
  and approved browser requests.

## Not decided by this ADR

This decision does not select per-operation placement, cookie or session
mechanics, CORS/CSRF controls, request authentication, or cache/revalidation
behavior.

