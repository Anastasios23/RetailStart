# ADR-0049: Backend-owned provider-neutral transactional email messages

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0006 established backend-owned transactional notification intents and an
email provider adapter. V1 also requires notification idempotency, safe
retries, delivery/failure tracking, correlation, and independence from
storefront availability.

Client deployments require reusable transactional structure with client-specific
branding and approved content, without making an external email provider the
source of business meaning or delivery recovery state.

## Decision

Transactional email templates and message rendering remain backend-owned and
provider-neutral.

For V1:

- Medusa owns notification intent and template selection.
- Templates are versioned with the Retail Starter core where appropriate.
- Reusable template structure is part of the core.
- Client-specific branding and approved content are injected through client
  configuration.
- The backend renders or prepares a provider-neutral message before delivery.
- The email provider receives the final delivery payload and returns
  delivery/failure status.
- Notification correlation, retry state, and delivery outcome remain
  backend-owned.

Provider-specific adapters may translate the backend-owned message into the
provider's required API format, but must not change the semantic notification
contract.

The provider is not the canonical source of notification meaning, business
rules, template selection, client-specific transactional logic, retry state, or
reconciliation authority.

## Alternatives considered

### Provider-managed templates as the source of truth

Provider-managed templates could allow convenient provider-side editing, but
would create provider coupling, template drift, and weaker versioning and
testing of the reusable core.

### Next.js-rendered transactional email

Rendering in Next.js would couple notification generation to the storefront and
could place business meaning outside the backend authority boundary. It is not
acceptable.

### Provider-specific template logic throughout Medusa

This could reduce adapter work for one provider, but would spread external
provider concerns through the commerce domain and make replacement and testing
harder.

## Consequences

- Notification meaning and template selection remain stable backend contracts.
- Core templates can be versioned and tested with the Retail Starter release.
- Client branding and approved content remain configurable without changing
  commerce authority.
- Provider replacement requires an adapter translation rather than a domain
  rewrite.
- Template/content changes require controlled configuration or release
  handling rather than relying on provider-side drift.

## Not decided by this ADR

This decision does not select the email provider, renderer, template format,
localization approach, template storage structure, or client-content update
workflow.

