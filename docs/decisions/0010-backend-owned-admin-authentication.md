# ADR-0010: Backend-owned admin authentication and authorization

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires authorized administrators to manage products, inventory, orders,
payments, refunds, shipping, tax, and basic store settings. It defines one
basic admin access level and explicitly excludes customer accounts, customer
login, password management, and order history.

Medusa is the authoritative commerce system, and duplicating administrative
identity or authorization in Next.js would create competing security
boundaries.

## Decision

Medusa/backend owns:

- admin authentication;
- admin sessions;
- authorization;
- administrative commerce operations.

V1 uses one basic admin access level. The Next.js storefront remains guest-only
for customers and does not add customer login, customer accounts, or order
history.

Next.js must not duplicate admin authorization logic. It may link or navigate
administrators to the admin surface, but it is not the authority for admin
identity or permissions.

The exact admin UI choice, whether Medusa's standard admin interface or a
custom admin interface, remains a later decision.

## Alternatives considered

### Next.js-owned admin authentication and authorization

This could provide a unified frontend experience, but would duplicate security
logic and create a second authority for administrative permissions.

### Shared customer and admin identity platform in V1

This could support future customer accounts and richer roles, but would add
identity scope that V1 explicitly excludes.

## Consequences

- Administrative access control is colocated with authoritative commerce
  operations.
- The storefront has no responsibility for customer identity or admin
  permission decisions.
- A later custom admin UI must consume the backend authorization boundary rather
  than create a parallel one.
- Expanding to customer accounts or granular roles requires a separate decision
  and scope review.

## Not decided by this ADR

This decision does not select the authentication protocol, session mechanism,
credential recovery process, admin UI, deployment access controls, or future
role model.
