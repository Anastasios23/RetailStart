# ADR-0006: Backend-owned transactional notifications

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires transactional notifications for successful orders, new orders,
failed or cancelled payments, and successful full or partial refunds. The
notification requirements also require duplicate prevention, safe retries,
delivery visibility, and a clear relationship to the underlying commerce
event.

Commerce success must not depend synchronously on email-provider availability.
Next.js is not the authoritative owner of orders, payments, or refunds and must
not independently send authoritative transactional messages.

## Decision

Transactional notifications are backend-owned and are triggered only from
authoritative commerce events.

The backend creates notification intents for:

- successful order confirmation to the customer;
- new-order notification to the admin;
- failed or cancelled payment notification to the customer;
- successful full or partial refund confirmation to the customer.

Email delivery uses a provider abstraction or adapter and supports:

- idempotent delivery;
- safe retries;
- delivery and failure status tracking;
- correlation with the related order, payment, or refund;
- troubleshooting visibility.

Email delivery failure must not create another order, trigger another payment
or refund, roll back a successful commerce transaction, or cause duplicate
notifications.

Do not send authoritative transactional emails from Next.js, and do not couple
commerce success synchronously to email-provider availability.

## Alternatives considered

### Storefront-owned transactional email

This would place delivery decisions outside the authoritative commerce system
and could produce missing or duplicate notifications during retries or partial
failures.

### Synchronous email delivery during commerce completion

This could appear simple, but an email-provider outage would make commerce
outcomes ambiguous or couple successful orders and refunds to an unrelated
external service.

## Consequences

- Notification creation is tied to authoritative backend events.
- Delivery can fail and be retried without replaying the commerce transaction.
- Each notification needs a stable correlation and idempotency identity.
- Delivery status and failures become operational data that can support
  troubleshooting.
- Provider replacement remains possible behind the adapter boundary.

## Not decided by this ADR

This decision does not select an email provider, template system, queue
technology, worker topology, retry schedule, or deployment arrangement.
