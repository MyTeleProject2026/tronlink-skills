# TRON DApp Quickstart Adoption Review

Reviewed: 2026-10-17

Upstream reference: https://github.com/tronweb3/tron-dapp-quickstart
Upstream license: MIT
Upstream stack: React 19, TypeScript, Vite, TronWeb 6.0.4, and TronWalletAdapter.

## Decision

Use the quickstart as a **wallet integration and transaction-flow reference**, not as a blind replacement for this repository. The current Token Studio is a lightweight HTML/JavaScript page served by the existing Node service; the quickstart is a separate React/Vite application. Copying its package.json or replacing the current app entry point would change the build/runtime architecture and could break the existing API, contract checks, demo-only page, and Render routes.

## Useful upstream patterns

The upstream README documents:
- Wallet connection/signing through TronWalletAdapter.
- TRX transfer build → wallet signature → broadcast.
- TRC-20 transfer through `tronWeb.transactionBuilder.triggerSmartContract`.
- TRX balance queries and Stake 2.0 delegation examples.
- React hooks/UI for selecting and connecting wallets.
- MIT licensing.

Primary source files to review when porting:
- `src/App.tsx`: adapter/provider setup.
- `src/components/Transfer/components/TransferTRX.tsx`: TRX transfer flow.
- `src/components/Transfer/components/TransferTRC20.tsx`: TRC-20 transfer flow.
- `src/components/Delegate/Delegate.tsx`: account/resource delegation example.
- `package.json`: pinned dependencies and Vite scripts.

Upstream repository and examples can change; re-check the actual source and lockfile before adopting specific APIs.

## Integration plan for this project

1. Preserve the existing Node service and its routes, including `/token-studio`, `/demo-funds`, `/bridge-status`, and API endpoints.
2. Port the wallet-adapter patterns into Token Studio deliberately. If using the React hooks/UI packages, build a separate Vite frontend artifact and mount/serve it without removing the existing Node API. Do not mix React-only hooks directly into the current inline browser script.
3. Keep wallet signing client-side. Never ask for, transmit, or store a seed phrase or private key on Render. A transfer must be explicitly approved in the connected wallet.
4. Verify the selected wallet's network and the token contract address before balance reads or signing. Treat wallet/account/network changes as invalidating stale form state.
5. For TRC-20 transfers, validate the destination address and positive token amount, derive raw integer units using the contract's decimals, estimate/report resource costs where possible, request the wallet signature, broadcast, then verify the transaction receipt/result and on-chain confirmation. A transaction hash alone is not proof of successful token delivery.
6. Keep token watchlists local unless the user explicitly opts into a server-backed profile. Never present demo credits as on-chain balances.
7. Keep cross-chain execution disabled until a named bridge integration is reviewed against its official SDK, supported assets, contract requirements, source/destination finality, replay protection, and settlement verification.
8. Add automated build, lint, and test checks before enabling the new frontend in production. Confirm the Render build command and publish/serve path match the selected architecture.

## What the quickstart does not provide by itself

Cloning and running `npm install` / `npm run dev` does not automatically implement this project's portfolio, token contract studio, API, transaction-history crawler, bridge integration, production configuration, Android packaging, or Render deployment. Those require separate implementation and tests.

## Acceptance checklist

- [ ] Wallet connect/disconnect and account/network change handling tested on desktop and mobile wallet browsers.
- [ ] Native TRX and TRC-20 balances verified against the active network.
- [ ] TRX and TRC-20 transfers tested on a testnet first.
- [ ] Wrong-network and stale-token submission are blocked.
- [ ] Wallet rejection, RPC failure, insufficient resources, and failed receipts produce clear errors.
- [ ] No private keys or seed phrases enter application/server logs or storage.
- [ ] `npm test`, production build, and relevant CI checks pass.
- [ ] Render deploy reaches `live` and production routes are smoke-tested.
- [ ] Cross-chain controls remain disabled unless the bridge is fully integrated and verified.
