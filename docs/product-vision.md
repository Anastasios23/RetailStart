# Product Vision

## V1 definition

The Retail Starter is a reusable e-commerce foundation for small and medium B2C retail businesses that sell physical products, providing branded online stores with a catalog, basic search, guest checkout, Stripe payments, orders, inventory, basic shipping, tax configuration, manual returns/refunds, transactional notifications, and admin management, while advanced workflows, custom integrations, customer accounts, marketing automation, and analytics remain outside V1.

The product addresses the need for small and medium retail businesses to sell products online through a reliable and professional branded e-commerce store that they can manage for routine daily operations without constant dependence on a developer.

## Initial users and market

The initial target is small and medium B2C retail businesses that sell physical products directly to consumers and need their own branded e-commerce store for online sales.

Examples include clothing, sporting goods, cosmetics, accessories, gifts, and similar retail products.

## Reusability goal

The starter should provide a common retail foundation that can be adapted per client while keeping each client deployment isolated.

The reusable foundation includes:

- Product and category browsing
- Product variants
- Cart and checkout flows
- Payments and orders
- Basic inventory and shipping logic
- Admin operations for products and orders
- Common UI components and basic layouts
- Authentication and authorization where required
- Basic SEO structure
- Validation, error handling, and basic tests
- Common deployment/configuration structure

Client data, branding, and special business requirements are not part of the reusable core.

Within V1, client-specific configuration includes:

- Brand identity, logo, colors, and visual style
- Page content, copy, and media
- Product/catalog data
- Prices, variants, and availability
- Shipping regions and basic shipping rules
- Payment configuration
- Tax configuration based on guidance from the client or their accountant
- Return/refund settings based on the policy provided or approved by the client
- Agreed small variations supported by the existing V1 foundation

New business workflows, custom integrations, or functionality requiring a change to the core product model are new scope rather than client-specific configuration.

## V1 product direction

V1 should support the core journey from browsing products through cart, checkout, payment, and order management, with basic inventory and shipping support.

The client receives a ready, functional, and branded e-commerce store adapted to their business, including products, categories, variants, cart, checkout, payments, orders, basic inventory and shipping, plus an admin interface for daily operations without requiring a developer for every change.

V1 uses guest checkout as the primary purchase path. Customers can complete an order without creating an account. Customer accounts, login, password management, and order history are not V1 requirements and may be added later as a separate extension if there is a real business need.

V1 basic shipping allows the client to define shipping regions or delivery zones, fixed shipping fees per region, optional free shipping above a specified order value, and basic local pickup where required. Live carrier rates, courier API integrations, automatic label generation, shipment tracking integrations, fulfillment provider integrations, and complex rules based on weight, dimensions, or multiple warehouses are future extensions or separate scope.

V1 supports standard online card payments through Stripe. The payment flow covers successful, failed, and cancelled payments; creates an order only when payment has completed as required; stores payment status; and supports test mode for development and testing. Multiple payment providers, PayPal, Klarna or other buy-now-pay-later methods, bank integrations, subscriptions, installments, and marketplace or split payments are outside V1. Additional payment methods may be added later when there is a real client need.

V1 includes basic tax calculation in checkout and orders. Tax rates and rules are configured from information provided or approved by the client or their accountant. The system applies the approved tax configuration but does not provide tax advice, VAT or tax filing, tax registration services, advanced multi-jurisdiction tax automation, or automatic legal or tax assessment of products or purchases. More complex tax requirements are separate scope.

V1 displays the client's approved return/refund policy, supports manual return management by an administrator, allows manual refund initiation and recording from the admin interface, and updates order and refund status correctly. Customer self-service returns, automated return approval, RMA workflows, exchanges, automatic refunds, and courier or return-label integrations are outside V1. The client provides or approves the return policy.

V1 includes transactional notifications only: order confirmation to the customer after a successful order or payment, new-order notification to the administrator, and basic customer notification when a payment fails or is cancelled. Marketing emails, abandoned-cart emails, newsletters, SMS or push notifications, automated marketing campaigns, and loyalty or promotional messaging are outside V1.

V1 includes stock quantity per product variant, availability checks before purchase, prevention of purchases without available stock, automatic inventory reservation when an order is created, correct stock reduction during fulfillment, and manual stock updates from the admin interface. Low-stock alerts, backorders, manual or custom stock reservations for special cases, purchase orders, multiple warehouses, advanced inventory workflows, and ERP/POS inventory synchronization are outside V1.

V1 supports one basic admin access level. Authorized admin users can manage products and categories, inventory, orders, payments and refunds, shipping configuration, tax configuration, and basic store settings. Granular permissions, separate roles such as manager, warehouse staff, or support, custom RBAC, and permissions per store section or resource are outside V1 and may be added later if there is a real client need.

V1 includes basic product search using keywords primarily across product names, categories, and available basic product data. Faceted search, advanced filtering, typo tolerance, autocomplete, custom ranking, AI or semantic search, and external search services are outside V1 and may be added later if required by the catalog or a real client.

V1 does not include dedicated reporting or analytics functionality. The admin interface provides basic operational information for products, inventory, orders, and payment or refund status. Sales dashboards, KPI reports, revenue analytics, custom reports, scheduled reports, advanced exports, and business intelligence functionality are outside V1 and may be added later based on real client needs.

## Boundaries

The first version is not intended for restaurants, marketplaces, B2B/wholesale businesses, subscription businesses, or businesses with complex ERP/POS workflows. It also does not cover complex promotions.

Detailed client requirements and future expansion priorities are `TBD`.
