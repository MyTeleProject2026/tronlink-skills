# Sponsored TRX production rollout gates

This document is a release gate, not a statement that the payout feature is production-ready.

## Current deployment boundary

The provider adapter is not connected to a verified vendor contract by default. Do not enable real payouts until a provider confirms in writing that it funds both the native TRX principal and the network fee. The public status endpoint reporting a configured adapter is not proof of funds, provider approval, or settlement.

The current API has an in-process IP rate limiter and request idempotency field, but it does not yet implement a durable payout ledger, durable idempotency uniqueness, authenticated end-user identity, or persistent per-user spending quotas. These are launch blockers for public use.

## Required persistent ledger

Use a managed PostgreSQL database with TLS and migrations. Do not treat a process-local Map, local filesystem, or ephemeral container disk as a financial ledger.

Minimum schema responsibilities:

- `sponsor_payouts`: internal payout UUID, authenticated user ID, normalized idempotency key, request digest, recipient address, amount in integer SUN, network, status, provider reference, transaction ID, created/updated timestamps, and failure category.
- A unique constraint on the idempotency key scoped to the authenticated user and operation.
- A unique constraint on a provider reference and/or transaction ID where present.
- A database transaction that reserves a request before the provider call, returns the prior result for a matching idempotent retry, and rejects reuse of the same key with a different digest.
- Explicit states such as `reserved`, `submitted-unconfirmed`, `confirmed`, `failed`, and `needs-reconciliation`. A timeout after submission must be reconciled with the provider before another payout can be issued.
- An append-only audit trail for state changes and operator reconciliation.

## Abuse and budget controls

Before public launch, require:

1. Verified VexaAccount/VexaTrade server-side session authentication. Never ship `SPONSOR_CLIENT_TOKEN` in frontend JavaScript, APKs, or other clients.
2. Per-user daily amount/count caps and global daily budget caps enforced atomically in the database.
3. Provider-side limits and idempotency, separate from application limits.
4. Rate limiting at a shared gateway or Redis-backed store, plus bot/fraud controls and recipient checks.
5. Operator kill switch, alerting, reconciliation, and a manual review path for ambiguous submissions.
6. A least-privilege database role, managed secrets, TLS, and documented retention/access policy.

## Verification sequence

- Run the sponsor-specific unit tests on supported Node versions.
- Test the provider's documented sandbox using its actual API contract.
- Confirm the provider contract explicitly covers both principal and fees.
- Exercise timeout/retry and duplicate-key cases without generating duplicate payouts.
- Make a low-value controlled Mainnet transfer only after approval and funding are confirmed.
- Confirm the exact sponsor, recipient, amount, and explicit successful result from solidified TRON data.
- Reconcile provider records against the chain before enabling broader access.

Until every gate is met, keep the sponsor feature disabled or restricted to trusted server-side testing. Never describe a submitted transaction as a confirmed payout.
