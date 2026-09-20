# ADR-0008: Provider-neutral isolated client media storage

- Status: Accepted
- Date: 2026-09-19

## Context

V1 includes client-managed product images, logos, page media, and other
branding assets. These binary files must survive application deployment or
server replacement and must be covered by the applicable backup and recovery
strategy.

Keeping media in PostgreSQL, the application filesystem, or Git would couple
assets to the wrong lifecycle and make isolated client operations harder.

## Decision

Use provider-neutral object storage for product images, logos, and other
client-managed media.

Each client deployment has isolated media storage through a dedicated bucket,
account, or equivalent namespace. Binary files are stored outside PostgreSQL.
Medusa/PostgreSQL stores only the required metadata and stable file references.

Media persists independently of application deployments and server
replacement, and is included in the backup and recovery strategy where
required.

The architecture must allow CDN delivery and image optimization to be added
later without changing the commerce data model.

Do not store admin-managed media permanently in PostgreSQL, the application
filesystem, or the Git repository.

## Alternatives considered

### Store media in PostgreSQL

This could centralize transactional backup, but would increase database size,
complicate media delivery, and couple binary asset management to commerce data.

### Store media in the application filesystem

This could be simple locally, but would make assets vulnerable to deployment
replacement, server loss, and inconsistent multi-instance behavior.

### Store media in Git

This would provide version history, but is unsuitable for admin-managed assets,
large binaries, client isolation, and operational media lifecycle management.

## Consequences

- Media and commerce data have separate appropriate persistence lifecycles.
- Client media isolation is explicit and can align with each isolated
  deployment.
- Database records remain small and portable because they contain references and
  metadata rather than binary files.
- Backup and restore procedures must cover object storage as well as PostgreSQL
  where media is required for operation.
- A provider or CDN can change behind the storage boundary without changing
  commerce records.

## Not decided by this ADR

This decision does not select an object-storage provider, bucket naming scheme,
CDN, image-processing service, public/private URL policy, retention policy, or
exact media metadata model.
