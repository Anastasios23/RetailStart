# ADR-0107: Medusa-native asynchronous-work authority

- Status: Accepted refinement of ADR-0007, ADR-0047, and ADR-0096
- Date: 2026-09-19

## Context

ADR-0096 limits V1 to the Next.js storefront and Medusa backend. ADR-0007 and
ADR-0047 establish backend-owned asynchronous work and prefer Medusa-native
workflow, event, subscriber, and worker capabilities before adding custom
infrastructure.

## Decision

Use Medusa-native durable asynchronous work for V1.

Use Medusa workflows, events, subscribers, and supported worker capabilities
where appropriate. Retryable asynchronous work remains inside the
Medusa/backend authority. Durable work state, idempotency, retries, failures,
ambiguity, and reconciliation remain in the Medusa/PostgreSQL boundary where
required.

Asynchronous side effects are triggered only after the relevant authoritative
commerce transition. Required work remains recoverable across process restart or
replacement, and non-critical side effects do not determine whether an
authoritative commerce transition succeeds.

Do not rely on fire-and-forget process-local tasks, build a custom outbox or
job framework before a demonstrated Medusa capability gap exists, or introduce
an external queue or worker application in V1 without a new explicit decision.

## Alternatives considered

### Custom outbox or job framework in V1

This may offer control, but duplicates capabilities Medusa may already provide
and adds persistence and execution complexity.

### External queue and worker application

This can isolate processing, but creates another application, release,
credential, observability, and recovery boundary without an approved need.

## Consequences

- Asynchronous work shares Medusa's commerce authority and durable state.
- Process replacement does not silently lose required work.
- Additional async infrastructure requires evidence of a real Medusa
  capability gap.

## Not decided by this ADR

This decision does not define the exact Medusa workflow/event/worker usage,
queue mechanism, retry policy, persistence schema, or execution topology.
