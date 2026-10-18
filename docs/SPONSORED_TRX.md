# Sponsored TRX payouts (TRON Mainnet)

## Status

This is a fail-closed integration adapter, not a claim that a sponsor provider is connected or funded. It remains disabled until the owner configures the required Render environment variables and selects a provider whose contract explicitly covers **both the native TRX payout amount and the network fee**.

The repository does not currently identify a provider with a verified, published API contract for arbitrary sponsored native-TRX payouts. Fee sponsorship / Energy delegation alone does not fund the TRX sent to a receiver. A vendor-specific adapter may be needed after the provider is selected.

## Provider adapter contract

The current adapter expects:

- `POST {SPONSOR_PROVIDER_URL}/v1/transfers`
- HTTPS only
- `Authorization: Bearer {SPONSOR_PROVIDER_API_KEY}`
- JSON body: `network: "tron-mainnet"`, `asset: "TRX"`, `recipient`, `amountTrx`, `idempotencyKey`, `requireSponsorPaysNetworkFee: true`, and `sponsorAddress`
- A JSON response containing a 64-hex-character `transactionId` (or `txid` / `txID`)

This is an adapter contract for a provider, not an assertion that a particular provider implements it. Confirm the provider's real API documentation, authentication, funding, limits, refund behavior, and fee responsibility before connecting it. Never point it at an untrusted endpoint.

## Render environment variables

Configure privately in the Render service dashboard. Never commit values to GitHub or expose them to browser JavaScript.

- `SPONSOR_PROVIDER_URL`: provider's HTTPS API origin
- `SPONSOR_PROVIDER_API_KEY`: provider API credential
- `SPONSOR_CLIENT_TOKEN`: long random bearer token for trusted server-to-server callers only
- `SPONSOR_WALLET_ADDRESS`: provider's sponsor payout address on TRON Mainnet
- `TRONGRID_API_KEY`: optional TronGrid key for solidified transaction queries
- `TRON_SOLIDITY_NODE_URL`: optional solidity-node HTTP origin; defaults to `https://api.trongrid.io`

Do not put `SPONSOR_CLIENT_TOKEN` in the public Token Studio page or a mobile app bundle. The transfer and confirmation endpoints are intended for authenticated server-to-server calls. A public web/mobile frontend needs a separate authenticated backend session and abuse policy before it can call these endpoints safely.

## API

Public status (reveals configuration state only):

```http
GET /api/sponsor/status
```

Authenticated payout request:

```http
POST /api/sponsor/transfer
Authorization: Bearer <SPONSOR_CLIENT_TOKEN>
Content-Type: application/json

{
  "recipient": "T...",
  "amountTrx": "10",
  "idempotencyKey": "client-generated-unique-key-0001"
}
```

The amount must be positive and no more than 100 TRX, with up to 6 decimal places. A successful provider response is returned as `submitted-unconfirmed`, not as confirmed payment.

Authenticated confirmation check:

```http
POST /api/sponsor/confirm
Authorization: Bearer <SPONSOR_CLIENT_TOKEN>
Content-Type: application/json

{
  "transactionId": "<64-hex-character-transaction-id>",
  "recipient": "T...",
  "amountTrx": "10"
}
```

Confirmation queries the TRON solidity-node transaction body and checks that the transaction is a native `TransferContract` from the configured sponsor address to the exact recipient for the exact amount. Only a matching solidified transaction is reported as `confirmed`. A pending response is not success. A mismatch must be investigated; never automatically issue another transfer.

## Security / production checklist

- Keep the provider API key and client token server-side only.
- Use provider-side spending limits, daily budget caps, velocity limits, fraud screening, and idempotency. The in-process IP rate limiter is only an extra layer and resets on service restarts; it is not a financial quota.
- Do not expose the authenticated endpoints directly to an unauthenticated public app. Add user authentication, per-user quotas, anti-bot controls, and persistent idempotency/ledger storage first.
- Test against provider sandbox/testnet first, then use a small controlled Mainnet transfer.
- Verify the sponsor address and the recipient/amount against solidified TRON transaction data before marking a payout successful.
- A provider that only delegates Energy/Bandwidth or pays fees does not meet the full-payout requirement.
- Do not store or request a user's private key or seed phrase.
