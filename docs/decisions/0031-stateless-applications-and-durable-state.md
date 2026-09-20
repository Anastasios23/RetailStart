# ADR-0031: Stateless applications and durable authoritative state

- Status: Accepted
- Date: 2026-09-19

## Context

Client deployments may replace or restart application instances, while V1
requires confirmed orders, payments, refunds, inventory, fulfillment, and
retry/recovery information to remain available and consistent.

Process-local memory and instance affinity cannot provide durable authority or
reliable recovery across those lifecycle events.

## Decision

Keep the deployable applications stateless with durable state owned by the
authoritative backend systems.

For V1:

- Next.js does not own authoritative commerce state in process memory;
- Medusa and PostgreSQL own durable commerce state;
- object storage owns durable media;
- backend-owned asynchronous processing owns retryable side-effect state;
- caches and in-memory values are disposable optimizations only;
- restarting or replacing an application instance must not lose confirmed
  orders, payments, refunds, inventory state, fulfillment state, or required
  retry and recovery information.

Do not rely on process-local memory for authoritative commerce state, require
application instance affinity for correctness, or introduce distributed
stateful infrastructure without a confirmed requirement.

## Alternatives considered

### Process-local authoritative state

This could simplify short-lived flows, but would lose state across restarts or
instance changes and would make correctness depend on affinity.

### Distributed stateful infrastructure in V1

This could support future scaling patterns, but would add synchronization and
operational complexity before a confirmed requirement exists.

## Consequences

- Application replacement and restart are compatible with durable recovery.
- Any state needed for safe retry or reconciliation must have an explicit
  persistent owner.
- Stateless application instances can be deployed independently of the
  persistence lifecycle.
- Disposable caches must degrade to authoritative reads when unavailable or
  stale.

## Not decided by this ADR

This decision does not select deployment replica count, autoscaling model,
session-cookie implementation, cache technology, process supervision, or
infrastructure topology.
