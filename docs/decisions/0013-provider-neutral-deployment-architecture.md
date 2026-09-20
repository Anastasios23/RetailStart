# ADR-0013: Provider-neutral deployment architecture

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter is delivered as isolated client deployments and must remain
reusable across future client infrastructure choices. The core depends on
standard application and integration boundaries for Next.js, Medusa,
PostgreSQL, object storage, Stripe, and transactional email.

Cloudflare is proposed as an optional platform layer, but no hosting provider
or exact deployment topology has been selected.

## Decision

Keep the Retail Starter core provider-neutral.

Use standard application and configuration boundaries for:

- Next.js;
- Medusa;
- PostgreSQL;
- object storage;
- Stripe;
- transactional email.

Cloudflare may be used where it provides clear value, including DNS, CDN,
frontend delivery, media delivery, and security or edge services. Core
commerce behavior must not depend on Cloudflare-specific runtime or storage
features.

The system must remain deployable on alternative infrastructure without
redesigning the commerce architecture. Do not lock the V1 architecture to a
single hosting provider.

## Alternatives considered

### Cloudflare-first architecture

This could simplify selected edge or delivery concerns, but would couple the
core to provider-specific runtime and storage behavior and could constrain
Medusa, PostgreSQL, and worker deployment options.

### Single integrated hosting platform

This could reduce initial deployment choices, but would introduce provider
lock-in before client requirements and operational evidence justify it.

## Consequences

- Provider-specific capabilities remain optional adapters or platform layers.
- Client deployment choices can evolve without changing commerce authority or
  data ownership.
- Deployment documentation must identify portable contracts and any optional
  platform optimizations separately.
- Some provider-specific conveniences may require additional integration work
  when adopted, because they are not part of the core contract.

## Not decided by this ADR

This decision does not select a hosting provider, deployment topology, domain
layout, region, runtime, package versions, or infrastructure-as-code tool.
