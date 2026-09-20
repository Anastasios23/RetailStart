# ADR-0057: Medusa-native admin authentication

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0010 establishes that Medusa/backend owns admin identity, authentication,
sessions, authorization, and administrative commerce operations. ADR-0012
selects Medusa Admin as the V1 operational administration surface.

V1 requires one basic admin access level and does not require customer login,
centralized SSO, or an external identity provider.

## Decision

Use Medusa-native admin authentication for V1.

For V1:

- Medusa owns admin identity, authentication, sessions, and authorization.
- Medusa Admin remains the operational administration surface.
- The approved V1 model uses one basic admin access level.
- Next.js has no admin authentication authority.
- Next.js may link operators to Medusa Admin but does not reproduce admin
  login, session, or authorization logic.
- Private/admin API access remains protected by Medusa's backend
  authentication boundary.

Use Medusa's native admin authentication before introducing custom
authentication providers. A future requirement for centralized SSO, enterprise
identity, or another provider must be evaluated as an explicit extension to
this boundary.

## Alternatives considered

### External identity provider or SSO in V1

This could provide centralized identity and enterprise controls, but would add
integration, account mapping, configuration, and operational dependencies
without an approved V1 requirement.

### Custom Next.js admin authentication

This would duplicate admin users, sessions, and authorization logic across the
storefront boundary. It is not acceptable.

## Consequences

- There is one V1 authority for admin identity, sessions, and permissions.
- Medusa Admin can use the backend's native operational boundary directly.
- The storefront remains guest-only and never handles privileged admin
  credentials or sessions.
- Future SSO or identity-provider work must preserve the Medusa-owned admin
  authorization boundary.

## Not decided by this ADR

This decision does not select password policy, MFA requirements, session or JWT
choice, reset and recovery flow, credential rotation, admin onboarding or
offboarding process, or network/ingress restrictions.

