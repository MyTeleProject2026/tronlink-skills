# TRX sponsor funding and ownership guide

## Who owns the sponsor funds?

TRX used for a sponsored payout belongs to the person or organization controlling the funded sponsor account, subject to any custody/provider contract. A sponsorship API does not create free TRX. The sponsor must supply the actual TRX principal sent to recipients and cover the transaction's network costs.

For this project, keep the sponsor treasury separate from personal wallets and keep signing credentials outside GitHub and client applications.

## Funding models

1. **Self-funded treasury:** The project operator funds a dedicated TRON Mainnet wallet and pays eligible payouts. This is the most direct model, but it is not free.
2. **Commercial provider:** Contract with a provider that explicitly agrees to send native TRX principal plus network costs. Obtain its real API documentation, pricing, limits, terms, settlement semantics, refund rules, and support contacts. Do not infer that Energy or fee sponsorship includes the principal.
3. **Grant or business partnership:** Submit a project proposal to relevant ecosystem programs, wallet companies, exchanges, or other partners. Grants and sponsorships are discretionary and not guaranteed.
4. **User-funded transaction:** If no sponsor is available, let the user send TRX from their own TronLink wallet with clear confirmation of the amount and fee. This is not sponsored payout.

## Provider due-diligence checklist

Before setting provider credentials in Render, get written confirmation that:
- TRON Mainnet native TRX transfers are supported.
- The provider funds the exact requested TRX amount to the recipient.
- The provider also covers the network transaction fee.
- The API is real and documented; its base URL, authentication, request/response schema, idempotency, limits, and error semantics are known.
- The provider's sponsor address can be independently verified on TRON Mainnet.
- Daily and per-transfer limits, risk checks, account funding, and incident support are defined.
- A small controlled transfer can be tested and confirmed using a solidified TRON transaction.

The adapter currently in `scripts/sponsor_service.mjs` uses a generic contract as a placeholder. It is not evidence that a vendor supports that endpoint. A vendor-specific implementation may be required.

## Current project safeguards and status

- Per-transfer maximum: 100 TRX.
- Recipient address checksum and amount precision are validated.
- Payout and confirmation routes require a server-side bearer token.
- Confirmation checks the solidified TRON transaction against sponsor, recipient, and amount.
- The feature remains disabled unless the required Render environment variables are configured.
- Configuration alone is not proof of funding or successful payout.
- The in-process rate limiter is not a durable financial quota. Before public frontend exposure, add user authentication, persistent idempotency and payout ledger storage, per-user/day budgets, bot controls, and provider-side spend caps.

## Never do this

- Never commit private keys, seed phrases, provider API keys, or the client token.
- Never ship the client token in browser JavaScript or a mobile app bundle.
- Never pay out automatically based only on a provider's "submitted" response.
- Never retry an uncertain payout with a new idempotency key before checking the original request and transaction.
- Never advertise free sponsored TRX until the sponsor has agreed to fund it and real Mainnet settlement has been verified.
