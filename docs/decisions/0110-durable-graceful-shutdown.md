# ADR-0110: Durable graceful shutdown

- Status: Accepted refinement of ADR-0073, ADR-0107, and ADR-0108
- Date: 2026-09-19

## Context

ADR-0107 keeps asynchronous work inside Medusa, and ADR-0108 allows server and
worker process separation using the same codebase and durable authority.
Process replacement must not lose in-flight authoritative work or required
recovery state.

## Decision

Use durable graceful shutdown and bounded drain behavior.

During shutdown:

- stop accepting new work where appropriate;
- stop starting asynchronous work that cannot safely complete during the drain
  window;
- allow in-flight authoritative operations to reach a safe boundary where
  possible;
- preserve retry, idempotency, webhook, asynchronous-work, and reconciliation
  state durably;
- rely on persisted backend state for restart recovery; and
- allow process replacement to complete within a bounded shutdown period.

If work cannot finish before shutdown completes, it remains durably recoverable
and resumes safely after restart or worker replacement.

Do not terminate immediately while authoritative work may be in progress,
depend on process-local memory for recovery, wait indefinitely for all work, or
lose required asynchronous or reconciliation work during replacement.

## Alternatives considered

### Immediate termination

This is simple, but can leave authoritative operations and asynchronous work
ambiguous.

### Indefinite drain

This may preserve in-flight work, but can block deployment, replacement, and
recovery indefinitely.

## Consequences

- Shutdown is a controlled transition rather than an implicit process death.
- Durable state, not process lifetime, determines recoverability.
- Drain behavior must distinguish safe in-flight work from work that should
  remain pending for restart.

## Not decided by this ADR

This decision does not define drain durations, signals, health endpoints,
deployment integration, or process-supervision mechanics.
