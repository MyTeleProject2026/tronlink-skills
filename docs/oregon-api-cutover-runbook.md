# Oregon API migration and controlled cutover

## Current deployment map (checked 2026-10-20)

| Role | Render resource | Region | State |
|---|---|---|---|
| Existing API, keep serving during migration | `tronlink-skills-api` (`srv-db86d7dg1s2s7397e8b0`) | Singapore | Existing production endpoint |
| Candidate API | `tronlink-skills-api-oregon-canary` (`srv-dbandaom7kps739hpevg`) | Oregon | Latest observed deployment is live |
| Sponsor ledger PostgreSQL | `tronlink-skills-sponsor-ledger` (`dpg-dbafj4tg1s2s73bu80m0-a`) | Oregon | Free PostgreSQL 18, available, expires 2026-11-17 |

The API service's region is not edited in place. Keep the Singapore service untouched while the Oregon canary is validated. The candidate has its own Render URL: `https://tronlink-skills-api-oregon-canary.onrender.com`.

The most recent canary startup log reported `configured:false`, `connected:false`, `schemaReady:false`, and `migrationApplied:false`. This is fail-closed, but it means the database is **not yet connected**. The Render read-only SQL tool also could not connect because the database requires TLS and its external IP allowlist does not include that tool. Do not widen the database allowlist to `0.0.0.0/0` to work around this. Same-region services should use the database's **internal connection URL**.

## Phase 1: prepare the Oregon canary

1. In Render, open the Oregon PostgreSQL resource and copy its **Internal Database URL**. Do not paste it into GitHub, chat, logs, or a client-side app.
2. In the Oregon canary service only, set `DATABASE_URL` to that internal URL using Render's environment-variable UI. Do not change the Singapore service.
3. Keep `SPONSOR_LEDGER_AUTO_MIGRATE=false` (or unset). Connecting the app must not implicitly run schema changes.
4. Set the service health-check path to `/health` in Render if available.
5. Redeploy/restart the canary and inspect its startup log. Required first result: database `configured:true`, `connected:true`, and no credential or connection details printed.
6. Check `GET /health`, `GET /capabilities`, and `GET /api/sponsor/status` on the canary. Health must return 200; the sponsor status must still report payouts disabled. Record the responses and deploy commit.

## Phase 2: apply and validate the ledger schema

1. Before any schema mutation, verify the database name is `tronlink_skills_sponsor_ledger`, the region is Oregon, and a recovery/export plan exists. The free database currently has no backups/HA and expires on 2026-11-17; schedule an export before relying on it for durable financial records.
2. Review `db/migrations/001_sponsor_payout_ledger.sql` and apply it once to this database using an authenticated, TLS-capable database session. Do not run the migration against any other database.
3. Validate the existence of `sponsor_payouts`, `sponsor_payout_events`, their unique constraints/indexes, and the intended schema with read-only queries. Confirm no production payouts were created during validation.
4. Restart the canary and confirm its DB state reports `connected:true` and `schemaReady:true`. `migrationApplied` reports whether this process ran the migration automatically; it is not a substitute for verifying the actual schema.
5. Run the repository test suite and non-value test requests. Verify the sponsor transfer and confirmation endpoints return 503 while the payout gate is closed, including when database/provider environment values are present. Do not send real TRX or invoke a real sponsor provider during this phase.

## Phase 3: acceptance gates before traffic cutover

Do **not** cut over until every item is verified:

- [ ] Oregon canary has a live deploy of the intended `main` commit and `/health` returns 200.
- [ ] API contract smoke tests pass for `/capabilities`, read-only commands, error handling, CORS/origin policy, and request limits.
- [ ] Database internal connection works from Oregon without broadening external IP allowlists.
- [ ] Schema is verified, uniqueness/idempotency behavior is integration-tested under concurrent requests, and a backup/export and restore test are documented.
- [ ] Real end-user identity is authenticated server-side; a shared client token alone is not user authentication.
- [ ] Per-user and global payout limits, atomic budget reservations, durable audit events, reconciliation, and provider idempotency are implemented and tested.
- [ ] A real sponsor provider's documented API contract, funding, network-fee coverage, webhook/settlement behavior, and operational support have been verified.
- [ ] Security review and explicit operator approval are recorded.

The current code deliberately hard-disables payout execution. Database connectivity or schema readiness alone must not flip that gate.

## Phase 4: controlled cutover and rollback

1. Keep the Singapore API serving traffic while testing the Oregon canary using its separate URL.
2. After acceptance, change one client/API-base configuration or custom-domain route at a time to point to Oregon. Do not delete, suspend, or overwrite the Singapore service.
3. Validate a small read-only request sample and monitor health, latency, error rates, and database connection state. Do not use a live-value payout as a smoke test.
4. If any check fails, revert the client/API-base configuration or domain route to the Singapore endpoint. Keep both deployments available until the observation window passes.
5. Only after a stable observation window and a verified rollback path should the old service be considered for retirement.

## Explicit non-goals

- No public payout activation or real transfer during migration.
- No new database, no change to the PostgreSQL region, and no broadening of the database IP allowlist.
- No secrets committed to source control.
- No claim that the sponsor provider is funded or that a transfer will be accepted by exchanges or recipient wallets.
