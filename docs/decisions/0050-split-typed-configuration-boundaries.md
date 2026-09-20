# ADR-0050: Split typed configuration boundaries

- Status: Accepted
- Date: 2026-09-19

## Context

Each client deployment needs isolated secrets, deployment wiring, presentation
configuration, content, media references, and commerce configuration. These
values have different authorities and different exposure requirements.

Putting all structured configuration in environment variables would make
client presentation and content difficult to validate and manage. A separate
CMS or general-purpose configuration service would add another platform and
source of truth without an approved V1 requirement.

## Decision

Use split, typed configuration boundaries with explicit ownership.

For V1:

- Runtime environment configuration owns secrets, database connection details,
  provider credentials, deployment-specific wiring, and backend-only
  operational settings.
- Validated client presentation configuration/content owns branding, theme
  tokens, public SEO settings, navigation and presentation settings, approved
  static content, and stable references to client media.
- Medusa/Admin owns commerce configuration and commerce data, including
  products, variants, prices, inventory, categories, shipping, tax, payment,
  and operational commerce settings.
- Object storage owns binary media assets, referenced through stable
  identifiers or URLs according to the media boundary.

Next.js receives only the safe public subset of client configuration required
to render the storefront. Configuration is validated before use so malformed or
incomplete client-specific settings fail clearly rather than producing
undefined runtime behavior.

No separate CMS or general-purpose configuration service is required for V1.

## Alternatives considered

### All structured configuration in environment variables

This is simple for deployment wiring but is a poor fit for structured content,
theme values, navigation, SEO settings, and other client presentation data.

### Separate configuration service or CMS

This could support dynamic editing and centralized management, but would add
infrastructure, authentication, synchronization, and another source of truth
without a confirmed V1 requirement.

### Duplicate commerce configuration in Next.js

This could simplify some rendering paths but would create conflicting catalog,
pricing, shipping, tax, or payment state outside Medusa. It is not acceptable.

## Consequences

- Configuration authority is explicit across runtime, presentation, commerce,
  and media concerns.
- Next.js can receive safe public configuration without exposing backend-only
  values or secrets.
- Client-specific presentation changes can use a controlled validated update
  process without repository forks.
- Commerce configuration remains governed by Medusa/Admin.
- Configuration validation becomes a production-readiness concern for every
  client deployment.

## Not decided by this ADR

This decision does not select the configuration schema, validation library,
file or package structure, content update workflow, or deployment injection
mechanism.

