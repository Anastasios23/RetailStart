# ADR-0123: Provider-neutral notification messages

- Status: Accepted refinement of ADR-0006 and ADR-0049
- Date: 2026-09-19

## Context

ADR-0006 makes transactional notifications backend-owned, and ADR-0049 makes
templates and message rendering provider-neutral. Client branding and approved
content must vary without transferring notification semantics to the email
provider or storefront.

## Decision

Medusa owns the provider-neutral transactional message contract.

For V1:

- Medusa owns notification intent and template/message-type selection;
- notification semantics remain part of the backend commerce domain;
- reusable template structure may be versioned with the Retail Starter core;
- client branding, approved wording, and presentation values come from
  validated client configuration;
- the backend renders or prepares a provider-neutral message representation;
- the email adapter translates it into a provider-specific API request; and
- provider identifiers are delivery metadata, not semantic authority.

Provider-managed rendering features may be used behind this message contract,
but do not own notification meaning or business rules.

Do not make provider templates authoritative, encode business rules in the
provider, require Next.js availability to generate required email, or let
storefront code decide which commerce event produces a notification.

## Alternatives considered

### Provider-managed templates as authority

This can simplify delivery, but couples business meaning and client content to
an external provider.

### Next.js-owned rendering

This transfers required notification generation to a non-authoritative
storefront boundary and couples it to storefront availability.

## Consequences

- Notification semantics remain stable when providers change.
- Client branding can vary through validated configuration.
- Provider adapters translate delivery details without becoming domain owners.

## Not decided by this ADR

This decision does not define email provider, renderer, template format,
localization, template storage, or content-update workflow.
