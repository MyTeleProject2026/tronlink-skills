import test from "node:test";
import assert from "node:assert/strict";
import {
  checkSponsorLedgerReady,
  reserveSponsoredPayout,
  recordSponsoredSubmission,
  recordSponsoredConfirmation
} from "../scripts/sponsor_ledger.mjs";

const ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const DIGEST = "a".repeat(64);
const TXID = "b".repeat(64);
const valid = {
  userId: "verified-app-user-123",
  idempotencyKey: "sponsor-ledger-test-0001",
  requestDigest: DIGEST,
  recipient: ADDRESS,
  amountSun: "100000000"
};

function mockPool(handler) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      return handler(sql, params, calls.length);
    },
    release() { calls.push({ sql: "RELEASE", params: [] }); }
  };
  return {
    calls,
    async connect() { return client; },
    async query(sql, params = []) {
      calls.push({ sql, params });
      return handler(sql, params, calls.length);
    }
  };
}

test("ledger readiness requires both payout and audit tables", async () => {
  assert.equal(await checkSponsorLedgerReady({ query: async () => ({ rows: [{ payouts_exists: true, events_exists: true }] }) }), true);
  assert.equal(await checkSponsorLedgerReady({ query: async () => ({ rows: [{ payouts_exists: true, events_exists: false }] }) }), false);
  assert.equal(await checkSponsorLedgerReady(null), false);
});

test("reservation validates the 100 TRX cap before touching PostgreSQL", async () => {
  const pool = mockPool(() => ({ rows: [] }));
  await assert.rejects(
    reserveSponsoredPayout(pool, { ...valid, amountSun: "100000001" }),
    /between 1 SUN and 100 TRX/
  );
  assert.equal(pool.calls.length, 0);
});

test("new reservation is transactional and writes an audit event", async () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: valid.userId,
    idempotency_key: valid.idempotencyKey,
    request_digest: DIGEST,
    recipient_address: ADDRESS,
    amount_sun: "100000000",
    status: "reserved"
  };
  const pool = mockPool((sql) => {
    if (sql.includes("INSERT INTO sponsor_payouts")) return { rows: [row] };
    return { rows: [] };
  });
  const result = await reserveSponsoredPayout(pool, valid);
  assert.equal(result.created, true);
  assert.equal(result.payout.status, "reserved");
  assert.ok(pool.calls.some((x) => x.sql === "BEGIN"));
  assert.ok(pool.calls.some((x) => x.sql.includes("INSERT INTO sponsor_payout_events")));
  assert.ok(pool.calls.some((x) => x.sql === "COMMIT"));
  assert.ok(pool.calls.some((x) => x.sql === "RELEASE"));
});

test("reusing an idempotency key for different request data is rejected", async () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: valid.userId,
    idempotency_key: valid.idempotencyKey,
    request_digest: "c".repeat(64),
    recipient_address: ADDRESS,
    amount_sun: "100000000",
    status: "reserved"
  };
  const pool = mockPool((sql) => {
    if (sql.includes("INSERT INTO sponsor_payouts")) return { rows: [] };
    if (sql.includes("SELECT id, user_id")) return { rows: [row] };
    return { rows: [] };
  });
  await assert.rejects(reserveSponsoredPayout(pool, valid), /different payout request/);
  assert.ok(pool.calls.some((x) => x.sql === "ROLLBACK"));
});

test("submission cannot be recorded unless payout is in a submittable state", async () => {
  const pool = mockPool(() => ({ rows: [] }));
  await assert.rejects(
    recordSponsoredSubmission(pool, {
      payoutId: "00000000-0000-4000-8000-000000000001",
      providerReference: "provider-ref-1",
      transactionId: TXID
    }),
    /not in a submittable state/
  );
  assert.ok(pool.calls.some((x) => x.sql === "ROLLBACK"));
});

test("records a valid submission when provider reference metadata is absent", async () => {
  const pool = mockPool((sql) => {
    if (sql.includes("UPDATE sponsor_payouts")) {
      return { rows: [{ id: "00000000-0000-4000-8000-000000000001", status: "submitted-unconfirmed", provider_reference: null, transaction_id: TXID }] };
    }
    return { rows: [] };
  });
  const result = await recordSponsoredSubmission(pool, {
    payoutId: "00000000-0000-4000-8000-000000000001",
    transactionId: TXID
  });
  assert.equal(result.status, "submitted-unconfirmed");
  const update = pool.calls.find((x) => x.sql.includes("UPDATE sponsor_payouts"));
  assert.equal(update.params[1], null);
  const event = pool.calls.find((x) => x.sql.includes("INSERT INTO sponsor_payout_events"));
  assert.equal(JSON.parse(event.params[1]).providerReference, null);
});

test("confirmation requires explicit independent verification", async () => {
  const pool = mockPool(() => ({ rows: [] }));
  await assert.rejects(
    recordSponsoredConfirmation(pool, {
      payoutId: "00000000-0000-4000-8000-000000000001",
      transactionId: TXID,
      verified: false
    }),
    /verified must be true/
  );
  assert.equal(pool.calls.length, 0);
});
