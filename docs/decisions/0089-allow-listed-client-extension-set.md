# ADR-0089: Allow-listed client extension set

- Status: Accepted refinement of ADR-0087 and ADR-0088
- Date: 2026-09-19

## Context

ADR-0087 requires exceptional client-specific code to be versioned inside the
existing applications. ADR-0088 splits cross-boundary features by application
authority, and ADR-0086 requires a compatible production release tuple.

Allowing executable extensions to drift or load dynamically would undermine
release reproducibility, client isolation, and coordinated recovery.

## Decision

Each client deployment declares an explicit allow-listed set of approved
extension identities and versions as part of its compatible production release
tuple. Where required, the same identities and versions are recorded in the
coordinated recovery manifest.

Extensions are versioned code delivered through the approved release process.
Before serving functionality that depends on an extension, the application
must validate that the required extension is present and compatible. Extension
compatibility is verified during promotion and client-core upgrades.

Configuration may enable behavior within an approved extension, but it cannot
load arbitrary executable code that was not part of the approved release.
Adding, removing, or upgrading an extension produces a new verified compatible
release tuple.

Do not load arbitrary client code dynamically, use a mutable remote plugin
registry as executable authority, ship every known client extension by default,
activate unapproved extensions through undocumented configuration, or allow
extension versions to drift without compatibility verification.

## Alternatives considered

### Dynamic runtime plugin registry

This supports flexible activation, but introduces mutable executable behavior,
another operational dependency, and weaker recovery reproducibility.

### Ship every extension and hide features through configuration

This simplifies packaging, but increases unused code, testing scope, and the
risk of accidental activation.

## Consequences

- The executable extension set is reproducible for each client deployment.
- Extension changes receive the same compatibility and rollback discipline as
  other release-tuple changes.
- Client configuration remains data-only with respect to executable behavior.
- Recovery can identify the extension code required by the restored tuple.

## Not decided by this ADR

This decision does not define the extension identity format, registry or
manifest schema, package structure, validation mechanism, dependency rules, or
compatibility metadata.
