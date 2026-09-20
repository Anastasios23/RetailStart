# ADR-0003: Medusa-first commerce implementation

- Status: Accepted
- Date: 2026-09-19

## Context

Architecture Q2 establishes Medusa as the single authoritative commerce system.
V1 covers standard physical-product retail capabilities, while allowing future
client-specific requirements to be handled through explicit extension points.

Introducing a second commerce service or placing critical commerce rules in the
storefront would duplicate orchestration and weaken the authority boundary.

## Decision

Use a Medusa-first architecture for V1. Use Medusa's standard commerce
capabilities and configuration wherever they satisfy the approved requirements.

Implement custom behavior only when a documented requirement is not satisfied
by Medusa's standard capabilities. Custom commerce behavior remains
backend-owned and is implemented through Medusa extension mechanisms such as
modules, workflows, handlers, or integrations.

Do not introduce a separate custom commerce service, duplicate commerce
orchestration, or business-critical commerce rules inside Next.js.

Medusa remains the single commerce authority while explicit backend extension
points remain available for future client-specific needs.

## Alternatives considered

### Separate custom commerce orchestration service

This would provide additional control, but would create a second critical state
boundary and duplicate commerce behavior that must remain consistent with
Medusa.

### Custom commerce backend

This could fit unusual requirements more directly, but V1 targets standard
physical-product retail and does not justify replacing or bypassing the
proposed commerce foundation.

### Business-critical rules in the Next.js storefront

This might make simple flows appear faster to implement, but the storefront is
not authoritative and cannot safely own payment, order, inventory, refund, or
other commerce state transitions.

## Consequences

- V1 implementation stays as small as the approved requirements allow.
- Standard Medusa behavior and configuration are preferred over custom code.
- Custom behavior has a clear owner and must remain inside the commerce backend
  boundary.
- A documented requirement must justify each custom commerce extension.
- Medusa capability gaps must be evaluated explicitly rather than silently
  worked around in the storefront.

## Not decided by this ADR

This decision does not identify the exact Medusa modules, workflows, handlers,
plugins, or integrations required for individual V1 capabilities. It also does
not decide the database topology, payment integration details, email provider,
media storage, or deployment model.
