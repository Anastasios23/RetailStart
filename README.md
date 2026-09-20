# retail-starter

Reusable Retail E-commerce Starter for client businesses selling physical products.

## Current status

Phase 1 application scaffolding is in place: a minimal Next.js storefront and
the pinned Medusa backend baseline are installed in a pnpm workspace. Local
PostgreSQL, provider wiring, and commerce implementation remain deferred to
later phases.

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
Medusa 2.21.0, Next.js 15.5.24, and React/React DOM 19.0.5. Local
infrastructure, hosting topology, provider wiring, and commerce implementation
details remain deferred within the boundaries documented in the architecture
baseline.
