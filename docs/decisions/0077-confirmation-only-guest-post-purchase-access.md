# ADR-0077: Confirmation-only guest post-purchase access

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0022 excludes customer accounts and persistent customer/order data from
Next.js, while ADR-0076 preserves Medusa's transaction-time order facts. V1
requires order confirmation but does not require guest order history or a
self-service order-status portal.

## Decision

Use a confirmation-only guest post-purchase experience for V1.

After authoritative backend order and payment completion, the storefront may
show a safe confirmation result and the customer receives the approved
transactional order-confirmation email.

V1 provides no general public order-history or guest order-lookup surface. An
order number, email address, browser reference, cart/session reference, or
post-checkout browser session is not authentication for viewing order details.
Later order-status questions use the approved support/admin process.

The confirmation page exposes only the minimum customer-facing information
appropriate immediately after the successful transaction and does not create a
reusable public order-access mechanism.

## Alternatives considered

### Guessable order lookup

Looking up an order by order number and contact information would create a
public authorization model vulnerable to enumeration and unnecessary customer
data disclosure.

### Expiring or revocable guest order link

This could enable future self-service but adds token, PII, revocation, replay,
and retention requirements that are not approved for V1.

### Customer accounts

Accounts could provide durable authorization but are explicitly outside the
approved V1 scope.

## Consequences

- V1 avoids a second public authorization model for order history.
- Order confirmation and email provide the required immediate customer
  feedback without exposing a reusable order-access capability.
- Support and authorized Medusa Admin operations handle later order-status
  questions.
- A future self-service requirement requires a separate access-control
  decision.

## Not decided by this ADR

This decision does not select confirmation-page fields, email content, support
workflow, or future guest-access token design.

