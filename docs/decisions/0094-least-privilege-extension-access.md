# ADR-0094: Least-privilege extension access

- Status: Accepted refinement of ADR-0024, ADR-0023, ADR-0034, ADR-0089, and
  ADR-0091
- Date: 2026-09-19

## Context

ADR-0089 requires explicit extension identities and dependencies. ADR-0091
makes backend capability availability authoritative, while earlier decisions
keep secrets, private APIs, database authority, and provider integrations inside
their owning boundaries.

Client extensions need enough access to perform their documented function
without receiving broad host-application privileges.

## Decision

Use least-privilege, authority-scoped access for all client extensions.

Next.js extensions may access only safe public Store API data, approved
storefront capabilities, client-safe presentation configuration, and
browser-safe provider data explicitly permitted by existing decisions.

Medusa extensions may access only the backend capabilities required by their
documented function, through supported modules, workflows, handlers,
subscribers, provider adapters, backend services, and persistence boundaries.

Secrets remain available only inside the backend integration boundary that owns
them. Provider credentials are not exposed broadly to unrelated extensions.
Extensions do not receive unrestricted database, admin, provider, or
customer-data access.

Extension dependencies and required capabilities must be explicitly declared
and validated as part of the approved extension set. Access is proportional to
the extension's responsibility and data need.

New privileged access is an explicit capability/dependency change requiring
review, documentation, testing, and compatibility verification.

Do not give extensions broad host-application access for convenience, allow
Next.js extensions to access private/admin APIs or the commerce database, allow
Medusa extensions to bypass supported domain boundaries through unrestricted
direct database manipulation, expose unnecessary secrets, or create a service
solely for isolation that existing application boundaries can provide.

## Alternatives considered

### Broad host-application access

This is convenient initially, but increases data-exposure risk, makes invariant
bypass easier, and couples extensions to implementation details.

### Separate service for every specialized extension

This can isolate access, but adds deployment, credentials, monitoring, and
reconciliation boundaries without a demonstrated V1 need.

## Consequences

- Extensions receive only the data and capabilities needed for their role.
- Provider secrets and commerce authority remain protected.
- New privileged dependencies become visible release and compatibility
  changes.
- Extension capability declarations and enforcement require deliberate design.

## Not decided by this ADR

This decision does not define capability declarations, permission models,
module access patterns, dependency metadata, validation tooling, or enforcement
mechanisms.
