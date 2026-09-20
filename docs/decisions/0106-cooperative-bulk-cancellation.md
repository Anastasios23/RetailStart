# ADR-0106: Cooperative bulk-operation cancellation

- Status: Accepted refinement of ADR-0032, ADR-0045, ADR-0100, and ADR-0104
- Date: 2026-09-19

## Context

ADR-0104 makes bulk operations resumable and explicitly partial. ADR-0032 and
ADR-0045 require durable provider and operation state rather than process-local
assumptions. Cancellation must therefore stop future work without pretending
that completed domain effects can be generically undone.

## Decision

Use cooperative cancellation with explicit recovery.

For V1:

- a cancellation request stops new eligible units from starting;
- an already-running Medusa domain operation reaches a safe authoritative
  boundary where possible;
- successfully completed units remain authoritative;
- completed work is not generically undone because the overall operation was
  cancelled;
- units not yet started are marked cancelled or not processed;
- failed or ambiguous units remain explicitly represented;
- retry or recovery operates only on affected units where safe; and
- compensation is used only where the relevant domain operation defines a
  safe and valid compensating action.

Cancellation is a control-plane state transition, not a generic rollback
mechanism. Do not assume an entire bulk operation is one transaction,
automatically reverse completed effects, abruptly terminate work with unknown
state, or restart the full operation when completed units can be preserved.

## Alternatives considered

### Whole-operation rollback

This offers a simple mental model, but is generally impractical across many
independent domain transactions and may require unsafe reversal.

### Abrupt process termination

This is operationally simple, but can leave in-flight state unknown and make
retries unsafe.

## Consequences

- Cancellation preserves completed authoritative business effects.
- Unstarted, failed, and ambiguous work remains visible for recovery.
- Compensation is domain-specific rather than inferred from cancellation.
- Shutdown and cancellation handling must coordinate with Medusa operation
  boundaries.

## Not decided by this ADR

This decision does not define cancellation states, unit-drain behavior,
compensation rules, operator actions, timeout handling, or recovery UX.
