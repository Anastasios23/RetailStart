# ADR-0071: Backend-owned provider adapters

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0013 requires a provider-neutral core, ADR-0005 makes Medusa authoritative
for Stripe payments, ADR-0006 makes the backend authoritative for
notifications, ADR-0008 makes object storage provider-neutral, and ADR-0040
requires authoritative provider webhooks to terminate at backend-owned
endpoints.

External provider SDKs, credentials, statuses, and failure behavior must not
spread through the commerce domain or storefront.

## Decision

Use backend-owned provider adapters for all external integrations.

For V1:

- Stripe, transactional email, object storage, and other provider-specific
  SDKs remain behind Medusa/backend-owned adapters.
- Provider credentials remain backend-only.
- Commerce workflows depend on provider-neutral capabilities rather than
  provider-specific SDK models.
- Provider responses are translated into normalized backend-owned statuses,
  references, and failure/outcome models.
- Provider-specific retries, timeouts, webhook handling, and reconciliation
  remain inside the backend integration boundary.
- Authoritative provider webhooks terminate at backend-owned endpoints under
  ADR-0040.

The approved Stripe Payment Element exception permits Stripe's browser SDK in
Next.js for customer interaction using only client-safe payment-session data.
Payment authority, secret credentials, reconciliation, and provider status
remain backend-owned.

Provider adapters may expose normalized capabilities such as payment
execution, refunds, notification delivery, media operations, and provider
status reconciliation.

## Alternatives considered

### Provider SDKs throughout workflows or storefront code

This may reduce adapter work for one provider but spreads credentials, models,
retry behavior, and provider coupling across the system.

### Separate integration gateway service

This could centralize external calls but adds another application, deployment,
failure, and operational boundary without a demonstrated V1 requirement.

### Provider-specific models as the commerce domain model

This would make provider replacement and reconciliation harder and could allow
external provider semantics to override Medusa's commerce authority.

## Consequences

- Provider replacement or addition is isolated behind backend adapters.
- Commerce workflows and shared types remain provider-neutral.
- Provider-specific behavior can be tested at the adapter boundary.
- The Stripe browser SDK remains a deliberate interaction-only exception.
- Adapter translation and normalized failure handling require explicit design.

## Not decided by this ADR

This decision does not select adapter interfaces, SDKs, normalized status
models, credential injection, timeout policy, retry strategy, or
provider-specific extension points.

