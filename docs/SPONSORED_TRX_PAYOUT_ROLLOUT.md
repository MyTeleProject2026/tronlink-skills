# Sponsored native TRX payout rollout

## Current safety posture

Sponsored native TRX payouts are intentionally disabled. The provider adapter is not a wallet signer, and no payout should be considered complete until an independent TRON Mainnet solidity-node check confirms the sponsor address, recipient, amount, transaction ID, and successful contract result.

The maximum request is 100 TRX. The external sponsor must fund both the transfer principal and the network fee. Never collect or store a user's private key or seed phrase.

## Infrastructure status observed during rollout

- Render API service: `tronlink-skills-api`, region `singapore`.
- Provisioned PostgreSQL ledger: `tronlink-skills-sponsor-ledger`, region `oregon`, free plan with a 30-day expiry.
- The service startup log reported `database-host-not-resolved`, with `connected=false` and `schemaReady=false`.
- The SQL migration is checked in but the live schema has not been confirmed as applied.
- The generic provider URL contract has not been verified against a real sponsor provider.
- End-user authentication and durable per-user / global budget enforcement are not connected to the payout routes.

The service and database are in different regions. Use a supported same-region private connection, or deliberately configure and secure the database's external connection according to Render's networking and IP-allowlist guidance. Do not open the database to the entire internet just to make diagnostics pass. Do not put database credentials in source control, frontend code, logs, or chat.

## Required release gates

1. Connect the API to the intended database using a secret managed by Render. Confirm DNS/network connectivity without logging the connection string.
2. Apply and verify `db/migrations/001_sponsor_payout_ledger.sql` against the intended database. Confirm the payout and audit tables and their unique constraints exist.
3. Connect a trusted application authentication layer. Obtain `userId` from the verified server-side session, never from the caller's JSON body. The current `SPONSOR_CLIENT_TOKEN` is service-to-service authentication only and is not end-user authentication.
4. Add transactional daily and global budget reservations, replay protection, account eligibility checks, abuse controls, reconciliation for timeouts, and append-only audit records.
5. Integrate the ledger into reservation, provider submission, and confirmation. An ambiguous provider timeout must be reconciled using the same idempotency key, not retried as a new payout.
6. Verify the selected sponsor's written API contract and that the sponsor covers both principal and network fee. Confirm its account is funded and test on a non-production environment first.
7. Run the full test suite, provider contract tests, concurrency/idempotency tests, and a small controlled end-to-end Mainnet verification only after explicit operational approval.
8. Keep the public payout feature hard-disabled until every gate above passes.

## Current API behavior

- `GET /api/sponsor/status` reports readiness/configuration diagnostics.
- `POST /api/sponsor/transfer` and `POST /api/sponsor/confirm` require service-to-service authorization and are hard-disabled by the ledger readiness gate.
- A successful build or a configured provider URL does not mean payouts are enabled, funded, or settled.
