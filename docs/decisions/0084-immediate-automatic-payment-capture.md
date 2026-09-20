# ADR-0084: Immediate automatic payment capture

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0005 makes Medusa authoritative for the Stripe payment lifecycle. ADR-0046
selects the embedded Stripe Payment Element, ADR-0072 requires explicit
handling of ambiguous provider outcomes, and ADR-0080 makes Medusa's checkout
completion flow authoritative.

V1 has no requirement for delayed payment capture, fulfillment-time capture,
or per-client capture policy. Medusa's checkout flow authorizes the payment
session during cart completion, and the Stripe provider supports automatic
capture through its provider configuration.

## Decision

Configure the Stripe provider for automatic capture in V1. Payment capture
follows successful authorization through the supported Medusa/Stripe provider
lifecycle as part of checkout and order placement.

For V1:

- Medusa remains authoritative for payment authorization and capture.
- Ordinary card payments are not intentionally left authorized but
  uncaptured until fulfillment.
- Fulfillment is a separate later operational transition and does not control
  whether payment is captured.
- Customer-facing success depends on the authoritative backend
  checkout/payment outcome, not Payment Element state alone.
- Provider timeouts or uncertain outcomes remain pending or ambiguous until
  backend reconciliation determines the authoritative result.
- Retries reuse the durable logical operation and idempotency identity already
  established by earlier decisions.

Use the supported Medusa payment lifecycle and provider configuration rather
than introducing a custom checkout workflow solely to force capture ordering.

## Alternatives considered

### Delayed capture during fulfillment

This would support a later authorization-to-capture transition, but adds
authorization expiry, capture failure, pending-order, compensation, and
reconciliation workflows without an approved V1 need.

### Per-client or per-order capture policy

This provides flexibility but adds configuration and operational complexity and
would make the reusable V1 core harder to verify consistently.

## Consequences

- Successful V1 checkout results in an automatically captured payment through
  the supported provider lifecycle.
- Fulfillment can remain independently operated through Medusa Admin.
- Payment ambiguity still requires durable pending state and reconciliation;
  automatic capture does not make transport failures definitive.
- Provider configuration and the Medusa payment lifecycle remain the primary
  implementation boundary.

## Not decided by this ADR

This decision does not select internal workflow step ordering, webhook timing,
Stripe PaymentIntent behavior, capture-confirmation handling, or
reconciliation mechanics. Those must be verified against the Medusa version
used during implementation.
