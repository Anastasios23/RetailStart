# ADR-0038: Isolated client environments

- Status: Accepted
- Date: 2026-09-19

## Context

Each client deployment is isolated, and routine development and verification
must not mutate production commerce resources. Payment, email, webhook, media,
database, and application configuration all carry environment-specific risk.

## Decision

Development, test, and production environments use isolated client-specific
resources and credentials.

For each client, isolation covers at least:

- PostgreSQL databases;
- object-storage namespaces or equivalent isolated storage;
- Medusa credentials and secrets;
- Stripe environment credentials and mode;
- transactional email configuration;
- webhook secrets and endpoints;
- environment-specific application configuration;
- test data versus production business data.

Routine development and automated verification must not use production commerce
resources.

Testing uses controlled test data, Stripe test mode, non-production email
delivery and configuration, isolated webhook delivery, and no production
customer, payment, order, or inventory data.

Do not share production databases with development or test environments, rely
only on environment flags inside otherwise shared sensitive resources, or run
routine end-to-end or integration tests against production client systems.

## Alternatives considered

### Shared resources with environment flags

This could reduce provisioning work, but would increase cross-environment data,
credential, webhook, and accidental-mutation risks.

### Routine tests against production resources

This could expose real integration behavior, but would create unacceptable
payment, notification, privacy, and data-integrity risks.

## Consequences

- Environment boundaries are security and data-integrity boundaries, not only
  labels or runtime flags.
- Test and recovery evidence can be generated without touching production
  business data.
- Each client environment requires independent configuration and operational
  management.
- Provisioning and test-data setup need repeatable processes as implementation
  develops.

## Not decided by this ADR

This decision does not select environment naming, staging topology,
provisioning automation, test-data seeding, or Stripe and email test-account
strategy.
