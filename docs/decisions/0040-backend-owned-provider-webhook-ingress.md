# ADR-0040: Backend-owned provider webhook ingress

- Status: Accepted
- Date: 2026-09-19

## Context

External providers can emit callbacks that affect authoritative payment,
refund, notification, storage, or other operational state. These callbacks
must be authenticated, traceable, deduplicated, and processed next to the
backend-owned commerce authority.

Not every provider event is authoritative or required for V1, so webhook
infrastructure should not be added merely for uniformity.

## Decision

External provider webhooks that can affect authoritative commerce or
operational state terminate at Medusa or other backend-owned endpoints.

For V1:

- Stripe payment webhooks terminate at the Medusa/backend payment webhook
  boundary;
- other authoritative provider callbacks terminate at backend-owned endpoints
  where applicable;
- the backend verifies webhook authenticity using the provider's supported
  mechanism;
- provider event identities and references are recorded where needed for
  traceability and reconciliation;
- duplicate webhook deliveries are handled idempotently;
- provider outcomes are processed through backend-owned workflows and
  asynchronous work;
- ambiguous or failed webhook processing remains recoverable and observable;
- Next.js does not receive or resolve authoritative payment, refund,
  notification, storage, or other provider events.

For providers that do not produce authoritative state-changing callbacks, do
not add webhook infrastructure solely for architectural uniformity.

Do not route authoritative provider webhooks through the storefront, let
Next.js determine commerce state from webhook events, or introduce a separate
webhook gateway service in V1 without demonstrated need.

## Alternatives considered

### Storefront webhook ingress

This would put authoritative provider events behind the wrong security and
commerce boundary and make reconciliation dependent on the presentation app.

### Separate webhook gateway service

This could centralize ingress, but would add another security, persistence, and
delivery boundary before V1 requires it.

### Webhooks for every provider

This would add unnecessary endpoints and processing for providers whose events
do not affect authoritative state.

## Consequences

- Provider event authenticity, deduplication, and reconciliation are backend
  responsibilities.
- Webhook delivery and commerce state transitions remain separately observable.
- Providers without relevant authoritative callbacks do not create accidental
  infrastructure scope.
- Webhook endpoints must be included in environment isolation and recovery
  planning.

## Not decided by this ADR

This decision does not select signature-verification implementation, event
persistence schema, endpoint topology, provider-specific event subscriptions,
or retry timing.

## Reference

- [Medusa Payment Webhook Events](https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events)
