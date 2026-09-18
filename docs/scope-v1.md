# V1 Scope

## V1 definition

The Retail Starter is a reusable e-commerce foundation for small and medium B2C retail businesses that sell physical products, providing branded online stores with a catalog, basic search, guest checkout, Stripe payments, orders, inventory, basic shipping, tax configuration, manual returns/refunds, transactional notifications, and admin management, while advanced workflows, custom integrations, customer accounts, marketing automation, and analytics remain outside V1.

## Target client

Small and medium B2C retail businesses selling physical products directly to consumers and needing their own branded e-commerce store for online sales.

Examples include clothing, sporting goods, cosmetics, accessories, gifts, and similar retail products.

## Client outcome

The client receives a ready, functional, and branded e-commerce store adapted to their business, including products, categories, variants, cart, checkout, payments, orders, basic inventory and shipping, plus an admin interface for daily operations without requiring a developer for every change.

## Reusable foundation

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

Client data, branding, and special business requirements are client-specific and are not part of the reusable core.

## Client-specific V1 configuration

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

## In scope

- Products
- Categories
- Product variants such as size and color
- Inventory
- Cart
- Checkout
- Payments
- Orders
- Basic tax calculation in checkout and orders
- Return/refund policy display and manual admin management
- Basic transactional notifications for orders and payments
- Basic product search by keywords
- Basic shipping
- Basic admin access for products, categories, inventory, orders, payments/refunds, shipping configuration, tax configuration, and basic store settings
- Basic operational information for products, inventory, orders, and payment/refund status

### Inventory includes

- Stock quantity per product variant
- Availability checks before purchase
- Prevention of purchases without available stock
- Automatic inventory reservation when an order is created
- Correct stock reduction during fulfillment
- Manual stock updates from the admin interface

### Basic shipping includes

- Shipping regions or delivery zones
- Fixed shipping fees per region
- Optional free shipping above a specified order value
- Basic local pickup where required

### Payments include

- Standard online card payments through Stripe
- Successful payment handling
- Failed payment handling
- Cancelled payment handling
- Order creation only when payment has completed as required
- Payment status storage
- Test mode for development and testing

## Acceptance criteria

### Primary end-to-end acceptance gate

The Retail Starter V1 is basically accepted when a guest customer can complete one full successful purchase:

- Find and open an available product
- Add the product to the cart
- Proceed through guest checkout
- Receive correct shipping and tax calculations based on configuration
- Complete a successful Stripe payment
- Have the order created correctly
- Have inventory updated correctly
- Have payment and order status updated correctly
- Have the required transactional notifications sent

Failed or cancelled payments, refunds, admin operations, and other operational scenarios are separate acceptance criteria and are tested independently.

### Failed or cancelled payment acceptance criterion

When a Stripe payment fails or is cancelled:

- No confirmed or completed order is created
- Inventory is not permanently reduced
- Any temporary inventory reservation is released correctly
- The payment attempt and final payment status are recorded
- The guest customer receives clear information about the failure or cancellation
- The customer can try again without duplicate orders being created
- Only the transactional notification defined for the failed or cancelled payment is sent
- The incident is available for admin troubleshooting or visibility where the system supports it

The payment attempt must remain clearly distinct from a successfully confirmed order.

### Stock availability acceptance criterion

If a product is available when viewed or added to the cart but becomes unavailable before the purchase is completed:

- The purchase does not complete
- No confirmed or completed order is created
- Inventory is not permanently reduced beyond the stock actually available
- The guest customer is clearly informed that the product is no longer available
- The cart remains available so the customer can remove or replace the unavailable product and try again

The system must re-check availability before final purchase confirmation to prevent overselling.

### Refund acceptance criterion

For confirmed and paid orders, an admin can initiate a manual refund that supports:

- A full refund
- A partial refund for a specified amount
- Correct payment and refund status updates
- Recording the refund in the order history
- Processing through the configured payment provider
- Showing the refund to the admin
- Sending one transactional refund confirmation to the customer
- Identifying whether the refund is full or partial and stating the refunded amount
- Not sending duplicate refund notifications for the same refund

The refund notification is a transactional update and not marketing communication. Customer self-service refunds, automatic refund approval, exchange workflows, and advanced RMA automation are outside V1.

### Refund and inventory acceptance criterion

When a full or partial refund is processed:

- The refund alone does not automatically increase available inventory
- Payment or refund status and order history are updated independently of inventory
- Stock increases only when a product has actually been returned and an admin confirms that it is sellable again
- Damaged or non-resellable returned items are not added to available stock
- The refund event and inventory adjustment remain separate operational events

### Catalog browsing acceptance criterion

Catalog browsing is accepted when a guest customer can:

- Browse product categories
- Open the correct product detail
- See the correct price, variants, and availability
- Select only a valid product variant
- Receive clear information when a product or variant is out of stock
- Not add an unavailable variant to the cart

Product detail must be a reliable representation of the current catalog and inventory state.

### Price consistency acceptance criterion

If a product price changes after it is added to the cart but before payment, V1 must:

- Re-check the current price before payment
- Update the cart and order summary with the new price
- Clearly inform the customer that the price changed
- Require renewed customer confirmation before continuing to payment
- Store the final customer-confirmed unit price on the confirmed order
- Not apply a price change silently

The confirmed order must be a snapshot of the prices in effect and confirmed when the purchase was completed.

### Failed refund acceptance criterion

If a full or partial refund fails at the configured payment provider, V1 must:

- Not show the refund as successful or completed
- Clearly update the payment or refund status as failed
- Record the refund attempt and result in the order history
- Inform the admin that action or retry is required
- Not send a refund confirmation to the customer
- Allow a safe retry without creating a duplicate refund
- Send a refund confirmation only after the payment provider confirms a successful refund

### Successful-order notification acceptance criterion

After a successful purchase:

- An order confirmation is sent to the customer
- A new-order notification is sent to the admin
- The notifications contain the basic order details
- Duplicate notifications are not sent for the same order
- An email-delivery failure does not create a second order or a second charge

These notifications are mandatory parts of the successful order flow.

### Basic product search acceptance criterion

The basic product search is accepted when a guest customer can:

- Enter a keyword
- Receive relevant products based on product name, category, and available basic product data
- Open the correct product detail from the results
- Receive clear information when there are no results

Advanced filters, typo tolerance, autocomplete, custom ranking, and semantic or AI search are outside V1.

### Cart acceptance criterion

The cart is accepted when a guest customer can:

- Select a valid product variant
- Add the variant to the cart
- Increase or decrease the quantity
- Remove a product from the cart
- See the correctly updated subtotal
- Not set a quantity greater than the available stock
- Receive clear information when the requested quantity is unavailable

Cart changes must remain consistent with current inventory and must not permit overselling.

### Guest checkout acceptance criterion

Guest checkout is accepted when the customer can:

- Complete checkout without creating an account
- Provide the necessary contact details
- Provide and confirm the necessary shipping details
- Select a valid shipping option where required
- See the final order summary before payment
- Proceed to the payment flow

Checkout must request only the data necessary for the order, shipping, tax, and payment, show clear validation errors for incomplete or invalid data, and prevent continuation when required data is missing.

### Basic shipping acceptance criterion

Basic shipping is accepted when:

- The correct fixed shipping fee is applied based on the configured shipping region or zone
- Free shipping is applied when the configured order-value threshold is met
- Local pickup is shown when enabled
- The correct shipping amount is shown in the final order summary
- The customer receives clear information when no shipping option is available for the address

V1 uses only configured basic shipping rules and does not include live carrier rates or courier integrations.

### Basic tax acceptance criterion

Basic tax calculation is accepted when:

- The configured and approved tax rate or rule is applied
- Tax is calculated only for order components configured as taxable
- Tax is shown as a separate amount in the final order summary
- The final total agrees with subtotal plus shipping plus tax
- The same tax amounts and tax details are stored on the order
- The customer receives clear information when valid tax configuration cannot be applied

V1 applies only configuration approved by the client or their accountant and does not provide tax advice or automatic tax assessment.

### Admin operations acceptance criterion

V1 is operationally accepted when an authorized admin with one basic access level can:

- Create, edit, and manage products, variants, and categories
- Update inventory
- View and manage orders
- View payment and refund status
- Initiate manual full or partial refunds
- Manage basic shipping configuration
- Manage approved tax configuration
- Update basic store settings
- View the basic operational information required for daily operation

Granular roles, custom permissions, and complex RBAC are outside V1.

### Order creation acceptance criterion

After a successful payment, V1 must create exactly one confirmed order that correctly stores:

- Purchased products and variants
- Quantities
- Unit prices
- Subtotal
- Shipping amount
- Tax amount
- Final total
- Guest customer contact details
- Shipping or pickup details
- Order status
- Payment status

The confirmed order must be a reliable snapshot of the purchase at the time it was completed. Duplicate confirmed orders must not be created for the same successful payment.

### Inventory lifecycle acceptance criterion

Inventory behavior is accepted when:

- Available stock is reserved when a confirmed order is created
- Reserved stock is not considered available for a new purchase
- Stock is permanently reduced when the order moves to fulfillment
- Failed or cancelled flows correctly release any temporary reservation
- Admin inventory updates correctly update the available quantity
- The combined reserved and sold quantity cannot exceed the stock actually available
- The system does not permit overselling

The distinction between available, reserved, and fulfilled stock must remain consistent throughout the order lifecycle.

### Fulfillment acceptance criterion

Fulfillment is accepted when an authorized admin can move a confirmed order to fulfillment and the system:

- Correctly updates the order and fulfillment status
- Permanently reduces the corresponding stock
- Correctly updates available, reserved, and fulfilled quantities
- Prevents duplicate fulfillment of the same quantity
- Maintains a consistent inventory lifecycle after fulfillment

Carrier tracking, shipping labels, courier API integrations, automatic fulfillment, and multi-warehouse fulfillment workflows are outside V1.

### Failed or cancelled payment notification acceptance criterion

For a failed or cancelled Stripe payment, V1 must:

- Send one clear transactional notification to the customer
- State that the purchase did not complete and no confirmed order was created
- Allow a retry without creating a duplicate order or duplicate charge
- Not send an order-confirmation notification
- Not send a new-order notification to the admin
- Not create duplicate failure or cancellation notifications for the same payment attempt

Successful-order notifications are sent only when a confirmed successful order exists.

## Non-functional requirements

### Security

V1 must meet at least the following security requirements:

- Only authenticated and authorized admins can perform admin operations
- Unauthorized users cannot view or change orders, inventory, payments, refunds, or configuration
- Admin sessions are managed securely
- All production communication uses HTTPS/TLS
- Raw card details are not stored or passed through the application where this can be avoided
- Customer and admin data are protected from unauthorized access
- All external or user-controlled inputs undergo appropriate validation
- Secrets, credentials, and sensitive payment or customer data do not appear in logs, errors, or notifications
- Payment, refund, and order operations are protected from duplicate or replay execution
- Failed authorization or payment operations do not leave the system in an inconsistent state

Enterprise certifications, advanced RBAC, and additional enterprise security controls are outside V1 unless required later.

### Performance

V1 must meet the following performance requirements:

- Storefront browsing, search, product detail, cart, and checkout remain responsive under expected V1 usage
- Basic admin operations complete without unreasonable delays
- No indefinite loading states are presented
- Slow or temporarily unavailable external services show a clear status to the user
- Where safe, retry is available without duplicate payment, refund, or order execution
- Performance degradation does not sacrifice correctness, payment safety, inventory consistency, or order integrity

Numeric performance targets are not defined yet and may be added later only if a real need arises.

### Accessibility

V1 must meet at least the following accessibility requirements:

- Storefront, product detail, cart, checkout, and basic admin operations can be used with a keyboard
- Semantic HTML elements and appropriate labels are used for screen readers
- All interactive elements have a visible focus state
- Validation and error messages are clear and accessible
- Important information is not conveyed by color alone
- Text and interactive elements have sufficient contrast and remain readable
- The UI remains usable on mobile and small screens
- Core user flows do not depend exclusively on mouse or touch

Separate accessibility certification or a formal audit is not required for V1 and may be added as separate scope if needed.

### Reliability

V1 must meet at least the following reliability requirements:

- Transient failures or interruptions do not create duplicate orders, payments, refunds, or notifications
- A successful payment is not lost without a clear and recoverable order or payment outcome
- Failed operations leave a consistent order, payment, refund, and inventory state
- Safe retry is possible where permitted
- Customer and admin flows show a clear recoverable error instead of failing silently
- Confirmed data remains available and consistent after a service restart or temporary interruption
- Partial failures do not leave the system in an ambiguous or conflicting business state

For V1, reliability primarily means avoiding silent data loss, duplicate side effects, and inconsistent business state.

### Backups and recovery

V1 must meet at least the following backup and recovery requirements:

- Authoritative business data, including orders, payments or refunds, inventory, customer or order data, and basic store configuration, is included in backups
- Media, assets, and other persistent data outside the primary business data store are covered by an appropriate backup strategy where required
- Backups are protected from unauthorized access and accidental loss
- A documented recovery and restore procedure exists
- At least one real restore test is completed before V1 is considered production-ready
- The restore test confirms that critical data is recovered correctly and the store can return to an operational state
- Exact RPO and RTO targets remain TBD until actual hosting and business requirements are known

Backups without a verified restore are not sufficient as a recovery control.

### Observability

V1 must provide sufficient operational observability for critical commerce events to be identified and investigated.

For order, payment, refund, inventory, and notification events, V1 must provide:

- Clear statuses and timestamps
- Safe correlation or reference identifiers
- Records of failures, retries, and ambiguous outcomes
- Enough information for troubleshooting without exposing secrets or sensitive payment or customer data
- Admin-visible operational status where necessary for daily operation
- A clear mechanism for identifying critical failures through alerts or another suitable process

The specific monitoring or logging stack and alert thresholds are not defined yet and will be decided during the architecture phase.

### Maintainability

V1 must meet at least the following maintainability requirements:

- Critical business rules for checkout, payments, orders, inventory, shipping, tax, and refunds are documented
- Core acceptance scenarios can be repeated and verified after changes
- Clear instructions exist for basic admin operations and recovery procedures
- Client-specific configuration is clearly separated from the reusable foundation
- Important assumptions and dependencies are documented
- The system does not depend on undocumented knowledge that requires ongoing reliance on the original developer

### Browser and mobile support

V1 must support:

- A responsive mobile web experience without requiring a native mobile app
- Current stable versions of the major desktop browsers
- Current stable versions of the major mobile browsers
- Completion of the core customer flows on desktop and mobile: browsing, search, product detail, cart, guest checkout, and payment
- Basic verification of the core flows in representative desktop and mobile environments

The exact browser versions and device test matrix may be defined later during the implementation and testing phase.

### V1 production-readiness sign-off criterion

The Retail Starter V1 is production-ready only when:

- All confirmed acceptance criteria pass
- Confirmed non-functional requirements pass to the extent they can be verified before launch
- No unresolved critical failures remain in payment, order, inventory, refund, notification, security, or recovery flows
- At least one verified backup restore test has been completed
- Remaining TBD items, such as numeric performance targets, RPO and RTO, and the browser or device matrix, do not block sign-off unless a specific business, technical, or operational need arises

Sign-off is based on demonstrated behavior and verification, not only on the existence of implementation or documentation.

## Not in scope

- Complex ERP/POS workflows and integrations
- Subscriptions
- B2B/wholesale businesses and pricing
- Restaurant-specific functionality
- Marketplaces
- Complex promotions
- Customer accounts, login, password management, and order history
- Live carrier rates
- Courier API integrations
- Automatic label generation
- Shipment tracking integrations
- Fulfillment provider integrations
- Complex shipping rules based on weight, dimensions, or multiple warehouses
- Multiple payment providers
- PayPal
- Klarna or other buy-now-pay-later methods
- Bank integrations
- Installments
- Marketplace or split payments
- Tax advice
- VAT or tax filing
- Tax registration services
- Advanced multi-jurisdiction tax automation
- Automatic legal or tax assessment of products or purchases
- More complex tax requirements
- Customer self-service returns
- Automated return approval
- RMA workflows
- Exchanges
- Automatic refunds
- Courier or return-label integrations
- Marketing emails
- Abandoned-cart emails
- Newsletters
- SMS or push notifications
- Automated marketing campaigns
- Loyalty or promotional messaging
- Low-stock alerts
- Backorders
- Manual or custom stock reservations for special cases
- Purchase orders
- Multiple warehouses
- Advanced inventory workflows
- ERP/POS inventory synchronization
- Granular permissions per function
- Separate roles such as manager, warehouse staff, or support
- Custom RBAC system
- Permissions per store section or resource
- Faceted search
- Advanced filtering
- Typo tolerance
- Autocomplete
- Custom search ranking
- AI or semantic search
- External search services
- Sales dashboards
- KPI reports
- Revenue analytics
- Custom reports
- Scheduled reports
- Advanced exports
- Business intelligence functionality

## TBD

- None
