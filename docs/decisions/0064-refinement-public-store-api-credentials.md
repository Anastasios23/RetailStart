# ADR-0064: Refinement of the public Store API credential boundary

- Status: Accepted refinement of ADR-0023, ADR-0025, and ADR-0051
- Date: 2026-09-19

## Context

ADR-0023 establishes a thin typed Medusa Store API integration, ADR-0025
separates public Store API and private/admin surfaces, and ADR-0051 establishes
hybrid server-first request placement.

Server-side execution in Next.js must not be mistaken for authorization to use
privileged Medusa credentials or APIs.

## Relationship to ADR-0023, ADR-0025, and ADR-0051

This record refines those decisions. It does not create a second storefront
API or change Medusa's authority.

## Decision

Use only Medusa's public Store API credentials and public storefront authority
from Next.js.

For V1:

- Next.js server-side requests use the public Medusa Store API boundary.
- Approved browser-side storefront flows are also limited to the public Store
  API.
- Only safe public configuration and credentials required by the Store API are
  available to Next.js or browser code.
- Guest/cart continuity uses opaque references rather than privileged
  credentials.
- Private/admin Medusa credentials remain confined to Medusa or another
  backend-owned component that explicitly requires them.
- Server-side execution in Next.js does not justify privileged Medusa access.

If a future requirement cannot be met through the Store API, the exact gap is
documented first and the narrowest backend-owned extension is designed under
ADR-0003. Broad privileged access is not granted to Next.js as a workaround.

## Alternatives considered

### Privileged Medusa credentials in Next.js

This could simplify storefront orchestration but would expand the Next.js trust
boundary and risk exposing administrative capabilities through storefront
routes.

### General custom storefront API facade

This could hide Store API details but would create a second commerce API,
duplicate orchestration, and weaken the single Medusa authority boundary.

### Public Store API with safe scoped access

This preserves the public/private boundary while allowing the storefront to
perform approved guest commerce operations using opaque references.

## Consequences

- Next.js remains a consumer and orchestrator, not a privileged Medusa client.
- Public storefront credentials and opaque references must be treated as
  non-authoritative capabilities.
- Any Store API gap becomes an explicit extension decision rather than an
  implicit privilege escalation.
- Browser and server request security controls must protect the public Store
  API boundary according to the request context.

## Not decided by this ADR

This refinement does not select publishable-key or header mechanics,
token/cookie handling, CORS/CSRF controls, per-operation server/browser
placement, or the exception-review process.

