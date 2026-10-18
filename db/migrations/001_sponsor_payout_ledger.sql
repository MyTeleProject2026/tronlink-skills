-- Sponsored native TRX payout ledger foundation.
-- This migration is intentionally not wired into runtime yet. Do not enable
-- public payouts until a transactional repository uses these constraints.
BEGIN;

CREATE TABLE IF NOT EXISTS sponsor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL DEFAULT 'native-trx-payout'
    CHECK (operation = 'native-trx-payout'),
  network TEXT NOT NULL DEFAULT 'tron-mainnet'
    CHECK (network = 'tron-mainnet'),
  asset TEXT NOT NULL DEFAULT 'TRX'
    CHECK (asset = 'TRX'),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) BETWEEN 1 AND 256),
  idempotency_key TEXT NOT NULL
    CHECK (idempotency_key ~ '^[A-Za-z0-9._:-]{16,128}$'),
  request_digest CHAR(64) NOT NULL
    CHECK (request_digest ~ '^[a-f0-9]{64}$'),
  recipient_address TEXT NOT NULL
    CHECK (recipient_address ~ '^T[1-9A-HJ-NP-Za-km-z]{33}$'),
  amount_sun BIGINT NOT NULL CHECK (amount_sun BETWEEN 1 AND 100000000),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN (
      'reserved',
      'submitted-unconfirmed',
      'confirmed',
      'failed',
      'needs-reconciliation'
    )),
  provider_reference TEXT,
  transaction_id CHAR(64)
    CHECK (transaction_id IS NULL OR transaction_id ~ '^[a-fA-F0-9]{64}$'),
  failure_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT sponsor_payouts_idempotency_unique
    UNIQUE (user_id, operation, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_payouts_provider_reference_unique
  ON sponsor_payouts (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_payouts_transaction_id_unique
  ON sponsor_payouts (lower(transaction_id))
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sponsor_payouts_user_created_idx
  ON sponsor_payouts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sponsor_payouts_status_created_idx
  ON sponsor_payouts (status, created_at)
  WHERE status IN ('reserved', 'submitted-unconfirmed', 'needs-reconciliation');

CREATE TABLE IF NOT EXISTS sponsor_payout_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payout_id UUID NOT NULL REFERENCES sponsor_payouts(id),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'reserved',
      'provider-submitted',
      'confirmation-checked',
      'confirmed',
      'failed',
      'reconciliation-required',
      'operator-note'
    )),
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('system', 'user', 'operator', 'provider')),
  actor_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsor_payout_events_payout_created_idx
  ON sponsor_payout_events (payout_id, created_at, id);

-- Keep audit events append-only for ordinary application roles. The migration
-- owner can still administer the table; grant application roles INSERT/SELECT,
-- not UPDATE/DELETE, after reviewing the deployment's role model.
COMMENT ON TABLE sponsor_payouts IS
  'Durable native TRX sponsor payout state; amount_sun is integer SUN, max 100 TRX.';
COMMENT ON TABLE sponsor_payout_events IS
  'Append-only audit events for sponsor payout state changes.';

COMMIT;
