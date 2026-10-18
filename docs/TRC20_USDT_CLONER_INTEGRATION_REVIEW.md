# TRC-20 Token Cloner Repository Review and Safe Integration

Reviewed upstream repository: https://github.com/MyTeleProject2026/trc20-usdt-token-cloner
Reviewed ref: `main`
Target repository: `MyTeleProject2026/tronlink-skills`

## Decision

Do not bulk-copy the upstream application into this repository. It is a separate React/Vite/Express app with a different entry point and dependency graph. Its deployment and transfer routes read `TRON_PRIVATE_KEY` from the server environment and send it to the Tatum API. Its interface defaults to the name `Tether USD` and ticker `USDT`. Those choices conflict with this project's wallet-controlled signing model and could mislead users into thinking a custom token is official Tether USDT.

Instead, reuse the reviewed feature requirements while keeping this repository's existing TRON API, Token Studio, fixed-supply contract, and deployment safeguards.

## Feature mapping

| Upstream feature | Existing safe implementation |
| --- | --- |
| Wallet connection and wallet-approved transfers | `frontend/src/App.tsx` and `public/token-studio.html` use wallet adapters / injected wallet signing. |
| TRX and TRC-20 balance inspection | Existing frontend and read-only API commands. |
| Token metadata and portfolio watchlist | Token Studio's contract metadata reads and browser-local watchlist. |
| Transaction and contract verification | Existing TRON API and contract deployment/verification guides. |
| Custom token contract | `contracts/CustomTRC20.sol`, with a fixed initial supply and no public mint function. |
| Deployment preparation | `tronbox-config.js`, `migrations/2_deploy_custom_trc20.js`, and `docs/CONTRACT_BUILD_AND_VERIFY.md`. |

## Source files intentionally not imported

- `server/routes/tatum.mjs`: contains server-side deploy and transfer endpoints that accept a private key from `process.env.TRON_PRIVATE_KEY` and pass it to Tatum.
- `server/tatum-client.mjs`, `server/credentials-store.mjs`, `server/credential-guard.mjs`, and `server/index.mjs`: the upstream app's separate server runtime and credential lifecycle are not drop-in modules for this project.
- `src/App.tsx`: its deployment form calls the unsafe upstream endpoint and defaults to `Tether USD` / `USDT`; copying it without redesign would preserve that unsafe path.
- Upstream lockfile and build configuration: these belong to the separate Vite/Express app and would conflict with this repository's current build and dependency lock.

## Token identity and deployment rules

This repository's custom token is not Tether USDT and must not be advertised as such. The contract intentionally rejects the exact ticker `USDT`. The documented configuration is:

- Name: `TRC20`
- Ticker: `VTRC` (or another distinct, reviewed symbol)
- Decimals: `18`
- Initial supply: `1,000,000` whole tokens
- Raw supply: `1000000000000000000000000` base units
- Initial recipient: deploying wallet

The actual token identity is determined by its on-chain contract address, not by a matching name or ticker.

## Signing and secret handling

- Keep private keys and seed phrases inside the user's wallet or a separately controlled signer. Never put them in browser code, Render environment variables, HTTP request bodies, repository files, logs, or chat.
- Token creation should build a transaction for the wallet to review and sign. Any Mainnet deployment must require explicit confirmation of the network, contract source, constructor parameters, initial recipient, and expected network cost.
- Do not claim that a deployment, transfer, sponsor payment, or verification succeeded until a confirmed on-chain transaction and receipt have been checked.
- Test on a TRON testnet before Mainnet. The custom contract is not independently audited.

## Verification checklist before any future deployment UI is enabled

1. Compile the exact reviewed `CustomTRC20.sol` source with the pinned compiler settings.
2. Ensure the deployment transaction is constructed client-side and signed only by the selected wallet; no backend receives a private key.
3. Verify the constructor rejects `USDT`, limits decimals to 0–18, and mints the fixed supply once to the deployer.
4. Add tests for malformed addresses, network mismatch, amount scaling, wallet cancellation, rejected signing, broadcast failure, and confirmation polling.
5. Deploy on testnet, inspect the contract metadata and supply, and confirm a small transfer on-chain.
6. Keep Mainnet deployment disabled until the full wallet-signing path and transaction confirmation have been tested end-to-end.

This review documents a safe integration boundary. It does not claim that all upstream files were copied or that a new deployment interface has been completed.
