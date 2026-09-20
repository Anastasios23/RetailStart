# ADR-0007: Backend-owned asynchronous work

- Status: Accepted
- Date: 2026-09-19

## Context

V1 includes transactional notifications and external-provider interactions that
must be retryable and must not make successful commerce state dependent on an
unrelated service being available at request time.

The authoritative commerce transition and its non-critical side effects have
different reliability and timing requirements. Treating them as one synchronous
operation would make failures ambiguous and could replay business effects.

## Decision

Use a backend-owned asynchronous job boundary for non-blocking and retryable
side effects.

Examples include:

- transactional email delivery;
- retryable external-provider calls;
- webhook reconciliation;
- notification retries;
- other non-critical side effects that must not block the authoritative
  commerce transition.

Authoritative commerce state changes complete independently from these
asynchronous side effects. Work items are idempotent and safe to retry, and
failures and retries remain traceable.

Asynchronous processing must not create duplicate orders, payments, refunds, or
notifications.

For V1, asynchronous processing may run within the Medusa deployment. Do not
introduce a separate worker application unless implementation evidence shows
that isolation is required.

## Alternatives considered

### Synchronous processing only

This would reduce moving parts initially, but would couple commerce success to
email and external-provider availability and would make retry behavior unsafe or
ambiguous.

### Separate worker application from V1

This could provide operational isolation, but would add a deployable system and
queue coordination before the approved V1 requirements demonstrate the need.

## Consequences

- Commerce transitions and retryable side effects have separate failure
  boundaries.
- Asynchronous handlers must have stable correlation and idempotency keys.
- Retry and failure history becomes part of backend operational visibility.
- The initial deployment can remain small while preserving a path to worker
  isolation if load, reliability, or operational evidence requires it.
- Side-effect work must never be used as an alternate path for authoritative
  order, payment, refund, or inventory state changes.

## Not decided by this ADR

This decision does not select queue technology, job persistence mechanism,
retry policy, scheduling details, or worker topology.
