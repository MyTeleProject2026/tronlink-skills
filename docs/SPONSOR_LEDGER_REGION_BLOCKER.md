# Sponsored TRX ledger connectivity blocker

## Verified deployment state (2026-10-19)

- API service: `tronlink-skills-api`, region **Singapore**, free web-service plan.
- Ledger database: `tronlink-skills-sponsor-ledger`, region **Oregon**, PostgreSQL 18, free plan.
- The API starts and serves requests, but its startup diagnostic reports:
  `configured=true, connected=false, schemaReady=false, migrationApplied=false, error=database-host-not-resolved`.
- The existing Render database tool reports that the database is available but accepts external connections only from its IP allowlist. Its current allowlist does not establish connectivity from the API service.
- The SQL migration is present in the repository, but it has not been verified as applied to the live database.

## Why the ledger remains closed

Render private database hostnames are intended for services in the same region. The API is in Singapore and the database is in Oregon, so using the database's internal hostname from the API cannot work across these regions. Do not open the database to `0.0.0.0/0` as a workaround and do not expose the database password in source control, logs, or chat.

The API deliberately fails closed. `DATABASE_URL` alone must not enable payouts; the database must connect, the migration must be applied, the ledger tests must pass, and a trusted application identity plus per-user and global budget controls must be integrated before any transfer endpoint can submit a provider request.

## Supported resolution choices

Choose one topology before changing infrastructure:

1. **Keep the database in Oregon:** create/migrate the API service in Oregon, validate it there, and only then plan a controlled traffic cutover from the existing Singapore service. The current service's region cannot simply be assumed to change in place.
2. **Keep the API in Singapore:** provision a PostgreSQL database in Singapore, migrate the schema/data as appropriate, and keep access private to the service.

Either option requires obtaining the database's correct Render-provided connection string through the dashboard and binding it as a secret environment variable. Do not manually reconstruct a connection string from guessed hostnames or credentials.

## Release gates still required

- Confirm live database connectivity and that both ledger tables exist.
- Apply the checked-in migration deliberately and verify the resulting schema.
- Test concurrent idempotency reservations, duplicate keys with mismatched request data, and state transitions.
- Integrate trusted end-user authentication. The current sponsor token is server-to-server authentication, not end-user authentication.
- Add atomic per-user/global budgets, anti-abuse controls, durable reconciliation, and operator monitoring.
- Verify a real sponsor contract and explicit sponsor funding of both transfer amount and network fees.
- Keep public payout execution disabled until all gates above pass. No private key or seed phrase is needed or permitted for this architecture.
