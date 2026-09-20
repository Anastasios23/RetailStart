# ADR-0124: Durable post-transition notification delivery

- Status: Accepted refinement of ADR-0006, ADR-0047, and ADR-0070
- Date: 2026-09-19

## Context

ADR-0070 requires the authoritative commerce transition to precede notification
delivery. ADR-0047 keeps asynchronous work inside Medusa's durable boundary.
Transactional notifications must survive retries and process replacement
without becoming a second commerce operation.

## Decision

Deliver transactional email asynchronously after the authoritative commerce
transition.

For V1:

1. Medusa completes the authoritative commerce transition.
2. The notification intent is recorded or emitted durably.
3. Medusa-owned asynchronous processing delivers through the email adapter.
4. Delivery state, retries, provider references, and final outcome are tracked
   where required.

Each notification has a durable logical identity, linkage to the relevant
commerce operation or domain record, correlation identity, delivery state,
retry/failure state, and provider reference where available.

Retries are idempotent with respect to the notification intent and never repeat
the underlying commerce operation. Provider failure does not roll back an
authoritative transition, create duplicate commerce effects, require the
storefront to recreate the notification, or turn successful commerce into a
failed business transaction.

If delivery remains unsuccessful after the approved retry/recovery policy,
commerce remains authoritative and notification failure remains visible for
operator recovery.

Do not send email synchronously inside the commerce transaction, let Next.js
send authoritative notifications, depend on browser navigation or page
rendering, or create duplicate intent during surrounding workflow retries.

## Alternatives considered

### Synchronous delivery inside the commerce transaction

This couples commerce success to provider availability and risks duplicate or
failed business transitions.

### Storefront-triggered delivery

This can lose notifications on refresh, timeout, or navigation failure and
makes the storefront an unsafe notification authority.

## Consequences

- Notification delivery is independently retryable and recoverable.
- Commerce success does not depend on email-provider availability.
- Operators can distinguish notification failure from commerce failure.

## Not decided by this ADR

This decision does not define event names, intent persistence mechanism,
retry/backoff policy, duplicate-suppression implementation, or provider
callback handling.
