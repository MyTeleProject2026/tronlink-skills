/**
 * PostgreSQL ledger primitives for sponsored native TRX payouts.
 *
 * These helpers intentionally do not submit blockchain transactions. They are
 * building blocks for a future authenticated payout controller. Keep the public
 * payout gate closed until the caller obtains userId from trusted application
 * authentication and applies account, daily-budget, and abuse limits.
 */

const MAX_SUN = 100_000_000n;

function assertText(value, label, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new TypeError(`${label} must be a non-empty string of at most ${max} characters`);
  }
  return value.trim();
}

function assertAmountSun(value) {
  const text = String(value);
  if (!/^\d+$/.test(text)) throw new TypeError("amountSun must be an integer SUN value");
  const amount = BigInt(text);
  if (amount < 1n || amount > MAX_SUN) throw new RangeError("amountSun must be between 1 SUN and 100 TRX");
  return text;
}

async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function checkSponsorLedgerReady(pool) {
  if (!pool || typeof pool.query !== "function") return false;
  try {
    const result = await pool.query(`
      SELECT
        to_regclass('public.sponsor_payouts') IS NOT NULL AS payouts_exists,
        to_regclass('public.sponsor_payout_events') IS NOT NULL AS events_exists
    `);
    return result.rows?.[0]?.payouts_exists === true &&
      result.rows?.[0]?.events_exists === true;
  } catch {
    return false;
  }
}

/**
 * Reserve an idempotent payout before calling a sponsor provider.
 * The caller must pass userId from verified server-side authentication, never
 * from an untrusted request body. Reusing a key with different request data
 * raises a conflict instead of creating another reservation.
 */
export async function reserveSponsoredPayout(pool, {
  userId, idempotencyKey, requestDigest, recipient, amountSun
}) {
  const user = assertText(userId, "userId");
  const key = assertText(idempotencyKey, "idempotencyKey", 128);
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) throw new TypeError("Invalid idempotencyKey");
  const digest = assertText(requestDigest, "requestDigest", 64);
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new TypeError("requestDigest must be a SHA-256 hex digest");
  const to = assertText(recipient, "recipient", 64);
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(to)) throw new TypeError("recipient must be a TRON Mainnet address");
  const sun = assertAmountSun(amountSun);

  return transaction(pool, async (client) => {
    const inserted = await client.query(`
      INSERT INTO sponsor_payouts
        (user_id, idempotency_key, request_digest, recipient_address, amount_sun, status)
      VALUES ($1, $2, $3, $4, $5::bigint, 'reserved')
      ON CONFLICT (user_id, operation, idempotency_key) DO NOTHING
      RETURNING id, user_id, idempotency_key, request_digest, recipient_address,
                amount_sun::text AS amount_sun, status, provider_reference,
                transaction_id, created_at, updated_at
    `, [user, key, digest, to, sun]);

    let payout = inserted.rows?.[0];
    let created = Boolean(payout);
    if (!payout) {
      const existing = await client.query(`
        SELECT id, user_id, idempotency_key, request_digest, recipient_address,
               amount_sun::text AS amount_sun, status, provider_reference,
               transaction_id, created_at, updated_at
        FROM sponsor_payouts
        WHERE user_id = $1 AND operation = 'native-trx-payout' AND idempotency_key = $2
        FOR UPDATE
      `, [user, key]);
      payout = existing.rows?.[0];
      if (!payout) throw new Error("Idempotency reservation conflict; retry safely");
      if (payout.request_digest !== digest || payout.recipient_address !== to || String(payout.amount_sun) !== sun) {
        throw Object.assign(new Error("Idempotency key was already used for a different payout request"), { status: 409 });
      }
    }

    if (created) {
      await client.query(`
        INSERT INTO sponsor_payout_events
          (payout_id, event_type, from_status, to_status, actor_type, actor_id, details)
        VALUES ($1, 'reserved', NULL, 'reserved', 'user', $2, $3::jsonb)
      `, [payout.id, user, JSON.stringify({ network: "tron-mainnet", asset: "TRX", amountSun: sun })]);
    }
    return { payout, created };
  });
}

/** Store provider submission metadata without treating it as settlement. */
export async function recordSponsoredSubmission(pool, {
  payoutId, providerReference, transactionId
}) {
  const id = assertText(payoutId, "payoutId", 64);
  // Some sponsor APIs return only a transaction ID. Treat the provider
  // reference as optional metadata, not a prerequisite for recording a valid
  // submitted transaction.
  const providerRef = providerReference == null || providerReference === ""
    ? null
    : assertText(providerReference, "providerReference", 160);
  const txid = assertText(transactionId, "transactionId", 64);
  if (!/^[a-fA-F0-9]{64}$/.test(txid)) throw new TypeError("transactionId must be 64 hex characters");

  return transaction(pool, async (client) => {
    const updated = await client.query(`
      UPDATE sponsor_payouts
      SET status = 'submitted-unconfirmed', provider_reference = $2,
          transaction_id = $3, submitted_at = now(), updated_at = now()
      WHERE id = $1::uuid AND status IN ('reserved', 'needs-reconciliation')
      RETURNING id, status, provider_reference, transaction_id, updated_at
    `, [id, providerRef, txid.toLowerCase()]);
    const payout = updated.rows?.[0];
    if (!payout) throw Object.assign(new Error("Payout not found or not in a submittable state"), { status: 409 });
    await client.query(`
      INSERT INTO sponsor_payout_events
        (payout_id, event_type, from_status, to_status, actor_type, details)
      VALUES ($1, 'provider-submitted', 'reserved', 'submitted-unconfirmed', 'provider', $2::jsonb)
    `, [id, JSON.stringify({ providerReference: providerRef, transactionId: txid.toLowerCase() })]);
    return payout;
  });
}

/** Only call after independent solidified-chain verification has succeeded. */
export async function recordSponsoredConfirmation(pool, {
  payoutId, transactionId, verified
}) {
  const id = assertText(payoutId, "payoutId", 64);
  const txid = assertText(transactionId, "transactionId", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(txid)) throw new TypeError("transactionId must be 64 hex characters");
  if (verified !== true) throw new TypeError("verified must be true after solidified-chain verification");

  return transaction(pool, async (client) => {
    const updated = await client.query(`
      UPDATE sponsor_payouts
      SET status = 'confirmed', confirmed_at = now(), updated_at = now()
      WHERE id = $1::uuid AND lower(transaction_id) = $2
        AND status = 'submitted-unconfirmed'
      RETURNING id, status, transaction_id, confirmed_at
    `, [id, txid]);
    const payout = updated.rows?.[0];
    if (!payout) throw Object.assign(new Error("Payout not found or not awaiting confirmation"), { status: 409 });
    await client.query(`
      INSERT INTO sponsor_payout_events
        (payout_id, event_type, from_status, to_status, actor_type, details)
      VALUES ($1, 'confirmed', 'submitted-unconfirmed', 'confirmed', 'system', $2::jsonb)
    `, [id, JSON.stringify({ transactionId: txid, verification: "solidified-chain-success" })]);
    return payout;
  });
}
