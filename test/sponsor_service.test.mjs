import test from "node:test";
import assert from "node:assert/strict";
import { sponsorStatus, validateSponsorRequest } from "../scripts/sponsor_service.mjs";

test("sponsor is disabled until every required provider setting exists", () => {
  const status = sponsorStatus({});
  assert.equal(status.configured, false);
  assert.equal(status.status, "disabled-not-configured");
  assert.equal(status.maximumPerTransferTrx, 100);
  assert.equal(status.paysTransferAmount, true);
  assert.equal(status.paysNetworkFee, true);
});

test("validates positive native TRX payouts up to 100 TRX", () => {
  const request = validateSponsorRequest({
    recipient: "TJRabPrwbZy45sbavfcjy6eFXvuF8K8Z9Z",
    amountTrx: "100",
    idempotencyKey: "sponsor-test-request-0001"
  });
  assert.equal(request.amountSun, "100000000");
});

test("rejects amounts above the cap and excessive precision", () => {
  const base = {
    recipient: "TJRabPrwbZy45sbavfcjy6eFXvuF8K8Z9Z",
    idempotencyKey: "sponsor-test-request-0001"
  };
  assert.throws(() => validateSponsorRequest({ ...base, amountTrx: "100.000001" }), /no more than 100 TRX/);
  assert.throws(() => validateSponsorRequest({ ...base, amountTrx: "0.0000001" }), /up to 6 decimal places/);
});

test("rejects invalid recipient and missing idempotency key", () => {
  assert.throws(() => validateSponsorRequest({
    recipient: "not-an-address", amountTrx: "1", idempotencyKey: "sponsor-test-request-0001"
  }), /valid-looking TRON Mainnet address/);
  assert.throws(() => validateSponsorRequest({
    recipient: "TJRabPrwbZy45sbavfcjy6eFXvuF8K8Z9Z", amountTrx: "1", idempotencyKey: "x"
  }), /idempotencyKey/);
});
