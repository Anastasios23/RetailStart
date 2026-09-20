# Local infrastructure

The local infrastructure is an isolated Docker Compose project for Retail
Starter. It does not use or manage any other project container.

## Start and inspect

From the repository root, with the approved Node and pnpm toolchain active:

```powershell
docker compose -f infra/docker-compose.yml up -d postgres
pnpm infra:status
pnpm db:migrate
```

`pnpm infra:up` is the equivalent PostgreSQL-only convenience command.

Retail Starter PostgreSQL is published on host port `5433` and listens on its
normal container port `5432`. The backend template therefore uses:

```env
DATABASE_URL=postgres://retail_starter:retail_starter_local@localhost:5433/retail_starter_dev
```

MinIO is an optional local object-storage environment reserved for the later
media phase. It is not started by the baseline command, is not wired into
Medusa or backend runtime configuration, and is not a production provider
selection. Opt in explicitly when needed:

```powershell
docker compose -f infra/docker-compose.yml --profile media up -d minio
```

Its S3-compatible API is on `localhost:9003` and its local console is on
`localhost:9002`. MinIO availability does not affect backend readiness or
Phase 2 tests and builds.

## Reset

The reset command removes only the Retail Starter Compose volumes. Run it only
when a clean local database is required:

```powershell
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:migrate
```

The database contains no committed commerce fixture yet; deterministic product
fixtures are introduced with the commerce implementation phase.

## Health endpoints

When the backend is running on its default port:

- `GET /health` is Medusa's built-in process health endpoint.
- `GET /health/liveness` reports process liveness.
- `GET /health/readiness` requires validated configuration and PostgreSQL.
- `GET /health/capabilities` reports PostgreSQL capability status separately.

On `SIGTERM` or `SIGINT`, readiness changes to `draining` and the process exits
after the bounded `SHUTDOWN_TIMEOUT_MS` window. Phase 2 has no application-owned
background work; later durable workers must extend this boundary before adding
process-local shutdown work.
