# ADR-0034: Extension-only Medusa customization

- Status: Accepted
- Date: 2026-09-19

## Context

Retail Starter uses Medusa as the single commerce authority while allowing
documented custom behavior for requirements not satisfied by standard Medusa
capabilities. Client deployments also need controlled upgrades of the
versioned Retail Starter core.

Patching or forking Medusa core would create a second maintenance path and
would make upgrades and client propagation difficult.

## Decision

Keep custom commerce behavior inside the Medusa application through supported
extension mechanisms such as:

- modules;
- workflows;
- handlers;
- subscribers;
- provider or service integrations.

Custom extensions are isolated from Medusa core, documented, tested, and
versioned with the Retail Starter core. They are reviewed for compatibility when
Medusa is upgraded.

Do not patch Medusa core files, maintain a Medusa fork for Retail Starter
behavior, move ordinary custom commerce logic into a separate service, or
bypass Medusa's domain authority through parallel implementations.

If a V1 requirement cannot be satisfied cleanly through supported Medusa
extension mechanisms, treat it as an explicit architectural gap to evaluate
rather than immediately modifying Medusa core.

## Alternatives considered

### Patch or fork Medusa core

This could provide direct control, but would create upgrade conflicts,
maintenance divergence, and a separate framework variant.

### Separate custom commerce service

This could isolate custom code, but would introduce another commerce authority
and duplicate orchestration.

## Consequences

- Medusa upgrades remain possible without maintaining a framework fork.
- Extensions require explicit ownership, tests, documentation, and compatibility
  review.
- A capability gap becomes visible as an architecture decision rather than a
  hidden core modification.
- Extension mechanisms constrain how client-specific commerce behavior can be
  introduced.

## Not decided by this ADR

This decision does not select the extension package structure, module
boundaries, workflow names, or compatibility policy.
