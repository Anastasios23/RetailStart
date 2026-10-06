# retail-starter

Reusable Retail E-commerce Starter for client businesses selling physical products.

## Current status

Implemented through Phase 7 of the [implementation plan](docs/implementation-plan.md):
a Next.js storefront and a Medusa/PostgreSQL commerce backend in a pnpm
workspace, with catalog browsing (products, variants, categories), a persistent
cart, guest checkout, a Stripe test-mode payment flow, and authoritative order
confirmation and reconciliation.

V1 is not complete. Phases 8-17 (notifications, fulfillment and refunds, media,
bulk onboarding, observability, deployment, backup and recovery, client
presentation, privacy, and production readiness) remain planned/incomplete.

## Documentation

- [Project context](CONTEXT.md)
- [Product vision](docs/product-vision.md)
- [V1 scope](docs/scope-v1.md)
- [Architecture baseline](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
- [Architecture decisions](docs/decisions/README.md)

## Accepted architecture direction

The accepted V1 architecture uses one repository with a Next.js storefront and a Medusa commerce backend, one dedicated PostgreSQL database and isolated object storage per client, and backend-owned adapters for Stripe, email, and other external providers. Cloudflare may be used where useful for DNS, CDN, frontend or media delivery, or edge security; core commerce behavior does not depend on it.

The Phase 1 compatibility baseline uses Node.js 22.23.2, pnpm 10.11.1,
Medusa 2.21.0, Next.js 15.5.24, and React/React DOM 19.0.5. Hosting
topology, production provider configuration, and other details not yet
implemented remain deferred within the boundaries documented in the
architecture baseline.
