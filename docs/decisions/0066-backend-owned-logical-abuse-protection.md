# ADR-0066: Backend-owned logical abuse protection

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0064 and ADR-0065 establish the public Store API credential, origin, and
CSRF boundaries. Public guest commerce operations may still be abused in ways
that affect operational cost, provider calls, inventory, or commerce
integrity.

## Decision

Use backend-owned logical abuse protection for public Store API operations, with
optional edge or CDN controls as defense in depth.

For V1, Medusa/backend owns abuse-protection decisions for commerce-sensitive
public operations, including where abuse could affect:

- cart creation or mutation;
- checkout attempts;
- payment initiation or retry;
- notification-triggering operations;
- webhook-adjacent or reconciliation-sensitive flows exposed indirectly
  through public actions;
- other operations that could create operational cost or integrity risk.

Backend controls should be aware of logical operation identity, idempotency,
cart/session context, and authoritative commerce state where relevant.

Edge/CDN protection may absorb volumetric abuse, block obviously malicious
traffic, apply coarse request-rate controls, and reduce unnecessary load before
traffic reaches Medusa. It is not the sole protection for correctness-sensitive
commerce operations.

Abuse controls do not bypass or replace backend idempotency, concurrency, or
authorization rules. Client IP is not the sole logical identity for every
protected operation.

## Alternatives considered

### Provider-specific edge protection only

This can filter traffic efficiently but cannot fully understand cart, checkout,
payment, idempotency, or logical commerce-operation semantics.

### Client IP as the only identity

This is easy to apply but is weak for shared networks, NAT, mobile clients,
automation, and legitimate traffic behind common addresses.

### No explicit logical abuse protection

This leaves public commerce operations exposed to automated misuse and can
increase provider cost or operational risk.

## Consequences

- Correctness-sensitive abuse decisions remain within the backend authority.
- Edge controls can reduce volumetric load without becoming commerce authority.
- Protection policies must distinguish logical operation context from coarse
  network traffic characteristics.
- Abuse controls require monitoring and safe interaction with idempotency and
  retry behavior.

## Not decided by this ADR

This decision does not select protected endpoint classes, identity keys,
counters or storage, numeric limits, burst policy, backoff behavior, response
semantics, monitoring, or edge-provider integration.

