# Project Context

## Project

`retail-starter` is a reusable e-commerce foundation for small and medium B2C retail businesses that sell physical products, providing branded online stores with a catalog, basic search, guest checkout, Stripe payments, orders, inventory, basic shipping, tax configuration, manual returns/refunds, transactional notifications, and admin management, while advanced workflows, custom integrations, customer accounts, marketing automation, and analytics remain outside V1.

## Initial target

Small and medium B2C retail businesses selling physical products directly to consumers and needing their own branded e-commerce store for online sales. Examples include clothing, sporting goods, cosmetics, accessories, gifts, and similar retail products.

The V1 target excludes restaurants, marketplaces, B2B/wholesale businesses, subscription businesses, and businesses with complex ERP/POS workflows.

## Business problem

These businesses need a reliable and professional way to sell products online through their own branded e-commerce store, while managing routine daily operations without constant dependence on a developer.

## Client deliverable

The client receives a ready, functional, and branded e-commerce store adapted to their business, including products, categories, variants, cart, checkout, payments, orders, basic inventory and shipping, plus an admin interface for daily operations without requiring a developer for every change.

## Reusable foundation

The reusable foundation includes product and category browsing, product variants, cart and checkout flows, payments and orders, basic inventory and shipping logic, admin operations for products and orders, common UI components and basic layouts, authentication and authorization where required, basic SEO structure, validation, error handling, basic tests, and a common deployment/configuration structure.

Client data, branding, and special business requirements are not part of the reusable core.

## Client-specific V1 configuration

Client-specific V1 configuration includes brand identity, logo, colors and visual style; page content, copy and media; product/catalog data; prices, variants and availability; shipping regions and basic shipping rules; payment configuration; tax configuration based on guidance from the client or their accountant; return/refund settings based on the policy provided or approved by the client; and agreed small variations supported by the existing V1 foundation.

New business workflows, custom integrations, or functionality requiring a change to the core product model are new scope rather than client-specific configuration.

## Checkout boundary

V1 uses guest checkout as the primary purchase path. Customers can complete an order without creating an account. Customer accounts, login, password management, and order history are not V1 requirements and may be added later as a separate extension if there is a real business need.

## Basic shipping boundary

V1 basic shipping allows the client to define shipping regions or delivery zones, fixed shipping fees per region, optional free shipping above a specified order value, and basic local pickup where required. Live carrier rates, courier API integrations, automatic label generation, shipment tracking integrations, fulfillment provider integrations, and complex rules based on weight, dimensions, or multiple warehouses are future extensions or separate scope.

## Payment boundary

V1 supports standard online card payments through Stripe. The payment flow covers successful, failed, and cancelled payments; creates an order only when payment has completed as required; stores payment status; and supports test mode for development and testing. Multiple payment providers, PayPal, Klarna or other buy-now-pay-later methods, bank integrations, subscriptions, installments, and marketplace or split payments are outside V1.

## Tax boundary

V1 includes basic tax calculation in checkout and orders. Tax rates and rules are configured from information provided or approved by the client or their accountant. The system applies the approved tax configuration but does not provide tax advice, VAT or tax filing, tax registration services, advanced multi-jurisdiction tax automation, or automatic legal or tax assessment of products or purchases. More complex tax requirements are separate scope.

## Returns and refunds boundary

V1 displays the client's approved return/refund policy, supports manual return management by an administrator, allows manual refund initiation and recording from the admin interface, and updates order and refund status correctly. Customer self-service returns, automated return approval, RMA workflows, exchanges, automatic refunds, and courier or return-label integrations are outside V1. The client provides or approves the return policy.

## Notification boundary

V1 includes transactional notifications only: order confirmation to the customer after a successful order or payment, new-order notification to the administrator, and basic customer notification when a payment fails or is cancelled. Marketing emails, abandoned-cart emails, newsletters, SMS or push notifications, automated marketing campaigns, and loyalty or promotional messaging are outside V1.

## Inventory boundary

V1 includes stock quantity per product variant, availability checks before purchase, prevention of purchases without available stock, automatic inventory reservation when an order is created, correct stock reduction during fulfillment, and manual stock updates from the admin interface. Low-stock alerts, backorders, manual or custom stock reservations for special cases, purchase orders, multiple warehouses, advanced inventory workflows, and ERP/POS inventory synchronization are outside V1.

## Admin access boundary

V1 supports one basic admin access level. Authorized admin users can manage products and categories, inventory, orders, payments and refunds, shipping configuration, tax configuration, and basic store settings. Granular permissions, separate roles such as manager, warehouse staff, or support, custom RBAC, and permissions per store section or resource are outside V1 and may be added later if there is a real client need.

## Search boundary

V1 includes basic product search using keywords primarily across product names, categories, and available basic product data. Faceted search, advanced filtering, typo tolerance, autocomplete, custom ranking, AI or semantic search, and external search services are outside V1 and may be added later if required by the catalog or a real client.

## Reporting boundary

V1 does not include dedicated reporting or analytics functionality. The admin interface provides basic operational information for products, inventory, orders, and payment or refund status. Sales dashboards, KPI reports, revenue analytics, custom reports, scheduled reports, advanced exports, and business intelligence functionality are outside V1 and may be added later based on real client needs.

## Current phase

All 17 phases of `docs/implementation-plan.md` are complete, verified, and merged on `main`: the pnpm
workspace, the Medusa/PostgreSQL commerce baseline, catalog browsing (products,
variants, categories), keyword search, a persistent cart, guest checkout, a Stripe test-mode
payment flow, authoritative order confirmation and reconciliation, transactional notifications,
fulfillments/refunds/restocking, media workflow, bulk onboarding, observability, zero-downtime
deployment lifecycle, backup/recovery, client presentation configuration, privacy lifecycle CAS,
and production-readiness verification.

V1 release acceptance criteria are satisfied per `docs/release-readiness-v1.md`.

A 2026-10-27 ponytail audit (`docs/ponytail-audit-v1.md`) confirmed the product is a per-client store engine, not a multi-tenant Shopify-like platform. Intended reuse: copy the repo for each business and change brand/presentation (and client data/secrets) while keeping commerce behavior. First demo/client delivery work is prioritized in `docs/client-delivery-next-steps.md`.

## Deployment model

Each client should initially have an isolated deployment. The project is not currently planned as a multi-tenant SaaS architecture.

## Accepted architecture direction

The accepted V1 architecture uses one repository with two independently deployable applications:

- Next.js and TypeScript for the customer-facing storefront and SEO presentation
- Medusa for the commerce backend and authority for catalog, cart, checkout, payment, order, inventory, fulfillment, refund, and admin operations

Each client deployment has a dedicated PostgreSQL database owned by Medusa and isolated object storage. External providers such as Stripe and transactional email are accessed through backend-owned adapters. Cloudflare may be used where useful for DNS, CDN, frontend or media delivery, or edge security, but it is not a commerce authority.

The storefront uses a thin typed public Store API boundary. It does not expose private/admin APIs, backend credentials, database access, or a second commerce authority to the browser. The full boundary and invariants are in [the architecture baseline](docs/architecture.md).

## Open context

The following remain implementation or deployment follow-ups rather than unresolved architecture boundaries:

- the Medusa SDK and any other Store API integration dependencies;
- local PostgreSQL, object-storage, email, observability, hosting, and deployment choices;
- the selected Medusa-version checkout/payment/reservation lifecycle sequence;
- implementation-specific modules, workflows, adapters, endpoint shapes, persistence layout, serialization, and test tooling;
- numeric operational limits, retry budgets, cache freshness, abuse thresholds, browser/device matrices, and CI gates;
- client-specific origins, branding, content, media, commerce configuration, and approved lifecycle policy.

See the architecture baseline for the complete deferred-choice list and the implementation plan for when each choice becomes necessary.
