# ADR-0136: Explicit backend monetary model

- Status: Accepted refinement of ADR-0069
- Date: 2026-09-19

## Context

ADR-0069 makes Medusa authoritative for monetary values and requires explicit
currency. Payment, refund, order, shipping, tax, discount, and presentation
boundaries must not create competing monetary semantics.

## Decision

Use an explicit backend-owned amount-and-currency model.

For V1:

- Medusa/backend owns authoritative monetary calculations;
- every amount has explicit currency context;
- prices, discounts, shipping, tax, totals, payments, refunds, and adjustments
  use the backend monetary model;
- payment and refund operations reconcile to the relevant order/payment amount
  and currency;
- mixed-currency arithmetic is rejected unless a later explicit conversion
  workflow is approved;
- Next.js formats and displays backend values; and
- currency is never inferred from locale, language, formatting, or browser
  settings.

Locale may affect presentation formatting only. Provider-specific monetary
representations do not become the canonical commerce model.

Do not maintain independent storefront calculations, infer currency from
locale, combine different currencies silently, introduce implicit FX
conversion, or make provider-specific amounts canonical.

## Alternatives considered

### Storefront monetary calculations

This risks divergence in prices, taxes, shipping, discounts, payments, and
refunds.

### Locale-derived currency

This can silently apply the wrong currency and does not establish transaction
authority.

### Implicit currency conversion

This adds exchange-rate and accounting complexity without an approved V1 need.

## Consequences

- Monetary authority and currency provenance remain backend-owned.
- Storefront display can vary by locale without changing numeric authority.
- Medusa and Stripe integration details must be verified without duplicating
  provider-specific models into the commerce domain.

## Not decided by this ADR

This decision does not define numeric representation, precision, rounding,
currency configuration, Stripe conversion fields, or future FX policy.
