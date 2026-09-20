# ADR-0025: Separated public storefront and private admin API surfaces

- Status: Accepted
- Date: 2026-09-19

## Context

V1 has a guest storefront and a backend-owned administrative surface. Medusa
is authoritative for commerce operations, while privileged credentials and
administrative permissions must remain protected from browser access.

The thin Store API boundary established by ADR-0023 is sufficient for guest
storefront operations and does not justify a general-purpose BFF.

## Decision

Keep separate public storefront and private or admin backend surfaces.

For V1:

- Next.js uses Medusa's Store API for guest storefront operations;
- only explicitly safe public configuration or credentials may reach the
  browser;
- privileged backend credentials remain backend-only;
- administrative APIs and admin authentication are never exposed to the
  storefront or browser;
- admin operations remain behind Medusa's authenticated and authorized
  backend/admin boundary;
- the storefront must never gain elevated commerce privileges merely to simplify
  integration.

Do not expose private or admin Medusa APIs to the browser. Do not introduce a
general-purpose Next.js BFF solely to hide every Store API request.

## Alternatives considered

### Expose private or admin APIs to the browser

This could reduce integration friction, but would expand browser authority and
create unacceptable credential and authorization risks.

### Proxy every Store API request through a general BFF

This could centralize browser traffic, but would add an unnecessary API layer
and risk duplicating commerce behavior already rejected by ADR-0023.

## Consequences

- Guest storefront capability and admin capability remain distinct security
  surfaces.
- Storefront integration must use only the minimum public authority required.
- Private operations remain available to backend-owned workflows and the
  authenticated admin surface.
- Authentication, browser, and cross-origin protections must be implemented
  consistently at the selected boundaries.

## Not decided by this ADR

This decision does not select CORS, CSRF, token, cookie, session, or request
authentication mechanics.

## References

- [Medusa Storefront Development](https://docs.medusajs.com/learn/storefront-development)
- [Medusa Admin User Guide](https://docs.medusajs.com/user-guide)
