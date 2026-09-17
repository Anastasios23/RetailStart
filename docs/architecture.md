# Proposed Architecture

## Status

This document records the current technology direction before implementation. It is not a final implementation specification.

## Deployment model

Each client should initially receive an isolated deployment. A multi-tenant SaaS architecture is not part of the current direction.

## Proposed components

- **Storefront:** Next.js with TypeScript
- **Commerce backend:** Medusa
- **Database:** PostgreSQL
- **Payments:** Stripe
- **Platform services:** Cloudflare where appropriate for frontend, CDN, or DNS

These choices are proposed and require verification against current documentation before implementation.

## Intended boundary

The storefront, commerce backend, database, payment provider, and platform services should remain clearly separated. Exact integration boundaries and ownership of each responsibility are `TBD`.

## Architecture TBD

- Exact versions and package manager
- Hosting and deployment topology
- Authentication and authorization, including admin access
- Product media and file storage
- Shipping and tax integrations
- Email, search, analytics, observability, backups, and recovery
- Security, performance, and availability requirements
- Local development and test strategy

