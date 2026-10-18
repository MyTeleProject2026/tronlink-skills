# VexaTrade / TronLink Skills — TRON Mainnet Sponsored TRX Funding Proposal

## Executive summary

We are developing a controlled TRON Mainnet payout capability for VexaTrade and related applications. The goal is to sponsor eligible users' native TRX transfers, with the sponsor covering both the exact TRX principal delivered to each recipient and the network transaction cost.

The initial per-transfer ceiling is 100 TRX. Sponsorship is not advertised as available until funding is committed, provider integration is verified, and a controlled Mainnet payout is confirmed on-chain.

Repository: https://github.com/MyTeleProject2026/tronlink-skills

## What we are requesting

We are seeking either:

1. A grant or ecosystem partnership to seed a dedicated, capped TRX sponsorship treasury; or
2. A provider partnership with a documented API that explicitly funds both native TRX payout principal and network fees.

We are not requesting that a partner provide only Energy or Bandwidth delegation. Those services do not pay the TRX principal delivered to a recipient.

## Proposed use

- Support eligible users of VexaTrade and related applications.
- Start with an allowlisted pilot and a 100 TRX maximum per transfer.
- Apply per-user limits, daily budget ceilings, abuse screening, and duplicate-request protection.
- Keep provider credentials and signing credentials server-side, outside source control and client bundles.
- Verify successful settlement using a solidified TRON transaction and match the sponsor, recipient, amount, and successful result.
- Publish transparent eligibility rules and a clear disclosure that sponsorship depends on available budget and partner terms.

## Security and operational controls

The implementation has a fail-closed provider adapter, input validation, recipient address checksum verification, server-to-server bearer authorization, rate limiting, idempotency forwarding, and solidified transaction verification.

Before public production use, we will also require persistent idempotency and payout-ledger storage, authenticated application users, per-user and per-day quotas, provider-side spend limits, monitoring and alerting, a tested reconciliation process, and a documented incident/rollback procedure. The current in-process rate limiter is only a secondary control and is not a persistent financial quota.

## Pilot and reporting plan

1. Confirm provider/grant terms, supported jurisdiction, sponsor ownership, and exact fee responsibility.
2. Run provider sandbox or testnet checks where available.
3. Configure secrets privately in the hosting provider's secret store.
4. Perform a small, controlled Mainnet payout with explicit authorization.
5. Verify the transaction from a solidified TRON node and independently review the transaction in TRONSCAN.
6. Reconcile the sponsor ledger and provider statement before expanding the pilot.
7. Report aggregate usage, confirmed payouts, remaining budget, failure rate, and abuse metrics without exposing user secrets.

## Funding budget

Funding amount is to be agreed with the sponsor after the pilot volume and eligibility rules are reviewed. The budget should separate:
- TRX principal delivered to recipients;
- network fees and any provider charges;
- monitoring, compliance, and operational costs;
- an explicit reserve and a hard stop threshold.

We will not imply that grant funding or a third-party sponsor has been approved until a written agreement and actual funding are confirmed.

## Current status

The code adapter is present, but no provider has been selected and verified, no sponsor treasury is confirmed funded, and no real sponsored Mainnet payout has been confirmed. The feature must remain disabled until those conditions are met.

## Contact / next steps

A prospective sponsor should provide:
- legal entity and official website;
- API documentation and support contact;
- written confirmation that both TRX principal and network costs are paid by the sponsor;
- limits, pricing, funding and refund rules, idempotency semantics, and supported jurisdictions;
- test environment and Mainnet verification procedure.
