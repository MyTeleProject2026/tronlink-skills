# Cross-chain bridge integration plan

## Status

**Design and integration scaffold only. No live bridge is configured, deployed, audited, or enabled by this repository.** Token Studio must not label a transfer as bridged, mint a destination representation, or imply that an asset is backed unless the configured bridge contracts and their on-chain state prove it.

This document describes how to add a legitimate cross-chain flow for multiple independently verified TRC-20 contracts. It is not a deployment authorization or a claim that a bridge already exists.

## Safe flow

1. Maintain a reviewed registry of supported source and destination chains, token contract addresses, decimals, bridge/router contracts, explorer URLs, and confirmation/finality requirements. Each entry needs a chain ID and a verified contract address; a token symbol is never an identifier.
2. Read metadata and balances from the selected chain's RPC using a server-side API key where required. Keep the API key out of browser bundles. Apply per-provider request budgets, cache safe read-only metadata briefly, and retry only idempotent reads after HTTP 429/5xx/network failures with exponential backoff and jitter. Respect `Retry-After`; do not retry a transaction submission automatically.
3. Connect a wallet through a documented provider interface. Ask the wallet to authorize the account; verify the active network and account immediately before building each transaction. Subscribe to account/network changes and invalidate cached contract instances when either changes.
4. Show the exact source chain, token contract, amount, destination chain, destination token contract, recipient, fees, estimated arrival, and bridge provider before the user signs.
5. The source bridge contract must lock/burn the exact approved token amount and emit a unique message/event. A relayer/validator system must verify finality and the source event. The destination contract must verify the message, reject duplicate message IDs, enforce token/chain allowlists and rate limits, and mint/release only the correctly backed representation.
6. Show a source transaction as **submitted** until chain inclusion/finality is verified. Show a destination transfer as **pending** until its transaction is independently verified. Never treat a wallet popup result as final settlement.
7. Provide a recovery path for failed or delayed messages, audited pause/emergency controls, monitoring, and a documented bridge operator / validator trust model.

## Multi-token support

- Use an explicit registry keyed by `(chainId, tokenContract)`, not by symbol or token name.
- Verify token contract bytecode/source and expected decimals. Display the full contract address and link to the chain's explorer.
- Require explicit support for each token on both sides. A token that is not listed must remain unsupported; do not infer bridge compatibility from matching symbols.
- Preserve exact integer base units. Never use JavaScript floating point for token amounts.
- Require per-token limits and global bridge limits. Enforce replay protection and per-message idempotency.
- Treat the canonical token and wrapped representation as different assets. Display the backing and redemption model clearly.

## Rate limits and RPC configuration

- For TronGrid production use, configure `TRONGRID_API_KEY` as a Render secret/environment variable and send it in the `TRON-PRO-API-KEY` header on server-side requests. Use the provider's current quota/plan; limits can change.
- Do not embed a privileged API key in `public/token-studio.html`. Browser-visible keys can be copied by anyone. If browser access is required, use a restricted key with origin/API/contract allowlists, or proxy reads through a rate-limited backend.
- Coalesce duplicate concurrent metadata requests and cache immutable metadata per `chainId + contract`. Do not cache balances for long periods.
- Back off on 429 and transient failures. Do not repeatedly retry invalid-address, ABI, unsupported-chain, or contract-revert errors.
- Keep source-chain and destination-chain RPC configuration separate, with health checks and observable failure metrics.

## Wallet compatibility

Use the documented TRON provider interface or a maintained TRON wallet adapter for multiple wallets. For direct TronLink support, follow the current TronLink DApp docs and TIP-6963 discovery where available. For OKX and Bitget, use their current documented TRON providers or the adapter rather than guessing global variable names.

Never request, store, transmit, or log private keys or seed phrases. Every transaction must be built for the selected chain and approved in the user's wallet. On account/network changes, clear the selected token instance and require the user to re-inspect.

## Launch checklist

- [ ] Source and destination bridge contracts independently audited and verified.
- [ ] Chain/token registry reviewed and addresses checked against authoritative explorers.
- [ ] Message signatures / validator quorum / finality model reviewed.
- [ ] Replay protection, reentrancy protection, mint caps, per-token limits, pause controls and recovery tested.
- [ ] Testnet end-to-end tests cover success, duplicate messages, reorgs, delayed relayers, failed destination execution, wrong chain, wrong token, decimal mismatches and RPC 429.
- [ ] Monitoring, incident response, bridge liquidity/backing reconciliation and upgrade governance documented.
- [ ] User-facing fees, bridge trust assumptions, supported assets and redemption path disclosed.
- [ ] Mainnet deployment explicitly approved and funded by the authorized operator.

Until every required item is complete, Token Studio should remain a token inspection / wallet-approved same-chain transfer tool. Cross-chain transfer controls must be disabled, not simulated as real settlement.
