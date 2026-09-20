# ADR-0065: Refinement of the Store API origin and CSRF boundary

- Status: Accepted refinement of ADR-0025 and ADR-0064
- Date: 2026-09-19

## Context

ADR-0025 separates public Store API and private/admin surfaces, while
ADR-0064 requires Next.js and approved browser flows to use only the public
Store API authority. Q65 clarifies the browser-origin and CSRF boundary for
state-changing guest flows.

## Relationship to ADR-0025 and ADR-0064

This record refines those decisions. It does not create a new API authority or
make CORS a substitute for authentication or authorization.

## Decision

Use restricted public Store API browser access with explicit origin and CSRF
boundaries.

For V1:

- Browser access to Medusa's Store API is limited to explicitly approved
  storefront origins.
- Broad or wildcard cross-origin access is not used for normal production
  storefront traffic.
- Server-side Next.js requests remain preferred where practical under ADR-0051.
- Browser-side mutations remain limited to approved public Store API
  operations.
- Cookie-backed or otherwise ambiently authenticated state-changing requests
  use appropriate CSRF protection.
- CORS configuration and CSRF protection are separate security controls.
- Guest/cart references do not grant administrative or private backend
  authority.
- Each isolated client deployment maintains its own approved storefront-origin
  configuration.

Cookie attributes and cross-site behavior are intentionally configured, and
state-changing operations do not rely on CORS alone for CSRF protection. When a
request does not use automatically attached browser credentials, its CSRF
threat model is evaluated accordingly rather than adding unnecessary
mechanisms by default.

## Alternatives considered

### Permissive or wildcard CORS

This may simplify browser integration but weakens the production origin
boundary and does not protect cookie-backed mutations from CSRF.

### General-purpose BFF for all browser traffic

This could centralize CORS and CSRF handling but would create a second
storefront API and conflict with the approved thin Store API boundary.

### Treating publishable credentials as authorization

Publishable Store API credentials support approved public access but do not
authorize privileged operations or replace origin and request-security controls.

## Consequences

- Browser storefront access has an explicit per-client origin boundary.
- CSRF protections are applied according to the actual credential attachment
  model rather than assumed from CORS configuration.
- Public Store API credentials and guest/cart references remain non-privileged.
- Cross-origin and cookie behavior require focused security testing per client
  deployment.

## Not decided by this ADR

This refinement does not select allowed-origin values, preflight behavior,
SameSite/Secure/HttpOnly attributes, CSRF token mechanism, request headers, or
server/browser exceptions.

