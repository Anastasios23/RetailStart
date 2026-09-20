# ADR-0047: Medusa-native durable asynchronous work boundary

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires retryable asynchronous side effects and multi-step backend work
without making authoritative commerce completion depend on non-critical work
such as email delivery. Required work must survive process restarts, remain
idempotent, and retain enough state for retry and reconciliation.

ADR-0007 established a backend-owned asynchronous boundary but intentionally
left the implementation mechanism open. ADR-0032 and ADR-0043 established
that external operations and durable operational/reconciliation records remain
backend-owned and inside the Medusa/PostgreSQL authority boundary.

## Decision

Keep durable asynchronous work inside the Medusa/backend application boundary.

For V1:

- Medusa workflows own retryable multi-step backend operations.
- Medusa events and subscribers may trigger asynchronous side effects after
  authoritative commerce operations.
- Durable work and reconciliation state remain persisted inside the
  Medusa-owned PostgreSQL boundary where required.
- Asynchronous operations remain idempotent and safe to retry.
- Required work must not be silently lost on process restart.
- Authoritative commerce completion must not depend synchronously on
  non-critical side effects such as email delivery.

Initial V1 background work may run within the Medusa deployment. The same
Medusa application must remain runnable in separate server and worker modes if
production workload, latency, or operational evidence later justifies worker
isolation.

Use Medusa's native workflow, event, subscriber, and worker capabilities where
they satisfy the requirements. Do not introduce a custom outbox, job system,
external queue, separate worker service, or second asynchronous authority
without a demonstrated gap in Medusa's supported durable execution model.

## Alternatives considered

### Custom outbox or job system in V1

This could provide explicit control over work-item schemas and processing, but
would duplicate capabilities that Medusa may already provide and would add
unnecessary persistence, retry, and operational design before a demonstrated
gap exists.

### External queue and separate worker service

This could improve isolation for heavy or long-running work, but adds another
service boundary, infrastructure, credentials, monitoring, and deployment
surface. It is deferred until workload or operational evidence justifies it.

### Fire-and-forget process-local tasks

This is simple to start but cannot reliably survive process restarts or support
durable retry, reconciliation, and duplicate protection.

## Consequences

- V1 asynchronous work stays within the Medusa commerce authority boundary.
- The initial deployment can avoid an additional queue or worker service.
- Native Medusa capabilities must be evaluated before custom infrastructure is
  added.
- The Medusa application retains a path to separate server and worker runtime
  modes without creating a second application authority.
- Any work that requires durable recovery must be represented through
  Medusa-supported durable execution or backend-owned PostgreSQL state.

## Not decided by this ADR

This decision does not select workflow structure, queue or event-bus
mechanism, retry/backoff policy, persistence schema, or server/worker
deployment topology.

