# ADR-0017: Client presentation content boundary

- Status: Accepted
- Date: 2026-09-19

## Context

V1 requires branded storefronts with client-specific page content, copy,
branding, navigation, and media references. It does not require a self-service
content editor or a general-purpose content-management platform.

Commerce data remains owned by Medusa, while presentation content has a
different lifecycle and should not expand the commerce model unnecessarily.

## Decision

Treat non-commerce storefront content as client-specific presentation
content/configuration.

This includes:

- page copy;
- navigation content;
- branding text;
- presentation settings;
- homepage and static-section content;
- references to media stored in object storage.

Do not add a headless CMS, a separate content database, or custom Medusa
content entities purely for presentation content in V1.

Commerce data remains owned by Medusa; presentation content remains outside the
commerce model.

For V1, content changes may require a controlled configuration or content
update process. If future clients require non-technical staff to edit pages
independently, self-service content management becomes a separate confirmed
requirement and architecture decision.

## Alternatives considered

### Custom presentation entities in Medusa

This would keep content near the backend, but would expand the commerce data
model and admin surface for a requirement that is not part of V1.

### Headless CMS

This would support richer editing and publishing workflows, but would add a
service, persistence boundary, authentication surface, and deployment
dependency without a confirmed V1 need.

### Separate content database

This would isolate presentation data, but would add another database and
recovery responsibility when controlled deployment content is sufficient for
V1.

## Consequences

- The commerce model remains focused on products, orders, inventory, payments,
  and related operational state.
- V1 branding and content can be supplied per client without code forks or a
  new platform.
- Content updates may require a controlled deployment/configuration process.
- Independent non-technical content editing is explicitly deferred rather than
  silently assumed.

## Not decided by this ADR

This decision does not select content file formats, configuration tooling,
publishing workflow, preview workflow, or media URL policy.
