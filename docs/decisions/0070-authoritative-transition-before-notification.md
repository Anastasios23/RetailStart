# ADR-0070: Authoritative transition before asynchronous notification

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0006 makes transactional notifications backend-owned, ADR-0047 keeps
durable asynchronous work inside Medusa, and ADR-0069 keeps monetary and
commerce authority in the backend. Notification delivery must not become part
of the success criteria for an authoritative commerce transition.

## Decision

Use authoritative backend transition first and asynchronous notification second.

For V1:

- Medusa completes and persists the authoritative commerce transition first.
- Only after that transition is authoritative is the corresponding
  notification intent created or emitted.
- Notification delivery runs asynchronously through backend-owned durable
  workflow or event handling.
- Email-provider availability does not determine whether an order, payment
  failure, refund, or other commerce transition succeeds.
- Notification retries do not repeat or mutate the underlying commerce
  operation.
- Duplicate delivery attempts resolve against the same logical notification
  identity.
- A committed commerce transition must not silently lose a required
  notification intent.

Examples include order confirmation after authoritative successful
order/payment completion, new-order admin notification after authoritative
order creation, payment-failure notification after authoritative failure or
cancellation, and refund confirmation after provider-confirmed successful
refund.

Next.js does not trigger required notifications after receiving a response, and
transactional email is not sent synchronously inside the commerce transaction.

## Alternatives considered

### Synchronous email inside the commerce transition

This couples commerce success to provider availability and risks partial or
duplicate outcomes when delivery or the response is ambiguous.

### Storefront-triggered notification after the response

This is vulnerable to refreshes, timeouts, abandoned browser sessions, and
replayed requests and cannot guarantee delivery intent after a committed
transition.

### Notification as a prerequisite for commerce commit

This would allow an external provider failure to block or distort authoritative
commerce state.

## Consequences

- Commerce state remains authoritative even when notification delivery fails.
- Notification recovery proceeds independently through backend-owned retry and
  reconciliation logic.
- Notification intent creation and durability must be designed so a committed
  transition cannot silently lose required follow-up work.
- Notification identities remain separate from the underlying commerce
  operation while retaining a durable correlation link.

## Not decided by this ADR

This decision does not select event names, commit-to-intent durability
mechanism, notification timing, retry/backoff policy, duplicate suppression,
or provider callback handling.

