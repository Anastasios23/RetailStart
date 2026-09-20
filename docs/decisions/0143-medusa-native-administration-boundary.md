# ADR-0143: Medusa-native administration boundary

- Status: Accepted refinement of ADR-0010, ADR-0057, and ADR-0061
- Date: 2026-09-19

## Context

ADR-0057 selects Medusa-native admin authentication, and ADR-0061 makes
Medusa Admin the V1 operational recovery surface. Administrative commerce
operations must remain behind one identity and authorization boundary.

## Decision

Medusa owns admin identity, authentication, sessions, and authorization.
Medusa Admin is the primary V1 operational commerce interface, using the
approved single basic admin access level.

Catalog, inventory, orders, payments, refunds, fulfillment, shipping/tax
configuration, and recovery or reconciliation extensions remain behind the
Medusa authorization boundary.

Next.js may link an authorized operator to Medusa Admin but does not reproduce,
proxy, or replace the admin identity model.

Do not build a custom Next.js admin, duplicate Medusa session handling, expose
admin credentials or privileged APIs to the storefront, introduce a separate
authorization model for recovery extensions, or add external IdP/SSO without a
demonstrated requirement.

Future requirements for multiple roles, SSO, enterprise identity, or finer
authorization require a separate identity/authorization decision.

## Alternatives considered

### Custom Next.js administration surface

This duplicates Medusa Admin functionality and creates a second authentication
and authorization boundary.

### External identity provider in V1

This may support enterprise needs, but adds identity integration complexity
without an approved V1 requirement.

## Consequences

- Administrative identity and permissions have one V1 authority.
- Operational and recovery actions share Medusa-native authorization.
- Future identity expansion remains an explicit architecture change.

## Not decided by this ADR

This decision does not define password policy, MFA, session format, reset,
onboarding/offboarding, or ingress restrictions.
