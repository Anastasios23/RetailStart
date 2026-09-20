# ADR-0012: Medusa standard admin for V1

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires a basic administrative surface for products, variants, categories,
inventory, orders, payments, refunds, fulfillment, shipping configuration,
tax configuration, and basic store settings.

Medusa is the authoritative commerce system and provides a standard admin
surface for operational commerce management. Building a second admin
application would duplicate workflows, authorization integration, testing, and
maintenance.

## Decision

Use Medusa's standard admin interface for V1.

Use it for the approved operational workflows, including:

- products and variants;
- categories;
- inventory;
- orders;
- payments and refunds;
- fulfillment;
- shipping configuration;
- tax configuration;
- basic store settings.

Do not build a custom Next.js admin interface in V1.

If a future confirmed requirement cannot be handled adequately through Medusa
Admin, evaluate an admin extension or a separate custom admin surface at that
time.

## Alternatives considered

### Custom Next.js admin interface in V1

This would offer more control over branding and workflow presentation, but
would duplicate functionality already provided by the commerce backend and add
another security-sensitive application surface.

### Hybrid admin surface in V1

This could split workflows between Medusa Admin and a custom interface, but
would create two operational experiences before a demonstrated gap exists.

## Consequences

- V1 avoids duplicate admin functionality and keeps implementation focused on
  the reusable storefront and commerce foundation.
- Admin operations use the backend-owned authentication and authorization
  boundary.
- Medusa Admin's UX and supported workflow boundaries constrain V1 operations.
- A future custom admin surface requires evidence of an unmet requirement and a
  separate evaluation.

## Not decided by this ADR

This decision does not select admin branding, customization details, browser
support beyond the approved requirements, or a future custom-admin architecture.

## Reference

- [Medusa Admin User Guide](https://docs.medusajs.com/user-guide)
