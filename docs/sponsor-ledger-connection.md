# Sponsored TRX payout rollout blockers

Last checked: 2026-10-19.

## Current deployment

- API: https://tronlink-skills-api.onrender.com
- Service region: Singapore
- Sponsor ledger database: `tronlink-skills-sponsor-ledger`
- Database region: Oregon, free PostgreSQL 18 plan
- Database expiry shown by Render: 2026-11-17
- Latest verified build test result: 52 passing, 0 failing
- Runtime log reports `configured=true`, `connected=false`, `schemaReady=false`, `migrationApplied=false`, error `database-host-not-resolved`.

## Why payouts remain disabled

The web service and database are in different Render regions. If `DATABASE_URL` uses the database's private/internal hostname, it will not be resolvable from a service in another region. The current error is consistent with that mismatch, but the exact configured hostname has not been inspected and must not be guessed.

The existing PostgreSQL migration and ledger helpers are not yet wired into the payout request/confirmation path. The sponsor adapter still hard-disables execution. Do not change that gate merely because database credentials exist or a provider URL is configured.

## Safe remediation sequence

1. Choose a deliberate topology: deploy a replacement API service in Oregon to match the existing database, or use a supported external database connection with a narrowly scoped allowlist and verified TLS. Do not open PostgreSQL to `0.0.0.0/0`.
2. Set `DATABASE_URL` using Render's database connection details in the dashboard. Never commit the URL or password to GitHub, logs, or client-side code.
3. Run the migration as a controlled deployment step against the intended database, then verify both `sponsor_payouts` and `sponsor_payout_events` exist.
4. Add integration tests for transaction rollback, concurrent idempotency reservations, mismatched key reuse, unique transaction/provider references, and solidified settlement updates.
5. Integrate a trusted application authentication adapter that derives `user_id` from a verified session/token. The current shared sponsor client token is not per-user authentication and must not be accepted as proof of user identity.
6. Add atomic per-user limits, a global sponsor budget, abuse controls, provider idempotency reconciliation, and an operator reconciliation path.
7. Verify the provider's real API contract and that it covers both the TRX principal and network fee. Confirm external sponsor funding and test a low-value transfer on a controlled account before any production release.
8. Keep public payouts disabled until all checks above pass and end-to-end settlement has been independently verified.

## Operational note

The free PostgreSQL instance is temporary and shown as expiring on 2026-11-17. It has no high availability or backups enabled. It is suitable for development validation only, not as the sole durable production payout ledger without a migration/backup plan.
