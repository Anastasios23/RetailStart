# ADR-0060: Refinement of durable correlation and operation identities

- Status: Accepted refinement of ADR-0015 and ADR-0045
- Date: 2026-09-19

## Context

ADR-0015 requires durable operational traceability, and ADR-0045 establishes
backend-owned durable idempotency identities. Q60 clarifies how a logical
operation is traced across local commerce state, providers, asynchronous work,
webhooks, retries, and reconciliation without making client IDs, provider IDs,
or observability identifiers authoritative.

## Relationship to ADR-0015 and ADR-0045

This record refines both ADR-0015 and ADR-0045. It does not create a separate
identity model or replace their authority boundaries.

## Decision

Use backend-generated durable correlation and operation identities.

For V1:

- Medusa/backend creates or authoritatively owns the durable identity of each
  logical commerce or operational action.
- Related records link through those durable identities where appropriate,
  including orders, payments, refunds, fulfillment, inventory operations,
  notification delivery, webhook processing, retries, provider interactions,
  and reconciliation records.
- Client-generated request IDs may be retained for request correlation but are
  not authoritative operation identities.
- External provider identifiers persist as linked references to the
  backend-owned operation rather than replacing its identity.
- Observability trace and span IDs may be attached for diagnostics, but are not
  durable business authority and are not required to determine commerce state.

The correlation model must allow an operator to trace a logical operation
across local state changes, provider calls, asynchronous work, webhook
callbacks, retries, and reconciliation without depending solely on logs.

Retries of the same logical business operation resolve against its existing
identity rather than generating unrelated new operation identities.

## Alternatives considered

### Client-generated IDs as primary identity

These are useful for request correlation but are untrusted and insufficient
across retries, restarts, provider calls, and webhook delivery.

### Provider IDs as the only internal identity

Provider identifiers do not cover local operations, pre-provider work,
notifications, fulfillment, or reconciliation and may differ across providers.

### Trace or log identifiers as business identity

Observability identifiers are useful for diagnostics but may expire, be sampled,
or be unavailable. They cannot be the source of commerce truth.

## Consequences

- Operators can follow one logical operation across local and external
  boundaries.
- Idempotency, reconciliation, and notification records can share durable
  business context.
- Provider and client identifiers remain useful linked references without
  becoming authorities.
- Identity propagation and safe logging require deliberate implementation and
  redaction.

## Not decided by this ADR

This refinement does not select identity types, formats, generation points,
propagation fields, client exposure, retention, indexing, or log-redaction
rules.

