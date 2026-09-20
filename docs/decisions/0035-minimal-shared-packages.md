# ADR-0035: Minimal shared packages without commerce authority

- Status: Accepted
- Date: 2026-09-19

## Context

The repository contains two independently deployable applications, while
Medusa remains the authoritative commerce system. Some stable code can be
shared, but a broad shared commerce package would create a second business
implementation outside the backend.

## Decision

Keep shared packages minimal and limited to genuinely stable, side-effect-free
code.

Shared packages may contain:

- stable cross-application types;
- API contracts where appropriate;
- pure utilities;
- domain primitives;
- validation primitives that do not decide authoritative commerce outcomes;
- generated types where useful.

Shared packages must not own:

- database access;
- payment processing logic;
- inventory state or reservation logic;
- order state transitions;
- refund or fulfillment workflows;
- external-provider side effects;
- API orchestration;
- retry, compensation, or reconciliation authority;
- authoritative commerce business rules that belong in Medusa.

If a rule determines what happens to commerce state, it remains backend-owned
inside Medusa rather than being shared for execution by both applications.

Do not create a broad shared commerce package that becomes a second backend
domain implementation.

## Alternatives considered

### Broad shared commerce package

This could reduce apparent duplication, but would distribute commerce authority
between applications and create synchronization and upgrade risk.

### No shared packages

This would avoid cross-application coupling but would duplicate stable types,
contracts, and pure utilities that can safely be shared.

## Consequences

- Shared code remains portable and easy to reason about.
- Commerce behavior has one execution owner.
- Changes to shared contracts require coordination across both applications,
  while changes to commerce rules remain Medusa-local.
- Package promotion requires evidence that code is stable and side-effect-free.

## Not decided by this ADR

This decision does not select package names, workspace tooling, generated API
types, or the exact domain-primitive contents.
