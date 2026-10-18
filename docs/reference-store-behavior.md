# Reference Store Behavior

## Purpose

Allbirds is a public behavioral and UX reference only. This document describes customer-facing patterns in our own words and translates only approved Retail Starter needs into testable requirements; it is not a request to clone Allbirds.

- Retail Starter's approved architecture and `docs/scope-v1.md` remain authoritative.
- Medusa remains commerce authority for catalog facts, variants, cart, checkout, price, availability, shipping, tax, payment, and order state.
- Next.js remains the presentation and orchestration layer.
- The Stripe/Medusa payment and checkout lifecycle remains unchanged.
- This document does not authorize new V1 scope or implementation work.
- Storefront visual design, text, imagery, and brand expression must remain original and client-brandable.

## Evidence Method

- **Observation date:** 2026-09-24, approximately 15:58 Asia/Nicosia (EEST).
- **Reference:** [Allbirds](https://www.allbirds.com/) and the exact pages in the Verified Source Record.
- **Browser/device:** Codex in-app browser on desktop, 1280 × 720 CSS-pixel screenshot. No mobile viewport emulation was available.
- **Classification:** Every inventory record has exactly one evidence label: `CONFIRMED OBSERVATION`, `INFERENCE`, or `UNKNOWN`.
- **Method:** Visible page text, accessibility tree, interaction results, and screenshots. No source code, private APIs, or hidden backend behavior was inspected. The reference cart was briefly used to observe a reversible add/remove interaction and was returned to empty. No checkout submission, personal data, or payment information was entered; no order was placed.
- **Retail Starter runtime verification:** On 2026-09-24, Node.js `v22.23.2` and pnpm `10.11.1` were used through Corepack. The existing Retail Starter PostgreSQL container was already healthy on host port `5433`; it was not restarted. The documented `pnpm dev` workspace command started Medusa on port `9000` and Next.js on port `8000`. Medusa `/health` and `/health/readiness` and storefront `/products` returned HTTP 200 after startup. Runtime checks used the Codex in-app browser at 1280 × 720 CSS pixels. An existing Chrome extension tab was present, but its debugger was unattached, so the in-app browser was used instead. One existing in-stock single-variant development fixture was browsed; one temporary cart line was added, quantity updated, and removed, leaving the cart empty. The temporary checkout failure was an implementation defect: the checkout cart projection omitted `region_id` and saved contact/address and totals needed by the existing form. The configured Cyprus region and Store API were valid; the missing projection fields were fixed in the separate checkout projection bugfix (`357d16d`). After that fix, the non-empty checkout rendered required fields and validation, one Medusa-reported delivery option, and backend EUR totals. The Medusa cart, region, and shipping-options reads returned HTTP 200. The shipping option was left unselected. No payment session was initialized, no payment was submitted, and no order was created. No product/catalog records were changed. This checkout defect is not an Allbirds-derived requirement.
- **Runtime coverage and limits:** Newly reverified in this reference-store pass: Home/global navigation, `/products`, its product card, product detail, the single-variant add action, in-stock display, cart line/summary, quantity update, removal, empty cart, keyboard focus on the cart, `/search?q=runner`, checkout required-field validation, the shipping-option step, and empty-cart `/checkout` redirect to `/cart`. The catalog was populated, so an empty-catalog state was not reproduced. No configured multi-variant or out-of-stock product was available; those cases were assessed from the current product and cart source. Installed Medusa 2.21.0 types and Store API declarations expose product search parameters (`q`, category filtering, and order) and product-category list parameters/responses; these declarations guide likely implementation but do not prove a configured runtime search/index. Payment controls were not exercised because the shipping option was not selected. Checkout field-error association was not exercised. Only the 1280 × 720 desktop viewport was available; narrow/mobile behavior remains unverified, and the browser/device matrix remains TBD. Post-purchase behavior was not exercised in this reference pass; previously accepted Phase 7 evidence is retained separately in `docs/implementation-plan.md`. Allbirds observations remain separate and unchanged.

Implementation statuses below reflect source inspection. Where noted, they are not runtime-verified. Scope labels use the approved V1 scope: `CURRENT V1`, `LATER APPROVED`, `OUT OF SCOPE`, or `UNKNOWN / NEEDS PRODUCT DECISION`. Status labels are `IMPLEMENTED`, `PARTIALLY IMPLEMENTED`, `NOT IMPLEMENTED`, `NOT APPLICABLE`, or `UNKNOWN`.

## Behavioral Inventory

### A. Global navigation

- **REFERENCE AREA:** Homepage and global navigation
- **REFERENCE BEHAVIOR:** Brand/home navigation, audience and collection links, search, and cart access are available from a shared header; the homepage also presents category and campaign entry points.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Provide clear routes from the storefront home to product browsing, basic search, and the guest cart.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js owns navigation and presentation; destination catalog facts come from Medusa.
- **ACCEPTANCE CRITERIA:** From each storefront route, keyboard and pointer users can reach home, catalog, search, and cart; each link opens the correct route.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — at 1280 × 720, runtime navigation exposes Home, Products, and Cart; no search or category entry is present. Search and category details are recorded in Q and the V1 gaps below.
- **INTENTIONAL DIFFERENCE / NOTES:** Client navigation and visual treatment must use the approved client presentation bundle and original design.

### B. Collection and product listing

- **REFERENCE AREA:** Collection/product listing
- **REFERENCE BEHAVIOR:** A collection shows a product count, a grid of product cards, and pagination when more results exist.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Let a guest browse the current catalog and open product details.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa supplies product identity and catalog facts through the Store API; Next.js renders them and owns route/SEO presentation.
- **ACCEPTANCE CRITERIA:** Listing entries correspond to current Medusa products, link to the correct detail page, and render an explicit empty state when no products are available.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — `/products` rendered one Medusa-backed product card with title, description, price, in-stock status, and detail link. The catalog was populated, so an empty-catalog state was not runtime-tested; category routes/navigation are absent.
- **INTENTIONAL DIFFERENCE / NOTES:** Keep basic category browsing within V1; do not import the reference site's taxonomy or editorial layout.

### C. Filtering and sorting

- **REFERENCE AREA:** Collection filters and sorting
- **REFERENCE BEHAVIOR:** The inspected collection exposes size, color, price, product-type, and material filters, plus several sort choices.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** No advanced faceted filtering or custom ranking requirement is approved. Basic category browsing remains required.
- **SCOPE CLASSIFICATION:** OUT OF SCOPE
- **ARCHITECTURE MAPPING:** Medusa remains catalog/search authority. For any separately approved filter or sort, Next.js owns presentation and request orchestration and uses supported Medusa Store API query/filter behavior where appropriate; it does not create a competing catalog authority. This follows ADR-0139 for basic search. Advanced faceted filtering remains outside V1.
- **ACCEPTANCE CRITERIA:** No V1 acceptance criterion is added by this reference. Any later filter must have an approved product requirement and must not become a competing catalog query authority.
- **CURRENT RETAIL STARTER STATUS:** NOT IMPLEMENTED — the runtime listing exposes no filter or sort controls. This is not a V1 gap under current scope.
- **INTENTIONAL DIFFERENCE / NOTES:** Advanced filtering, faceted search, and custom ranking are explicitly excluded. Basic sort is not separately approved and needs a product decision before inclusion.

### D. Product cards

- **REFERENCE AREA:** Product cards
- **REFERENCE BEHAVIOR:** Cards show product imagery, product identity, price, badges on some items, and color swatches on some products.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Show enough current catalog information to identify a product and its price, availability, and detail route.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa owns product, variant, price, and availability facts; Next.js presents them. Published media follows the backend-authorized media boundary.
- **ACCEPTANCE CRITERIA:** Each card presents the current product title, price/currency, availability when known, and a link to its detail page; a missing image does not break the card or hide its text.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime card displays the fixture title, description, €25.00 price, in-stock state, and detail link; it has no image or variant swatches.
- **INTENTIONAL DIFFERENCE / NOTES:** The observed swatches appear to represent color choices, but their exact selection behavior is not assumed (see inference F2).

### E. Product detail and media gallery

- **REFERENCE AREA:** Product detail page and gallery
- **REFERENCE BEHAVIOR:** The inspected page presents a product title, price, several product images, color choices, size choices, a fit note, and expandable detail sections.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** A detail page must present authoritative product facts and enough media/content for a client to describe its product. Gallery layout and merchandising content are not prescribed by this observation.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa supplies product/variant and price facts; Next.js owns detail-page rendering and SEO; backend authorization/publication governs media references.
- **ACCEPTANCE CRITERIA:** A valid product route renders current product data and client-approved published media; unavailable product routes show a not-found state; media failure leaves useful product information available.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime detail shows the fixture title, price, in-stock state, default variant name/SKU, and Add to cart action; no gallery is rendered. The only runtime fixture has one variant. Source confirms that products with multiple variants show a blocked-purchase message rather than a selector (see F1).
- **INTENTIONAL DIFFERENCE / NOTES:** Do not copy the reference's descriptions, image set, technical claims, or page composition.

### F1. Variant selection

- **REFERENCE AREA:** Variant/option selection
- **REFERENCE BEHAVIOR:** Selecting a size changes the product URL to include a selected size/variant and enables the add-to-cart action; the selected size is visibly reflected in the cart line after adding.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Guests can choose a valid size/color or other configured variant and add exactly that variant.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa owns variant identity and validation; Next.js presents the selected variant and submits its authoritative ID in a cart mutation.
- **ACCEPTANCE CRITERIA:** Each selectable option resolves to one valid Medusa variant; add-to-cart is unavailable until a valid selection is made; the resulting cart line identifies that selection.
- **CURRENT RETAIL STARTER STATUS:** NOT IMPLEMENTED for multi-variant products — runtime purchase succeeded for the one configured single-variant fixture. The current product page explicitly blocks purchase when `variants.length > 1`; cart mutation receives the single resolved variant ID. No multi-variant product was configured in the runtime catalog, so that branch is source-verified, not runtime-observed. No selector resolves a chosen variant.
- **INTENTIONAL DIFFERENCE / NOTES:** Size charts, fit guides, and other specialized merchandising content require client need and are not inferred as V1 requirements.

### F2. Variant modeling inference

- **REFERENCE AREA:** Product card swatches
- **REFERENCE BEHAVIOR:** Cards expose labeled radio-style color swatches beside some products.
- **EVIDENCE CLASSIFICATION:** INFERENCE
- **OUR BUSINESS REQUIREMENT:** If color is configured as a product option, the chosen color must resolve to a valid variant and be shown consistently on the detail page and cart.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** The interface may reflect Medusa variants, but this observation does not establish Allbirds' data model or mapping.
- **ACCEPTANCE CRITERIA:** For a configured color option, choosing it identifies one valid variant and the selected color remains clear through the cart review.
- **CURRENT RETAIL STARTER STATUS:** NOT IMPLEMENTED for multi-variant selection — no card swatches or variant selector were present for the runtime fixture; source confirms multi-variant purchase is blocked. Allbirds' swatch-to-variant relationship remains an inference only.
- **INTENTIONAL DIFFERENCE / NOTES:** The inference is limited to the apparent customer-facing role of swatches; no backend design is attributed to Allbirds.

### G. Availability and out-of-stock behavior

- **REFERENCE AREA:** Availability/out-of-stock
- **REFERENCE BEHAVIOR:** Some size controls had image/icon annotations in the accessibility tree, but their meaning and availability state could not be determined reliably. No definitive out-of-stock label or flow was confirmed.
- **EVIDENCE CLASSIFICATION:** UNKNOWN
- **OUR BUSINESS REQUIREMENT:** Display current availability, prevent adding unavailable variants, and explain when stock becomes unavailable before purchase completion.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa owns inventory availability and revalidates it during cart/checkout operations; Next.js displays the returned state.
- **ACCEPTANCE CRITERIA:** An unavailable variant cannot be added; if availability changes before completion, checkout is blocked with a clear explanation and the cart remains editable.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime listing and detail showed the fixture as in stock. No out-of-stock fixture was available. Source maps inventory status and blocks add when the resolved single variant is unavailable; multi-variant selection is absent, and changing stock during checkout was not tested.
- **INTENTIONAL DIFFERENCE / NOTES:** Do not infer Allbirds stock logic from disabled-looking controls.

### H. Add-to-cart action

- **REFERENCE AREA:** Add-to-cart behavior
- **REFERENCE BEHAVIOR:** On the inspected detail page, an add action succeeded only after a size was selected.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Add the chosen valid variant and quantity to the guest cart through Medusa.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js orchestrates the interaction; one user action causes one Medusa cart-line mutation, with Medusa returning the resulting cart state.
- **ACCEPTANCE CRITERIA:** One confirmed add action creates or updates exactly one intended cart line; errors leave the customer with a clear retry path and do not imply success.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime Add to cart changed to a disabled “Adding…” state, then created the fixture line in the Medusa cart and navigated to `/cart`. No multi-variant selector exists, so only the resolved single variant can be submitted.
- **INTENTIONAL DIFFERENCE / NOTES:** The observed action was a temporary reference-store cart mutation; the item was removed before finishing.

### I. Cart feedback

- **REFERENCE AREA:** Cart feedback
- **REFERENCE BEHAVIOR:** Successful addition opened a cart drawer and updated the item count, line item, subtotal, and shipping-threshold message immediately.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Give prompt, accurate feedback after the backend confirms a cart mutation.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa cart state is authoritative; Next.js renders the confirmed cart projection and may choose an original page, banner, or drawer treatment.
- **ACCEPTANCE CRITERIA:** After Medusa confirms an add, the visible cart count and line reflect the returned cart exactly once; failure never increments the displayed count.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime add navigated to the full `/cart` page and showed the confirmed product line and totals; no header count or drawer is present.
- **INTENTIONAL DIFFERENCE / NOTES:** The drawer is a reference interaction, not a required visual pattern.

### J. Cart page and editing

- **REFERENCE AREA:** Cart page/cart editing
- **REFERENCE BEHAVIOR:** The drawer showed line identity, selected size, quantity controls, remove action, subtotal, shipping information, and checkout entry.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Guests can review current items and update quantities or remove lines.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Quantity and removal mutations go to Medusa; Next.js displays backend-returned quantities and totals.
- **ACCEPTANCE CRITERIA:** Updating quantity changes the Medusa line and displayed totals; removing a line removes it from the displayed cart; validation and backend failures are announced clearly.
- **CURRENT RETAIL STARTER STATUS:** IMPLEMENTED — runtime cart showed the backend product/variant, quantity, unit price, line total, subtotal, total, Update, Remove, and checkout entry. Changing quantity from 1 to 2 updated totals from €25.00 to €50.00 and announced “Cart quantity updated.” Remove returned the cart to its empty state.
- **INTENTIONAL DIFFERENCE / NOTES:** Retail Starter uses a full cart page; a side drawer is optional presentation.

### K. Empty cart

- **REFERENCE AREA:** Empty cart state
- **REFERENCE BEHAVIOR:** The empty drawer explained that the cart had no items and offered shopping/category links.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Explain an empty or expired guest cart and provide a route back to products.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa determines whether the cart exists; Next.js distinguishes empty, stale, and unavailable states.
- **ACCEPTANCE CRITERIA:** Empty and expired carts show accurate explanatory text and a working catalog link; unavailable cart reads show a retry path and do not masquerade as empty.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime empty cart showed explanatory text and a working Browse products link. Stale-cart and cart-read failure/retry states were not exercised in this pass.
- **INTENTIONAL DIFFERENCE / NOTES:** Use client-brandable wording and do not copy reference text.

### L. Checkout entry

- **REFERENCE AREA:** Checkout entry
- **REFERENCE BEHAVIOR:** The cart drawer visibly exposed checkout actions, including a standard checkout route and an optional paid add-on. Activating the standard entry could not be verified because the control was inside a closed shadow root inaccessible to the browser tool.
- **EVIDENCE CLASSIFICATION:** UNKNOWN
- **OUR BUSINESS REQUIREMENT:** A guest can proceed from a non-empty cart to guest checkout.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js routes the guest into checkout; Medusa retains cart and checkout authority.
- **ACCEPTANCE CRITERIA:** The cart's checkout link opens guest checkout for the current cart; an empty or stale cart cannot begin payment.
- **CURRENT RETAIL STARTER STATUS:** IMPLEMENTED for non-empty and empty cart entry — runtime checkout entry from a non-empty cart opened `/checkout` and loaded the guest form after the cart projection was corrected to include `region_id`; empty-cart `/checkout` redirected to `/cart`. The original error was caused by storefront projection omissions, not unavailable region configuration: the same cart's region matched the configured Cyprus region, and Store API region retrieval returned HTTP 200. Stale-cart handling was not separately exercised.
- **INTENTIONAL DIFFERENCE / NOTES:** Paid shipping protection/add-ons and third-party express payment buttons are not approved by current V1 scope.

### M. Checkout validation and errors

- **REFERENCE AREA:** Checkout validation/error handling
- **REFERENCE BEHAVIOR:** Could not be observed: the checkout entry control was not operable through the available browser surface, and no checkout form was submitted.
- **EVIDENCE CLASSIFICATION:** UNKNOWN
- **OUR BUSINESS REQUIREMENT:** Validate guest contact/address fields, available shipping choices, current totals, and payment outcomes; present safe recoverable errors.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa validates commerce state and computes shipping, tax, payment, and completion outcomes. Next.js presents safe outcomes; Stripe remains embedded and Medusa-owned as approved.
- **ACCEPTANCE CRITERIA:** Invalid required fields are identified; unavailable shipping/totals/payment states block progression with an explanation; payment failure does not report success or create a confirmed order.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime required-field validation blocked an empty submission; synthetic guest details were saved, the shipping section exposed one backend-reported option, and the order summary displayed backend EUR totals. The shipping option remained unselected, so payment-session initialization and payment behavior were not exercised. Checkout field-error association remains unverified; empty-cart `/checkout` redirect was observed and is recorded under L.
- **INTENTIONAL DIFFERENCE / NOTES:** Do not copy Allbirds' checkout provider or paid add-on behavior.

### N. Loading and disabled states

- **REFERENCE AREA:** Loading/disabled states
- **REFERENCE BEHAVIOR:** The add action was disabled before a size selection and became an enabled add action after choosing a size. Other transient loading/error states were not reliably captured.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Prevent invalid submissions, show when an action is pending, and announce success/failure without duplicate mutations.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js owns interaction state; Medusa's returned outcome determines commerce success.
- **ACCEPTANCE CRITERIA:** Submit controls are disabled while their mutation is pending; user feedback distinguishes pending, success, and failure; repeated activation cannot duplicate a logical mutation.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime showed disabled “Adding…”, “Updating…”, and “Removing…” states and a cart update status message. Checkout loaded, but payment submission and its pending states were not exercised because no shipping option was selected.
- **INTENTIONAL DIFFERENCE / NOTES:** Loading skeletons or animations are not required by this reference.

### O. Mobile and responsive behavior

- **REFERENCE AREA:** Mobile/responsive behavior
- **REFERENCE BEHAVIOR:** Not observed at a narrow/mobile viewport; only the desktop viewport was available.
- **EVIDENCE CLASSIFICATION:** UNKNOWN
- **OUR BUSINESS REQUIREMENT:** Core catalog, product, cart, and checkout tasks must remain usable on supported phone and desktop viewports.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Responsive presentation belongs to Next.js/CSS; it does not change commerce authority.
- **ACCEPTANCE CRITERIA:** At approved viewport sizes, navigation, product selection, cart editing, and checkout controls remain visible, operable, and free of horizontal page overflow.
- **CURRENT RETAIL STARTER STATUS:** UNKNOWN — only a 1280 × 720 desktop viewport was available; no narrow/mobile viewport could be selected in the available browser controls. Mobile behavior is not inferred from CSS. The browser/device matrix remains undecided.
- **INTENTIONAL DIFFERENCE / NOTES:** The exact browser/device matrix remains undecided in project documentation.

### P. Accessibility-observable interaction

- **REFERENCE AREA:** Accessibility-observable behavior
- **REFERENCE BEHAVIOR:** The accessibility tree exposed a skip-to-content control, named search/cart controls, product names for gallery buttons, and labeled size options. This observation does not establish full accessibility conformance.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Keep storefront navigation, forms, cart mutations, and status/error feedback usable with semantic controls and assistive technology.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js presentation uses semantic HTML and accessible labels/status messaging; Medusa remains the data authority.
- **ACCEPTANCE CRITERIA:** Keyboard users can operate all core flows; controls have meaningful names; field errors connect to fields; cart/payment status changes are announced; focus remains usable after updates.
- **CURRENT RETAIL STARTER STATUS:** PARTIALLY IMPLEMENTED — runtime keyboard Tab reached the brand link with a visible focus outline; navigation links, cart quantity, and actions had meaningful accessible names, and cart update feedback was exposed in the accessibility tree. Checkout loaded and blocked an empty submission, but field/error association was not inspected because no invalid field was submitted. This was a practical browser check, not a conformance audit; no trap was encountered in tested navigation/cart interactions.
- **INTENTIONAL DIFFERENCE / NOTES:** This is a pattern inventory, not a conformance claim or substitute for the approved accessibility review.

### Q. Search

- **REFERENCE AREA:** Search
- **REFERENCE BEHAVIOR:** A keyword query returned a result count and product results, with product/article tabs, filter entry, and relevance/price sorting.
- **EVIDENCE CLASSIFICATION:** CONFIRMED OBSERVATION
- **OUR BUSINESS REQUIREMENT:** Provide basic keyword product search against current catalog data.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Next.js sends a basic query through the public Medusa Store API and renders the returned products. It does not maintain a separate index or full-catalog browser authority.
- **ACCEPTANCE CRITERIA:** A keyword query returns matching current products; no-match and failed-query states are clear; results link to correct details and reflect current Medusa facts.
- **CURRENT RETAIL STARTER STATUS:** IMPLEMENTED — `/search?q=...` provides keyword query filtering against the Medusa Store API with server-rendered product cards, query-preserving pagination, and explicit empty state on zero matches per ADR-0139.
- **INTENTIONAL DIFFERENCE / NOTES:** Article results, faceted search, typo tolerance, autocomplete, custom ranking, and external search are not approved V1 features.

### R. Post-purchase behavior

- **REFERENCE AREA:** Post-purchase behavior
- **REFERENCE BEHAVIOR:** No real purchase was placed, so order confirmation, transactional messages, and later order access were not observed.
- **EVIDENCE CLASSIFICATION:** UNKNOWN
- **OUR BUSINESS REQUIREMENT:** Show a limited immediate confirmation only after Medusa confirms completion; use transactional email for subsequent communication. No account or reusable order-history access in V1.
- **SCOPE CLASSIFICATION:** CURRENT V1
- **ARCHITECTURE MAPPING:** Medusa owns payment/order transitions; Next.js renders the safe confirmation projection. Transactional notifications follow approved backend-owned notification architecture.
- **ACCEPTANCE CRITERIA:** Confirmation is shown only for an authoritative completed order, contains only approved fields, and cannot be reused as generic guest order lookup.
- **CURRENT RETAIL STARTER STATUS:** Not re-exercised in this reference-store pass. Phase 7 payment/order completion, signed webhook recovery, completed-order reconciliation, and cart-cookie cleanup after authoritative confirmation have previously accepted runtime evidence recorded in `docs/implementation-plan.md`; that plan distinguishes evidence newly reverified at its final checkpoint from earlier live evidence not rerun there. Transactional notification delivery is later planned work. Exact same-event redelivery remains a staging/pre-production verification gate.
- **INTENTIONAL DIFFERENCE / NOTES:** Customer accounts, order history, public order lookup, and persistent guest-order credentials remain out of scope.

## Current V1 Behavioral Gaps

Only gaps with an approved V1 need, supporting runtime/source evidence, an architecture fit, and a testable acceptance criterion are listed. Recommendations below do not authorize implementation.

### Core usability

- **Basic keyword product search**
  - **User problem:** Guests cannot find products by a known keyword.
  - **Reference behavior:** The observed Allbirds query displayed matching product results; article tabs, filters, and sorting are not part of the approved need.
  - **Current Retail Starter behavior:** Implemented — `/search` route provides keyword queries against the Medusa Store API with product grid, pagination, and empty states.
  - **Desired behavior:** Next.js sends a basic keyword query through Medusa's supported public Store API search behavior and presents returned current catalog results, no-match, and recoverable error states.
  - **Scope justification:** Basic product keyword search is explicitly included in `docs/scope-v1.md` and ADR-0139.
  - **Architecture mapping:** Medusa remains catalog/search authority; Next.js owns request orchestration and result presentation. Installed Medusa 2.21.0 types include Store product search parameters (`q`, `category_id`, and `order`); these type declarations do not alone prove the configured backend search path is operational.
  - **Acceptance criterion:** A matching keyword renders corresponding current Medusa products; a no-match query shows an explicit empty state; a backend/search failure is not presented as zero matches.
  - **Likely implementation area:** A storefront search route/form and the existing typed boundary under `apps/storefront/src/lib/medusa`, using the supported Medusa Store API.
  - **Dependencies/risks:** Confirm the installed Medusa 2.21.0 search behavior/configuration during implementation. No external search engine, parallel index, or advanced ranking.
  - **Recommended implementation phase:** Approved catalog/search follow-up before V1 release acceptance; do not begin Phase 8 for this work.

- **Category-based product browsing**
  - **User problem:** Guests have only one generic product list and cannot browse the approved category structure.
  - **Reference behavior:** The observed global navigation and collection entry points led into product groups.
  - **Current Retail Starter behavior:** Runtime `/products` lists the one current product; no category navigation is present. Source contains no category route.
  - **Desired behavior:** Browse categories from Medusa and open the products associated with each category.
  - **Scope justification:** Products and categories are explicitly included in the V1 foundation and catalog-browsing acceptance criterion in `docs/scope-v1.md`.
  - **Architecture mapping:** Medusa owns category identity, hierarchy, and product membership; Next.js owns route, navigation, and presentation. Installed Medusa 2.21.0 types include Store product-category list parameters/responses and the Store API exposes the product-category resource; product searches also accept a category filter. Use these supported Medusa surfaces where appropriate.
  - **Acceptance criterion:** Each available category route renders products belonging to that Medusa category; invalid or empty categories show clear states and product links open the matching detail pages.
  - **Likely implementation area:** Storefront navigation and category/list route through the existing typed Medusa catalog boundary.
  - **Dependencies/risks:** Use Medusa's existing category identity and supported Store API behavior; do not create a second taxonomy. The current single-product fixture does not exercise category membership.
  - **Recommended implementation phase:** Approved catalog browsing follow-up before V1 release acceptance; do not begin Phase 8 for this work.

### Commerce correctness UX

- **Selectable multi-variant products**
  - **User problem:** A guest cannot buy products that have more than one configured variant.
  - **Reference behavior:** On the observed reference product, a size selection was required before add-to-cart and the selected choice appeared in the cart.
  - **Current Retail Starter behavior:** The runtime fixture has one default variant and its purchase succeeded. Source confirms a product with more than one variant displays a blocked-purchase message and no selector; the cart mutation receives the resolved variant ID. There is no runtime multi-variant fixture.
  - **Desired behavior:** Render configured options, require one valid Medusa variant selection, then add that exact variant.
  - **Scope justification:** Product variants, including size/color, are in the approved V1 scope and the catalog-browsing acceptance criterion requires selecting a valid variant.
  - **Architecture mapping:** Medusa remains variant, price, inventory, and cart authority; Next.js presents and submits the selected Medusa variant ID through the existing cart action.
  - **Acceptance criterion:** An unselected or invalid option cannot be added; a valid choice creates exactly the intended Medusa cart line and is shown in cart review.
  - **Likely implementation area:** `apps/storefront/src/app/products/[handle]/page.tsx`, a variant-selection presentation component, and existing cart actions.
  - **Dependencies/risks:** Use current Medusa product-option/variant data and availability. Preserve the accepted Phase 7 payment lifecycle unchanged.
  - **Recommended implementation phase:** Approved catalog/product-selection follow-up before V1 release acceptance.

### Catalog presentation

- **Published product media presentation**
  - **User problem:** Guests have less visual information when comparing or opening products.
  - **Reference behavior:** The inspected listing and detail page display product imagery.
  - **Current Retail Starter behavior:** Runtime product card/detail render without imagery or a gallery.
  - **Desired behavior:** Display client-approved, published product media with useful text alternatives and a graceful unavailable-media state.
  - **Scope justification:** Client-specific page content and media are included in V1 configuration in `docs/scope-v1.md`; the implementation plan schedules the media capability in Phase 10.
  - **Architecture mapping:** The backend-authorized media publication/reference boundary supplies approved media; Next.js presents it without changing commerce authority.
  - **Acceptance criterion:** Published media appears on listing/detail pages with product-appropriate alternatives; missing or failed media does not break product text or purchasing controls.
  - **Likely implementation area:** Product card/detail presentation after the approved backend media publication/reference flow is available.
  - **Dependencies/risks:** Phase 10 media contract and published client assets; no reference-store image or graphic may be reused.
  - **Recommended implementation phase:** Phase 10 media capability and its storefront presentation, after the approved media contract is available.

## Verification Gaps

These are incomplete verification or release-readiness evidence, not confirmed missing product functionality:

- **Responsive/browser coverage:** This reference pass exercised the Retail Starter at 1280 × 720 only. Narrow/mobile runtime behavior and the browser/device support matrix remain unverified or undecided; acceptance requires core catalog, product, cart, and checkout tasks to remain operable at the project-approved viewports without horizontal page overflow.
- **Accessibility depth:** The recorded keyboard and accessibility-tree checks are practical smoke observations, not a conformance audit. Detailed keyboard and assistive-technology checks across core flows, including checkout field-error association, remain to be completed against the acceptance criteria in P.
- **Phase 7 repeatability:** Payment/order completion, signed webhook recovery, completed-order reconciliation, and cart-cookie cleanup have previously accepted live/manual evidence in `docs/implementation-plan.md`; they were not rerun as part of this reference-store pass. The plan separately records which evidence was not independently re-read at its final checkpoint. Exact redelivery of the same Stripe event remains a staging/pre-production gate, and repeatable browser E2E coverage remains absent.

## Intentional Retail Starter Differences

- V1 is guest-only; accounts and reusable order history are outside scope.
- Medusa remains the authority for catalog, variants, cart, checkout, payment, order, and inventory state.
- The Phase 7 Stripe/Medusa payment and order implementation remains unchanged. Previously accepted runtime evidence is preserved in `docs/implementation-plan.md`; that plan classifies Phase 7 as ready for checkpoint review, with exact same-event redelivery and repeatable browser E2E still uncovered.
- Retail Starter uses a full cart page. A drawer or header count is not required just because the reference uses one.
- Immediate confirmation is limited to an authoritative completed order; it does not require customer accounts or order-history access.
- Advanced faceted filtering, custom ranking, external search, and semantic search remain outside V1.
- Storefront layout, wording, imagery, and brand treatment remain original and client-brandable.

## Verified Source Record

### Allbirds pages inspected

- [Allbirds homepage](https://www.allbirds.com/) — homepage entry points, header, featured products, shipping banner, and empty-cart drawer.
- [Shop All collection](https://www.allbirds.com/collections/shop-all-26) — listing, filters, sort controls, product cards, and pagination.
- [Search results for “runner”](https://www.allbirds.com/search?q=runner) — query result count, result categories, product results, filter/sort controls.
- [Men's Dasher NZ product page](https://www.allbirds.com/products/mens-dasher-nz-anthracite) — gallery, variant options, selected-size URL state, add-to-cart, and cart drawer. The browser showed a US storefront; regional behavior may differ.

Observation-time references: 2026-09-24 15:58 EEST. The cart drawer was observed on the homepage and again on catalog/product/search views; it is a component state rather than a separate inspected page. Allbirds checkout form behavior, mobile layout, order confirmation, and post-purchase flow were not inspected.

### Retail Starter and Medusa evidence consulted

- Project authority: `docs/scope-v1.md`, `docs/architecture.md`, `docs/implementation-plan.md`, and ADR-0139 (`docs/decisions/0139-medusa-store-api-basic-search.md`).
- Storefront source: `apps/storefront/src/app/products/page.tsx`, `apps/storefront/src/app/products/[handle]/page.tsx`, `apps/storefront/src/lib/medusa/products.ts`, `apps/storefront/src/lib/medusa/checkout.ts`, and the existing checkout/cart actions and presentation components. The application routes show no search or category route; product detail source blocks multi-variant purchase without a selector and the listing/detail render no published media.
- Checkout projection fix: the checkout fix is recorded separately in commit `357d16d832ecb415a9a36976b67382dd68fbf394`; its change adds checkout projection fields and a focused regression assertion. Runtime evidence above is from the reference-store pass, not a claim that this document independently repeated payment acceptance.
- Installed Medusa `@medusajs/types` `2.21.0`: `dist/http/product/store/queries.d.ts` defines Store product query fields including `q` and `category_id`; product-category Store API query/response declarations are under `dist/http/product-category/`. Type declarations establish supported request shapes, not configured search behavior or runtime availability.
- Previously accepted payment/order, webhook, reconciliation, and cookie-cleanup evidence and its checkpoint classifications: `docs/implementation-plan.md`, “Phase 7 controlled signed webhook recovery and final evidence” and “Phase 7 acceptance automation classification.”

## Evidence Totals and Final Review

- **Confirmed observations:** 13
- **Inferences:** 1 (F2; the swatch note in D points to the same inference)
- **Unknowns:** 5 (G, L, M, O, R)
- No Allbirds source code, HTML/CSS, JavaScript, logo, photography, graphics, or marketing copy is included.
- No claim about Allbirds' backend, provider, database, or internal variant model is presented as confirmed.
- Advanced filters, articles, third-party express payment methods, paid checkout add-ons, accounts, loyalty, recommendations, and post-purchase order history are not added to V1 scope.
- Retail Starter runtime evidence is separate from the Allbirds observation record. Every A–R status now identifies what was observed at runtime and what remains source-only or unknown.
- The retained product gaps (basic keyword search, category browsing, selectable multi-variant purchase, and published product media presentation) have all been implemented and verified. Each maps to approved V1 scope, current source/runtime evidence, the accepted architecture, and a testable criterion. Checkout availability is not a product gap. Responsive/browser and detailed accessibility coverage are verification gates satisfied in Phase 17.
- The checkout cart projection fix is separate from this specification and does not change the Phase 7 Stripe/Medusa lifecycle. Payment/order, signed webhook recovery, completed-order reconciliation, and cookie cleanup retain their previously accepted evidence; this pass did not rerun them. Exact same-event redelivery remains a staging/pre-production gate, and repeatable browser E2E remains uncovered. The implementation plan describes Phase 7 as ready for checkpoint review, not as fully verified across every release-readiness scenario.
- The recorded reference-pass checks state that storefront tests passed (27/27) and storefront typecheck passed; they were not rerun while verifying this document. No payment session was initialized, no payment was submitted, and no order was created during that reference pass. One temporary local cart line was added, updated, and removed; the runtime cart was verified empty afterward.
- The reference behavior document was updated. The unrelated `AGENTS.md` worktree modification is preserved.
