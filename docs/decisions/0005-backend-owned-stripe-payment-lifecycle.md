# ADR-0005: Backend-owned Stripe payment lifecycle

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires standard Stripe card payments with successful, failed, and
cancelled outcomes; order creation only after successful payment; safe retries;
duplicate protection; refunds; and traceable ambiguous outcomes.

Architecture Q2 establishes Medusa as the authoritative commerce system, and
the V1 payment requirements prohibit raw card storage by the application.

## Decision

Medusa owns the Stripe integration and the authoritative payment lifecycle
through its payment-provider boundary.

Next.js handles only the customer-facing payment interaction and must not
maintain independent payment state. Stripe secret credentials remain
backend-only.

Medusa/provider flow and verified Stripe events determine authoritative payment
status. Orders are completed only after confirmed successful payment according
to the approved commerce flow.

Store provider payment references and statuses, but never store raw card
details in the application. Payment and refund retries must be safe and
idempotent. Webhook processing must tolerate retries and duplicate delivery
without producing duplicate orders, payments, or refunds. Payment failures and
ambiguous outcomes remain traceable for reconciliation.

Do not introduce a separate payment orchestration service or a
storefront-owned payment ledger.

The exact customer-facing payment UI, such as Stripe Checkout versus Stripe
Elements, remains a later decision.

## Alternatives considered

### Storefront-owned payment lifecycle

This could make the payment interaction locally convenient, but would create a
second payment state owner and make order completion, retries, and reconciliation
less reliable.

### Separate payment orchestration service

This could isolate payment-specific code, but would add another critical state
boundary and duplicate responsibility already assigned to Medusa.

## Consequences

- Payment, order completion, and refund authority remain within the commerce
  backend.
- Stripe credentials and provider-side operations stay out of the storefront.
- Webhook handling, idempotency, duplicate delivery, and reconciliation are
  backend responsibilities.
- The customer-facing payment UI can change without changing payment authority.
- Ambiguous provider outcomes need explicit statuses and operational handling;
  they must not be treated as successful or silently discarded.

## Not decided by this ADR

This decision does not select the exact Stripe customer-facing UI, API
versions, webhook event list, retry schedule, queue or worker mechanism,
notification provider, or deployment topology.

## References

- [Medusa Stripe payment provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe)
- [Medusa payment webhook events](https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
