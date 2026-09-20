# ADR-0024: Isolated runtime secrets and public storefront configuration

- Status: Accepted
- Date: 2026-09-19

## Context

Each client deployment has separate credentials, databases, external-service
accounts, and backend authority. V1 security requirements prohibit secrets and
sensitive payment or customer data from appearing in code, bundles, logs,
errors, or notifications.

## Decision

Each client deployment keeps its secrets and credentials isolated.

Sensitive values, including Stripe secret keys, email-provider credentials,
object-storage credentials, PostgreSQL credentials, admin or authentication
secrets, and webhook secrets, are provided at runtime only to the backend or
service that owns them.

Next.js receives only explicitly safe public configuration required by the
storefront.

Secrets must never be committed to Git, embedded in client-side bundles,
written to logs, exposed in error messages, included in notifications, or
shared across client deployments unless an explicit architectural reason and
security review approve it.

Do not introduce a shared cross-client secrets platform as a required V1
dependency.

## Alternatives considered

### Repository or deployment-content secrets

This could simplify initial setup, but would increase exposure, rotation,
client-isolation, and accidental-publication risks.

### Shared cross-client secrets platform

This could centralize management, but would create a common security boundary
and required platform dependency inconsistent with isolated deployments.

## Consequences

- Secret ownership follows service ownership and client deployment isolation.
- Public storefront configuration must be deliberately classified as safe
  before exposure to Next.js or the browser.
- Credential rotation and deployment setup remain operational tasks without
  requiring a new shared platform in V1.
- Any deliberate cross-client secret sharing requires an explicit security
  review rather than becoming an implicit default.

## Not decided by this ADR

This decision does not select a secrets manager, environment-variable
structure, rotation process, deployment tooling, or public-configuration schema.
