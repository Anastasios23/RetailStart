# ADR-0101: Medusa-native operational authorization

- Status: Accepted refinement of ADR-0010, ADR-0057, ADR-0061, and ADR-0099
- Date: 2026-09-19

## Context

ADR-0057 selects Medusa-native admin authentication for V1. ADR-0061 makes
Medusa Admin and backend-owned operational extensions the recovery surface.
ADR-0099 requires all live commerce mutations to use Medusa-owned boundaries.

Operational automation also needs authorization without turning database
credentials into a second access-control system.

## Decision

Use Medusa-native operator and backend authorization for all operational
commerce mutations.

For V1:

- Medusa Admin uses Medusa-native admin authentication and authorization;
- the basic V1 admin access model remains in effect;
- backend-owned imports, onboarding, migrations, and operational actions run
  through authenticated backend boundaries;
- automation uses explicit backend authorization rather than direct database
  authority;
- Next.js and browser/client tools do not receive operational mutation
  authority; and
- direct PostgreSQL credentials are not an operational authorization
  mechanism.

Non-human automation uses an explicitly authenticated backend-owned mechanism
with the minimum required authority and durable attribution.

Do not create separate authorization models for operational tools, grant
storefront code privileged mutation credentials, use database credentials as an
access-control shortcut, or bypass Medusa authorization for normal commerce
operations.

## Alternatives considered

### Separate authorization model per operational tool

This may fit individual tools, but fragments identity, permission, revocation,
and attribution behavior.

### Database credentials as operational authority

This is direct and powerful, but bypasses Medusa authorization and domain
validation and makes safe attribution harder.

## Consequences

- Human and automated operational actions share the Medusa authorization
  boundary.
- Database access remains an implementation/recovery concern rather than an
  operational permission model.
- Automation credentials and attribution require deliberate least-privilege
  design.

## Not decided by this ADR

This decision does not define automation credential formats, token lifecycle,
operator permissions beyond the approved V1 model, or network restrictions.
