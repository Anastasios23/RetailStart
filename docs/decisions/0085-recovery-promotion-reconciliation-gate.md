# ADR-0085: Recovery-promotion reconciliation gate

- Status: Accepted refinement of ADR-0082
- Date: 2026-09-19

## Context

ADR-0082 defines a coordinated client recovery set and requires restoration
into an isolated target before promotion. ADR-0032 and ADR-0072 require
authoritative reconciliation for external operations whose outcomes are
ambiguous or whose local response may have been lost. ADR-0061 provides the
backend-owned operational recovery surface.

A restored database cannot by itself establish the current state of affected
external provider operations.

## Decision

After the local coordinated recovery checks complete, identify provider-linked
operations that were pending, ambiguous, in progress, or potentially affected
by the selected recovery point. This includes, where relevant, payment,
refund, webhook, notification, storage, and other provider operations.

Before production promotion:

- critical commerce operations are reconciled against authoritative provider
  state where required;
- Medusa/PostgreSQL durable records are updated through approved backend-owned
  reconciliation mechanisms; and
- each affected critical operation is either authoritatively resolved or
  explicitly isolated in a controlled recovery state that cannot create an
  unsafe commerce effect.

Critical unresolved payment or refund ambiguity must not silently resume normal
processing.

Unrelated provider health and unrelated historical provider records do not
automatically block promotion of the entire restored environment. For example,
a temporary email-provider outage may leave durable notification work to be
recovered after promotion, while an unresolved payment or refund affecting
commerce correctness may block or isolate the affected operation.

Re-execution of an ambiguous operation requires the durable logical identity,
provider idempotency, and authoritative status reconciliation established by
earlier decisions.

## Alternatives considered

### Promote after local checks and reconcile asynchronously

This restores service faster, but could expose inconsistent payment or refund
state to new commerce operations.

### Require complete reconciliation of every provider record

This provides a stronger global barrier, but requires unnecessary provider
coordination and could block restoration because of unrelated records or
non-critical provider outages.

## Consequences

- Recovery promotion has an explicit safety gate for affected critical
  external operations.
- Provider reconciliation remains targeted rather than becoming a distributed
  snapshot requirement.
- Non-critical side effects can remain durable and recoverable without blocking
  unrelated commerce functionality.
- Operators need a controlled way to inspect and isolate unresolved affected
  operations before promotion.

## Not decided by this ADR

This decision does not define the exact critical-operation classification,
reconciliation queries, isolation mechanism, promotion gate implementation,
provider-specific verification, or operator approval process.
