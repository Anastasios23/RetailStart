# ADR-0126: Backend provider webhook ingress

- Status: Accepted refinement of ADR-0040, ADR-0072, and ADR-0125
- Date: 2026-09-19

## Context

ADR-0040 requires authoritative provider callbacks to terminate at Medusa/backend
endpoints. ADR-0072 requires explicit ambiguity and reconciliation, while
ADR-0125 keeps provider behavior inside backend adapters.

## Decision

Terminate authoritative provider webhooks at Medusa/backend-owned endpoints.

For V1:

- provider callbacks are received by backend-owned handlers;
- authenticity and signature validation occur before authoritative processing;
- provider event identities are recorded where needed for deduplication and
  traceability;
- duplicate deliveries are handled idempotently;
- events are correlated with backend operation and domain records where
  possible;
- authoritative state changes execute through backend-owned workflows and
  domain pathways;
- non-blocking follow-up work may continue through Medusa-owned durable async
  processing; and
- failed or ambiguous processing remains durably visible and recoverable.

Retries do not duplicate commerce effects. Next.js does not terminate
authoritative provider webhooks, determine authenticity, reconcile provider
state, or translate raw provider events directly into authoritative commerce
transitions.

Do not introduce a generic webhook gateway in V1 without operational evidence
that the Medusa/backend boundary cannot satisfy the requirement safely.

## Alternatives considered

### Storefront webhook ingress

This exposes presentation infrastructure to authoritative provider processing
and risks coupling provider state to storefront behavior.

### Generic webhook gateway

This can centralize ingress, but adds another service, credential, retry, and
reconciliation boundary without a demonstrated V1 need.

## Consequences

- Provider event authenticity and idempotency remain backend-owned.
- Webhook effects share domain transactions, operation identities, and
  reconciliation records.
- Provider-specific subscriptions and schemas remain adapter concerns.

## Not decided by this ADR

This decision does not define signature implementation, event persistence
schema, endpoint topology, subscriptions, or retry timing.
