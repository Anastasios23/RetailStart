# ADR-0096: V1 two-application boundary

- Status: Accepted consolidation/refinement of ADR-0001, ADR-0003, ADR-0007,
  ADR-0047, and ADR-0071
- Date: 2026-09-19

## Context

The earlier decisions establish a two-application structure, Medusa as the
commerce authority, native Medusa asynchronous capabilities, and backend-owned
provider adapters. Later release and extension decisions could otherwise be
misread as permission to add another custom runtime service.

## Decision

Keep the V1 application architecture limited to:

- the Next.js storefront; and
- the Medusa commerce backend.

Supporting durable systems and external boundaries are:

- PostgreSQL for authoritative durable commerce and operational state;
- object storage for durable media; and
- external providers accessed through backend-owned adapters.

Asynchronous execution may use Medusa's supported server/worker modes later,
but this remains the same Medusa application and codebase rather than a new
application authority.

Do not introduce a general-purpose BFF, separate commerce service, separate
worker application, integration gateway, webhook gateway, operations service,
or another custom backend service that duplicates Medusa authority without
demonstrated evidence and a new explicit architecture decision.

Process separation inside Medusa does not by itself constitute a new domain or
application authority. If a future requirement demonstrates that a new service
boundary is necessary, evaluate its data ownership, authentication,
deployment, observability, recovery, and reconciliation consequences
explicitly before introduction.

## Alternatives considered

### Additional custom services in V1

Additional services could isolate selected concerns, but would add data,
credential, deployment, observability, recovery, and reconciliation boundaries
before the approved requirements justify them.

### Separate custom commerce authority

This would duplicate or compete with Medusa's authoritative commerce role and
is inconsistent with the approved architecture.

## Consequences

- The V1 runtime has two application authorities with clear responsibilities.
- Medusa can later run separate server and worker processes without becoming a
  second domain authority.
- Recovery and release compatibility remain tractable within the existing
  application boundary.
- A future service split requires an explicit architecture review rather than
  emerging through implementation convenience.

## Not decided by this ADR

This decision does not select process counts, deployment topology, hosting,
worker scheduling, or infrastructure providers.
