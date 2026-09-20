# ADR-0117: Restricted Store API browser origins

- Status: Accepted refinement of ADR-0023, ADR-0025, ADR-0051, ADR-0064, and
  ADR-0065
- Date: 2026-09-19

## Context

ADR-0023 establishes the thin public Store API boundary. ADR-0064 limits
Next.js and approved browser flows to public Store API credentials, while
ADR-0065 requires restricted browser origins and separate CORS/CSRF controls.

## Decision

Allow browser-originated Store API access only from explicitly approved client
storefront origins.

For V1:

- production CORS uses an explicit origin allow-list rather than wildcard
  access;
- server-side Next.js access is preferred where practical without unnecessary
  proxying;
- browser flows call only the public Store API;
- private/admin APIs are never exposed as part of the storefront browser
  surface; and
- privileged backend, admin, provider, and database credentials never reach
  the browser.

The public Store API remains the browser-facing commerce boundary. Origin
restrictions are one layer of browser access control and do not make Next.js a
second commerce authority.

Do not use wildcard production CORS, expose private/admin APIs, introduce a
general BFF solely to hide a valid public Store API, or treat approved origin
access as privileged commerce authority.

## Alternatives considered

### Wildcard production CORS

This simplifies integration, but weakens client isolation and expands the
browser attack surface.

### General BFF for all Store API traffic

This centralizes requests, but adds a new application-facing boundary without a
demonstrated V1 need.

## Consequences

- Each client deployment has an explicit browser-origin boundary.
- Public browser access remains distinct from private/admin authority.
- Server-side integration remains available without forcing unnecessary
  proxying.

## Not decided by this ADR

This decision does not define exact origins, preflight behavior, headers,
credentials, or deployment configuration mechanics.
