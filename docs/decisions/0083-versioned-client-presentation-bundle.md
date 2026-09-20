# ADR-0083: Versioned client presentation bundle

- Status: Accepted
- Date: 2026-09-19

## Context

ADR-0009 keeps ordinary client differences in configuration, data, branding,
content, media references, and explicit extension points. ADR-0017 excludes a
general-purpose CMS from V1. ADR-0050 separates presentation configuration from
runtime secrets and Medusa-owned commerce configuration. ADR-0074 requires
immutable application artifacts, and ADR-0082 requires active recovery
components to be recorded in the recovery manifest.

Client presentation changes therefore need their own traceable release unit
without creating client-specific application builds or an unversioned mutable
runtime platform.

## Decision

Package each client's approved presentation configuration and static content as
a separately versioned client release input. The reusable Retail Starter
application artifact remains client-neutral.

A client bundle may contain validated non-commerce presentation data such as:

- branding;
- theme tokens;
- navigation;
- public SEO settings;
- approved static content;
- stable media references; and
- other approved presentation configuration.

Each bundle must:

- have a clear version or release identity;
- be validated before production promotion;
- declare or otherwise verify compatibility with the targeted Retail Starter
  core release;
- be promoted through the same controlled production process as other client
  changes; and
- remain identifiable for rollback to the previously approved version.

The active client-bundle version must be recorded in the coordinated recovery
manifest defined by ADR-0082.

Secrets remain runtime-only and are not stored in the bundle. Commerce data and
commerce configuration remain owned by Medusa/Admin and are not duplicated in
the presentation bundle.

## Alternatives considered

### Client-specific application artifacts

Embedding presentation data in each client build simplifies runtime loading,
but requires rebuilding the application for ordinary content changes and
weakens reuse and controlled propagation of core fixes.

### Mutable runtime CMS or configuration service

This could support live editing, but introduces a new V1 platform dependency,
runtime drift, and a separate operational and recovery boundary.

## Consequences

- Branding and approved static content can change without rebuilding the
  client-neutral application artifact.
- Presentation releases are traceable, compatibility-checked, and rollbackable.
- Recovery can identify the exact presentation bundle required for a restored
  client deployment.
- Non-technical self-service editing remains outside V1.

## Not decided by this ADR

This decision does not select the bundle format, schema, storage location,
validation tooling, compatibility metadata, promotion workflow, or rollback
mechanism.
