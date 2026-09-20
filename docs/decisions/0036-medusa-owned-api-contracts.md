# ADR-0036: Medusa-owned API contracts

- Status: Accepted
- Date: 2026-09-19

## Context

Next.js and Medusa communicate through explicit API boundaries, and shared or
generated types may reduce integration drift. Medusa remains the authority for
commerce operations, state transitions, and validation.

A shared package must not become an independent canonical commerce model or
business-rule implementation.

## Decision

Medusa's API contracts are the source of truth for shared and generated types.

For V1:

- Medusa owns the Store API contracts;
- Medusa owns private and admin API contracts;
- shared or generated request and response types may be derived from those
  backend contracts where useful;
- Next.js consumes those contracts rather than independently redefining
  commerce models;
- contract tests verify that the storefront remains compatible with the
  backend API;
- generated or shared types remain descriptive only and do not become a
  separate source of commerce behavior or state-transition rules.

Do not define the canonical commerce API contract independently in a shared
package, maintain duplicate hand-written commerce models when they can be
derived safely, allow generated types to encode or execute business logic, or
treat frontend types as authoritative when backend behavior differs.

When the Medusa contract changes, generated or shared contract artifacts and
compatibility tests are updated from that backend source.

## Alternatives considered

### Shared package as canonical API contract

This could centralize type definitions, but would make the shared package a
second authority that Medusa must separately implement and maintain.

### Independent hand-written contracts in each application

This avoids generation tooling initially, but increases drift and hides
breaking changes until runtime or end-to-end tests.

## Consequences

- API compatibility has a clear source of truth.
- Generated artifacts can improve safety without owning business logic.
- Backend contract changes require coordinated artifact and test updates.
- Contract generation must remain descriptive and reproducible.

## Not decided by this ADR

This decision does not select OpenAPI or schema tooling, code-generation
tooling, API versioning rules, or contract package structure.
