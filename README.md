# retail-starter

Reusable Retail E-commerce Starter for client businesses selling physical products.

## Current status

This project is in the documentation phase. No application code, dependencies, or implementation configuration has been created.

## Documentation

- [Project context](CONTEXT.md)
- [Product vision](docs/product-vision.md)
- [V1 scope](docs/scope-v1.md)
- [Architecture baseline](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
- [Architecture decisions](docs/decisions/README.md)

## Accepted architecture direction

The accepted V1 architecture uses one repository with a Next.js storefront and a Medusa commerce backend, one dedicated PostgreSQL database and isolated object storage per client, and backend-owned adapters for Stripe, email, and other external providers. Cloudflare may be used where useful for DNS, CDN, frontend or media delivery, or edge security; core commerce behavior does not depend on it.

Implementation has not started. Exact versions, package-manager and runtime choices, local infrastructure, hosting topology, provider wiring, and other implementation details remain deferred within the boundaries documented in the architecture baseline.
