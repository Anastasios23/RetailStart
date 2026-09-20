# ADR-0142: Versioned client presentation-content boundary

- Status: Accepted refinement of ADR-0017, ADR-0050, and ADR-0083
- Date: 2026-09-19

## Context

ADR-0017 excludes a V1 CMS and separate content database. ADR-0050 separates
presentation configuration from commerce data, and ADR-0083 versions the client
presentation bundle independently from the client-neutral application artifact.

## Decision

Use the versioned client presentation bundle for non-commerce storefront
content.

The bundle may contain page copy, homepage and static sections, navigation,
branding text, presentation settings, SEO presentation configuration, approved
informational content, and references to media stored in object storage.

Commerce data—including products, variants, prices, inventory,
categories/collections as commerce entities, shipping, tax, orders, and other
operational state—remains in Medusa. Media binaries remain in object storage.

The presentation bundle is validated, separately versioned from the executable
core, compatibility-checked against the target release, included in approved
release/recovery identity, and non-secret.

Do not introduce a V1 headless CMS, separate content database,
presentation-only Medusa entities used as a CMS, or repository-managed
commerce data.

A future requirement for self-service editorial workflows, roles, scheduled
publishing, content history, or frequent non-developer editing requires a
separate explicit CMS architecture decision.

## Alternatives considered

### Headless CMS

This could support editorial self-service, but adds a new platform, data,
credential, publication, and recovery boundary without a V1 requirement.

### Presentation entities in Medusa

This mixes content and commerce models and makes presentation changes depend on
commerce schema and authority.

## Consequences

- Client content changes can be versioned without changing Medusa schema.
- Commerce data and presentation content retain separate authorities.
- Self-service editorial workflows remain explicitly out of V1.

## Not decided by this ADR

This decision does not define bundle format, content schema, storage location,
editorial tooling, publication workflow, or CMS requirements beyond V1 scope.
