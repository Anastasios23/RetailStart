# ADR-0014: Layered verification boundaries

- Status: Accepted
- Date: 2026-09-19

## Context

V1 has two deployable applications, a backend-owned commerce authority, and
external payment, email, and media boundaries. Its acceptance criteria include
critical failure, retry, refund, inventory, notification, and recovery
scenarios that cannot be demonstrated by one test level alone.

## Decision

Use layered verification aligned with the architecture boundaries.

### Medusa/backend tests

Unit and integration tests verify commerce rules, persistence, inventory,
orders, payments, refunds, shipping, tax, and idempotent behavior.

### Next.js tests

Tests verify presentation, validation, and storefront orchestration without
duplicating backend commerce authority.

### API contract tests

Contract tests verify that Next.js and Medusa agree on request and response
behavior at their integration boundary.

### End-to-end tests

End-to-end tests exercise critical customer and operational flows through public
interfaces, including:

- successful guest purchase;
- failed or cancelled payment;
- out-of-stock behavior;
- correct order creation;
- inventory reservation and fulfillment;
- full and partial refunds;
- failed refund behavior;
- required transactional notifications;
- duplicate and retry protection.

External integrations use controlled test environments or testable seams,
including Stripe test mode and testable email delivery.

Do not rely exclusively on unit tests, end-to-end tests, or manual verification.

## Alternatives considered

### Unit tests only

These provide fast feedback on local rules but cannot prove cross-application,
provider, or end-to-end consistency.

### End-to-end tests only

These exercise user-visible behavior but are slower and less diagnostic for
isolating backend, contract, persistence, or integration failures.

### Manual verification only

This supports exploratory validation but cannot provide repeatable regression
protection or production-readiness evidence.

## Consequences

- Each architecture boundary has a corresponding verification boundary.
- Critical flows are tested for both success and failure/retry behavior.
- External provider behavior can be tested deterministically without relying on
  production accounts.
- Test suites require coordination across the two applications and their
  backend-owned integration seams.

## Not decided by this ADR

This decision does not select test frameworks, CI tooling, browser matrix,
device matrix, test infrastructure, or exact test data strategy.
