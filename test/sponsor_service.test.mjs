import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { requestSponsoredTransfer, sponsorStatus, validateSponsorRequest, verifySolidifiedTransfer } from "../scripts/sponsor_service.mjs";

const TEST_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TXID = "a".repeat(64);

test("sponsor is disabled until every required provider setting exists", () => {
  const status = sponsorStatus({});
  assert.equal(status.configured, false);
  assert.equal(status.ledgerReady, false);
  assert.equal(status.status, "disabled-not-configured");
  assert.equal(status.maximumPerTransferTrx, 100);
  assert.equal(status.paysTransferAmount, true);
  assert.equal(status.paysNetworkFee, true);
});

test("validates positive native TRX payouts up to 100 TRX", () => {
  const request = validateSponsorRequest({
    recipient: TEST_ADDRESS,
    amountTrx: "100",
    idempotencyKey: "sponsor-test-request-0001"
  });
  assert.equal(request.amountSun, "100000000");
});

test("rejects amounts above the cap and excessive precision", () => {
  const base = { recipient: TEST_ADDRESS, idempotencyKey: "sponsor-test-request-0001" };
  assert.throws(() => validateSponsorRequest({ ...base, amountTrx: "100.000001" }), /no more than 100 TRX/);
  assert.throws(() => validateSponsorRequest({ ...base, amountTrx: "0.0000001" }), /up to 6 decimal places/);
});

test("rejects invalid recipient and missing idempotency key", () => {
  assert.throws(() => validateSponsorRequest({
    recipient: "not-an-address", amountTrx: "1", idempotencyKey: "sponsor-test-request-0001"
  }), /valid TRON Mainnet address|checksum is invalid/);
  assert.throws(() => validateSponsorRequest({
    recipient: TEST_ADDRESS, amountTrx: "1", idempotencyKey: "x"
  }), /idempotencyKey|checksum is invalid/);
});

function addressHex(address) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const char of address) n = n * 58n + BigInt(alphabet.indexOf(char));
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  let bytes = Buffer.from(hex, "hex");
  let zeros = 0;
  while (zeros < address.length && address[zeros] === "1") zeros++;
  if (zeros) bytes = Buffer.concat([Buffer.alloc(zeros), bytes]);
  const payload = bytes.subarray(0, 21);
  const checksum = createHash("sha256")
    .update(createHash("sha256").update(payload).digest())
    .digest()
    .subarray(0, 4);
  assert.deepEqual(bytes.subarray(21), checksum);
  return payload.toString("hex");
}

async function withMockedFetch(payload, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(payload), {
    status: 200, headers: { "content-type": "application/json" }
  });
  try { await callback(); } finally { globalThis.fetch = originalFetch; }
}

test("payout submission is hard-disabled until the durable ledger is integrated", async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error("must not call provider"); };
  try {
    await assert.rejects(
      requestSponsoredTransfer({
        recipient: TEST_ADDRESS,
        amountTrx: "1",
        idempotencyKey: "sponsor-test-request-0003"
      }, {
        SPONSOR_PROVIDER_URL: "https://provider.example",
        SPONSOR_PROVIDER_API_KEY: "test-secret",
        SPONSOR_CLIENT_TOKEN: "test-client-token",
        SPONSOR_WALLET_ADDRESS: TEST_ADDRESS
      }),
      /durable payout ledger is integrated and tested/
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("payout confirmation is hard-disabled until the durable ledger is integrated", async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error("must not call chain"); };
  try {
    await assert.rejects(
      verifySolidifiedTransfer({
        transactionId: TXID, recipient: TEST_ADDRESS, amountTrx: "1"
      }, { SPONSOR_WALLET_ADDRESS: TEST_ADDRESS }),
      /durable payout ledger is integrated and tested/
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("payout stays disabled even when sponsor configuration is invalid", async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error("must not call provider"); };
  const invalidSponsor = TEST_ADDRESS.slice(0, -1) + (TEST_ADDRESS.endsWith("A") ? "B" : "A");
  try {
    await assert.rejects(
      requestSponsoredTransfer({
        recipient: TEST_ADDRESS,
        amountTrx: "1",
        idempotencyKey: "sponsor-test-request-0002"
      }, {
        SPONSOR_PROVIDER_URL: "https://provider.example",
        SPONSOR_PROVIDER_API_KEY: "test-secret",
        SPONSOR_CLIENT_TOKEN: "test-client-token",
        SPONSOR_WALLET_ADDRESS: invalidSponsor
      }),
      /durable payout ledger is integrated and tested/
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
