# ADR-0090: Capability-scoped extension failure behavior

- Status: Accepted refinement of ADR-0073 and ADR-0089
- Date: 2026-09-19

## Context

ADR-0073 requires mandatory readiness checks and safe graceful shutdown. ADR-0089
requires an allow-listed, compatible extension set for each release tuple.
Extension failures can affect only an isolated presentation capability or can
be necessary to preserve a commerce invariant.

## Decision

Use capability-scoped fail-closed behavior for unavailable, missing, invalid,
or incompatible approved extensions.

Before deployment, promotion fails when a required extension incompatibility is
detected. At runtime, the application validates that required extension
identities and versions are present and compatible with the release tuple.

Functionality that depends on an unavailable or incompatible extension must not
serve normal traffic. No commerce operation may proceed partially when the
extension is required for correctness. Unrelated core functionality may remain
available when its own invariants and dependencies remain safe.

Examples:

- a presentation-only extension failure may disable only its affected
  presentation capability;
- a commerce extension required by a specific checkout or operational workflow
  fails that workflow closed; and
- a missing commerce-critical extension is never silently bypassed or replaced
  with incomplete behavior.

If the failed extension is mandatory for the application's core role rather
than an isolated capability, normal application readiness may fail under
ADR-0073.

Do not silently ignore required extensions, continue partial commerce
workflows, take down the entire deployment for every isolated extension
failure, or dynamically substitute an extension outside the approved release
tuple.

## Alternatives considered

### Make the entire application unready for every extension failure

This is conservative, but allows a non-critical presentation failure to cause
an unnecessary full storefront or commerce outage.

### Silently degrade or ignore the extension

This preserves apparent availability but risks incomplete behavior,
presentation inconsistency, and hidden commerce correctness failures.

## Consequences

- Required capabilities fail safely rather than executing incomplete behavior.
- Independent core functionality can remain available when it is safe.
- Release and runtime validation must understand capability dependencies.
- Operators need visibility into which capability caused a failure.

## Not decided by this ADR

This decision does not define the capability dependency model, validation
timing, error or outcome representation, health reporting, operator alerts, or
recovery procedure.
