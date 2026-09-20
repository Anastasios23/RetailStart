# ADR-0151: Concurrent lifecycle-policy activation control

- Status: Accepted refinement of ADR-0044, ADR-0149, and ADR-0150
- Date: 2026-09-20

## Context

ADR-0044 establishes the backend-owned concurrency boundary for competing
commerce operations. ADR-0149 restricts lifecycle-policy activation to
controlled backend, deployment, and recovery paths, and ADR-0150 requires
atomic or equivalently coordinated activation with durable operation identity.

Concurrent or delayed activation requests must not allow a stale request to
overwrite a newer active lifecycle policy.

## Decision

Use backend-owned compare-and-set or equivalent concurrency control against the
currently active lifecycle-policy version.

Every activation attempt begins with:

- client and environment;
- expected current active policy version;
- requested target approved policy version;
- durable activation operation identity; and
- initiating principal or deployment identity.

The authoritative activation operation verifies that the active version still
matches the expected version before switching to the target. The active-policy
change and this concurrency check occur within the same safe authoritative
transaction or equivalent concurrency boundary. Only one competing activation
may successfully advance from a given active version.

If the expected active version no longer matches production state, the
activation fails explicitly as a stale or concurrency-conflict outcome. It
does not activate the requested target, overwrite the newer version, silently
replace the expected version with the newest version, or retry against changed
state. The caller or operator must reload authoritative state and decide
whether a new activation operation is appropriate.

Concurrency control preserves ADR-0150's guarantees:

- exactly one explicitly active approved policy;
- no partial authoritative activation;
- consistent deployment and recovery metadata;
- durable traceability; and
- idempotent retry of the same logical activation operation.

Transport uncertainty or retry of the same activation operation resolves
against its existing durable operation identity and must not create a second
logical activation.

The implementation may use database optimistic concurrency, version columns,
conditional updates, transactional compare-and-set, or another supported
mechanism that provides the same invariant. The exact PostgreSQL/Medusa
implementation remains an implementation-phase decision.

## Alternatives considered

### Last-write-wins activation

This is simple, but a delayed request could overwrite a newer approved policy
and make activation history or recovery metadata misleading.

### UI disabling or operator coordination

This may reduce ordinary collisions, but cannot protect shared state across
instances, retries, automation, or delayed requests.

### Silently retry against the newest active version

This may improve apparent success rates, but changes the requested operation's
meaning without explicit operator review and can activate an unintended target.

## Consequences

- Competing activation attempts have an explicit success or stale-conflict
  outcome.
- A newer active policy cannot be overwritten by a delayed request.
- Retry safety depends on durable backend operation identity rather than UI or
  transport behavior.
- The implementation must expose enough authoritative state for safe reload,
  reconciliation, and operator decision-making.

## Not decided by this ADR

This decision does not select the PostgreSQL isolation level, locking strategy,
version-column schema, Medusa workflow structure, conflict error contract, or
operator interface.

