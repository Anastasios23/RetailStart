# ADR-0144: Guest-only post-purchase access

- Status: Accepted refinement of ADR-0010, ADR-0022, ADR-0077, and ADR-0142
- Date: 2026-09-19

## Context

ADR-0022 limits V1 customer data to Medusa-owned guest commerce records, and
ADR-0077 selects confirmation-only post-purchase access. No V1 customer account
or order-history requirement exists.

## Decision

Use a guest-only storefront with confirmation-only post-purchase access.

V1 provides no customer accounts, login, account lifecycle, public order
history, generic guest order lookup, or reusable guest order-access credential.
Order number, email address, their combination, and cart or continuation
references are not authentication. Browser possession of a cart reference does
not grant ongoing access to customer or order information.

Customer contact, delivery, and order data remain Medusa-owned. After
authoritative checkout completion, Next.js may show a limited immediate
confirmation containing only information appropriate to that completed browser
flow. The confirmation is not reusable public order access, must not expose
unrelated data, and must not permit enumeration.

Transactional email is the primary post-purchase communication mechanism for
V1.

Do not introduce customer accounts, password recovery, order history, public
guest lookup, magic links, order-number/email authentication, or signed
persistent order-access links without a later requirement defining identity,
privacy, authorization, expiry, revocation, and recovery.

## Alternatives considered

### Customer accounts and order history

This adds authentication, account lifecycle, privacy, recovery, and access
control requirements outside V1.

### Public guest order lookup

This risks order and personal-data exposure through guessable or replayable
identifiers and requires a separate guest authorization model.

## Consequences

- V1 post-purchase access remains narrow and low-risk.
- Transactional email and support/Admin workflows handle continuing order
  communication.
- Self-service order status requires a later explicit authorization decision.

## Not decided by this ADR

This decision does not define confirmation-page fields, email templates,
support workflows, or a future guest-access token model.
