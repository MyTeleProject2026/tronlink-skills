/**
 * Fail-closed adapter for a third-party TRON Mainnet TRX payout sponsor.
 *
 * The configured provider must fund BOTH the requested native TRX amount and
 * transaction costs. This module never signs with a local private key.
 * Provider API contract: POST {SPONSOR_PROVIDER_URL}/v1/transfers with Bearer
 * SPONSOR_PROVIDER_API_KEY and {network, asset, recipient, amountTrx,
 * idempotencyKey}; response must contain {transactionId}. A vendor-specific
 * adapter may be required if the selected provider uses a different contract.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const MAX_TRX = 100;
const SUN_PER_TRX = 1_000_000;
const ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const TXID_RE = /^[a-fA-F0-9]{64}$/;

function secretMatches(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string" || !actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sponsorStatus(env = process.env) {
  const configured = Boolean(
    env.SPONSOR_PROVIDER_URL &&
    env.SPONSOR_PROVIDER_API_KEY &&
    env.SPONSOR_CLIENT_TOKEN &&
    env.SPONSOR_WALLET_ADDRESS
  );
  return {
    feature: "external-trx-sponsor",
    network: "TRON Mainnet",
    asset: "TRX",
    maximumPerTransferTrx: MAX_TRX,
    paysTransferAmount: true,
    paysNetworkFee: true,
    configured,
    status: configured ? "configured-provider-not-yet-verified" : "disabled-not-configured",
    requiredEnvironment: [
      "SPONSOR_PROVIDER_URL",
      "SPONSOR_PROVIDER_API_KEY",
      "SPONSOR_CLIENT_TOKEN",
      "SPONSOR_WALLET_ADDRESS"
    ],
    note: "A configured endpoint is not proof of provider funding or on-chain settlement. Test and verify before enabling production use."
  };
}

export function validateSponsorRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("Body must be a JSON object"), { status: 400 });
  }
  const allowed = ["recipient", "amountTrx", "idempotencyKey"];
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unknown.length) throw Object.assign(new Error("Unsupported request fields"), { status: 400 });
  if (typeof body.recipient !== "string" || !ADDRESS_RE.test(body.recipient)) {
    throw Object.assign(new Error("Recipient must be a valid-looking TRON Mainnet address"), { status: 400 });
  }
  if (typeof body.amountTrx !== "string" && typeof body.amountTrx !== "number") {
    throw Object.assign(new Error("amountTrx must be a decimal string or number"), { status: 400 });
  }
  const amountText = String(body.amountTrx);
  if (!/^\d+(\.\d{1,6})?$/.test(amountText)) {
    throw Object.assign(new Error("amountTrx must have up to 6 decimal places"), { status: 400 });
  }
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TRX) {
    throw Object.assign(new Error("amountTrx must be greater than 0 and no more than 100 TRX"), { status: 400 });
  }
  if (typeof body.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{16,128}$/.test(body.idempotencyKey)) {
    throw Object.assign(new Error("idempotencyKey must be 16-128 safe characters"), { status: 400 });
  }
  return {
    recipient: body.recipient,
    amountTrx: amountText,
    amountSun: String(Math.round(amount * SUN_PER_TRX)),
    idempotencyKey: body.idempotencyKey
  };
}

export async function requestSponsoredTransfer(body, env = process.env) {
  const cfg = sponsorStatus(env);
  if (!cfg.configured) throw Object.assign(new Error("Sponsor service is disabled until provider credentials and sponsor wallet are configured"), { status: 503 });
  let base;
  try { base = new URL(env.SPONSOR_PROVIDER_URL); } catch {
    throw Object.assign(new Error("SPONSOR_PROVIDER_URL must be a valid HTTPS URL"), { status: 503 });
  }
  if (base.protocol !== "https:") throw Object.assign(new Error("Sponsor provider URL must use HTTPS"), { status: 503 });
  if (!ADDRESS_RE.test(env.SPONSOR_WALLET_ADDRESS)) throw Object.assign(new Error("SPONSOR_WALLET_ADDRESS is invalid"), { status: 503 });
  const request = validateSponsorRequest(body);
  const timeout = AbortSignal.timeout(12_000);
  const requestDigest = createHash("sha256")
    .update(["tron-mainnet", request.recipient, request.amountSun, request.idempotencyKey].join(":"))
    .digest("hex");
  let response;
  try {
    response = await fetch(new URL("/v1/transfers", base), {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.SPONSOR_PROVIDER_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": request.idempotencyKey
      },
      body: JSON.stringify({
        network: "tron-mainnet",
        asset: "TRX",
        recipient: request.recipient,
        amountTrx: request.amountTrx,
        idempotencyKey: request.idempotencyKey,
        requestDigest,
        requireSponsorPaysNetworkFee: true,
        sponsorAddress: env.SPONSOR_WALLET_ADDRESS
      }),
      signal: timeout
    });
  } catch {
    throw Object.assign(new Error("Sponsor provider could not be reached. Do not retry with a new idempotency key until provider status is checked."), { status: 502 });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Sponsor provider rejected the request (HTTP ${response.status})`), { status: response.status === 429 ? 429 : 502 });
  }
  let result;
  try { result = await response.json(); } catch {
    throw Object.assign(new Error("Sponsor provider returned invalid JSON"), { status: 502 });
  }
  const txid = result && (result.transactionId || result.txid || result.txID);
  if (typeof txid !== "string" || !TXID_RE.test(txid)) {
    throw Object.assign(new Error("Provider response did not contain a valid transaction ID; settlement is unverified"), { status: 502 });
  }
  return {
    status: "submitted-unconfirmed",
    transactionId: txid.toLowerCase(),
    recipient: request.recipient,
    amountTrx: request.amountTrx,
    asset: "TRX",
    network: "TRON Mainnet",
    sponsorAddress: env.SPONSOR_WALLET_ADDRESS,
    idempotencyKey: request.idempotencyKey,
    confirmation: "pending",
    explorerUrl: `https://tronscan.org/#/transaction/${txid.toLowerCase()}`,
    providerReference: typeof result.reference === "string" ? result.reference.slice(0, 160) : undefined
  };
}

export function authorizeSponsorRequest(req, env = process.env) {
  const expected = env.SPONSOR_CLIENT_TOKEN;
  const auth = req.headers.authorization || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return secretMatches(supplied, expected);
}
