# ADR-0032: Local transactions and external-provider reconciliation

- Status: Accepted
- Date: 2026-09-19

## Context

Medusa/PostgreSQL can provide a local transaction boundary for authoritative
commerce state, but Stripe, email, object storage, and other providers do not
participate in the same database transaction.

V1 requires safe retries, explicit ambiguous outcomes, recovery after lost
responses, and protection against duplicate payments, refunds, orders, and
notifications.

## Decision

Use local Medusa/PostgreSQL transactions for authoritative commerce state and
durable idempotent reconciliation for external providers.

For V1:

- local commerce state changes use Medusa/PostgreSQL transactional boundaries
  where appropriate;
- external operations are not treated as if they participate in the same
  database transaction;
- provider references and meaningful operation/status information needed for
  recovery are persisted;
- retry-sensitive operations use idempotency identities;
- external side effects are retried through backend-owned asynchronous work
  where appropriate;
- ambiguous, failed, pending, compensated, and reconciled states are explicit
  where needed;
- reconciliation can recover cases where a provider succeeded but the
  application did not receive or persist the expected response cleanly;
- compensation logic is backend-owned and explicit rather than inferred by the
  storefront.

Do not introduce distributed transactions or two-phase commit across external
providers, rely on best-effort provider calls from Next.js, assume a timeout
means that a provider operation failed, or retry payment/refund operations
without idempotency and authoritative status checks.

## Alternatives considered

### Distributed transactions or two-phase commit

This could appear to provide cross-system atomicity, but external providers do
not share the PostgreSQL transaction and the infrastructure would be complex,
fragile, and inappropriate for V1.

### Best-effort provider calls

This could reduce persistence work, but would make provider success, timeout,
retry, and reconciliation outcomes ambiguous and unsafe.

## Consequences

- Local business state and external side effects have explicit failure
  boundaries.
- Provider success can be recovered after response loss or application
  interruption.
- Payment and refund retries require durable operation identities and status
  checks.
- Compensation and reconciliation become first-class backend workflows rather
  than storefront guesses.

## Not decided by this ADR

This decision does not select the exact Medusa workflow structure, outbox
implementation, retry policy, compensation rules, or provider-specific
webhook and event handling.
