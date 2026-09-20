# ADR-0027: Medusa-owned client catalog onboarding

- Status: Accepted
- Date: 2026-09-19

## Context

Each client deployment has an isolated Medusa commerce instance. Client-specific
products, variants, prices, categories, inventory, and related commerce data
must be initialized without creating a competing catalog in Next.js or the
repository.

V1 needs normal manual administration and may need controlled bulk onboarding
or migration, but does not require a separate catalog-import platform.

## Decision

Load client-specific catalog and operational commerce data into each client's
isolated Medusa deployment through:

- Medusa Admin for normal manual setup and ongoing management;
- a controlled backend-owned import or setup process for bulk onboarding or
  migration when required.

After loading, Medusa is the authoritative owner of:

- products;
- variants;
- prices;
- categories;
- inventory;
- related commerce data.

Do not keep a competing catalog in Next.js, repository configuration, or static
seed files used as ongoing sources of truth.

Seed or import data may be used for initial setup, but ongoing changes occur
through the Medusa-owned commerce model.

Do not build a separate catalog-import platform in V1.

## Alternatives considered

### Repository or storefront-owned catalog

This could simplify initial rendering, but would duplicate the catalog and
conflict with administrator changes in Medusa.

### Separate catalog-import platform

This could support future integrations and migrations, but would add a new
service and operational boundary before V1 requires it.

## Consequences

- Initial setup and ongoing operations have a clear distinction.
- Medusa remains the single catalog and inventory authority after import.
- Bulk onboarding can be automated later without changing ownership.
- Import processes must be treated as controlled setup or migration tools, not
  permanent parallel data stores.

## Not decided by this ADR

This decision does not select import formats, migration tooling, seed scripts,
validation reports, or automated onboarding workflows.
