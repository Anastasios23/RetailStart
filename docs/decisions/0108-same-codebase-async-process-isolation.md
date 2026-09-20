# ADR-0108: Same-codebase asynchronous process isolation

- Status: Accepted refinement of ADR-0007, ADR-0047, and ADR-0096
- Date: 2026-09-19

## Context

ADR-0107 keeps V1 asynchronous work inside Medusa. Operational evidence may
later require server and worker process isolation, but that must not create a
second commerce authority.

## Decision

If process isolation is later required, run separate Medusa server and worker
modes from the same approved application and codebase.

The server and worker processes remain part of the same compatible release.
PostgreSQL and the Medusa backend remain the shared durable authority, with
shared idempotency, retry, reconciliation, and operational records.

Process separation does not create a second commerce domain or business-rule
implementation.

Do not create a separately owned worker application by default, duplicate
backend business logic, give a worker an independent commerce state store, or
treat process-local memory as durable work state. A truly separate worker
application or external queue/service boundary requires a new explicit
architecture decision supported by demonstrated operational need.

## Alternatives considered

### Separate worker application

This may provide stronger deployment isolation, but adds another application,
release, credential, observability, recovery, and reconciliation boundary.

### Process-local asynchronous work

This is simple, but cannot safely survive process restart or replacement.

## Consequences

- Medusa can scale or isolate execution roles without splitting authority.
- Server and worker compatibility remains a release concern.
- Durable work and recovery state remain shared and backend-owned.

## Not decided by this ADR

This decision does not define process counts, deployment topology, worker
scheduling, queue mechanics, or infrastructure providers.
