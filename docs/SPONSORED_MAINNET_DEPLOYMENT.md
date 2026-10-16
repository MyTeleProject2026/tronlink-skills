# Sponsored TRON Mainnet deployment runbook

This runbook prepares a sponsor-funded Mainnet deployment of `CustomTRC20` without TronLink as a requirement and without putting private keys in Render. It is a procedure, not evidence that a contract has been deployed.

## Non-negotiable constraints

- Mainnet deployment is an on-chain transaction and requires Energy/Bandwidth or TRX to cover resource shortfalls. A different wallet does not remove those costs.
- Because no sponsor has been arranged yet, do not broadcast a deployment transaction until a sponsor explicitly agrees to fund it.
- The sponsor signs with a TRON-compatible wallet or a separately secured signing service. Render must never receive the sponsor's private key or seed phrase.
- Source verification on TRONSCAN occurs only after successful deployment. It does not deploy the contract or pay deployment costs.
- The constructor currently mints the complete initial supply to `msg.sender`. If the sponsor deploys this exact source, the sponsor receives all initial tokens. If the intended owner must be a different address, change the reviewed contract to accept an explicit initial-recipient constructor argument, test it, and verify that exact source before any deployment. Do not assume the tokens will go to the project owner automatically.

## Intended token configuration

- Name: `TRC20`
- Symbol: `VTRC` (the contract intentionally rejects the exact `USDT` symbol)
- Decimals: `18`
- Initial whole-token supply: `1000000`
- Raw total supply: `1000000000000000000000000` (`10^24` base units)
- Target network: TRON Mainnet

## Workflow

1. **Freeze the source revision.** Select the exact Git commit to deploy. Save the source file, flattened source (if used), ABI, creation bytecode, compiler version, optimization enabled/disabled, and optimization runs.
2. **Run local validation.** Compile using the pinned compiler. Run automated tests for constructor bounds, initial supply, decimals, transfers, approvals, allowances, zero-address rejections, and the blocked `USDT` symbol. Check the raw supply calculation for 1,000,000 tokens at 18 decimals.
3. **Prepare a deployment manifest.** Record the source commit, source SHA-256, compiler settings, constructor arguments, intended recipient, deployer/sponsor address, target network, and current fee/resource estimate. Treat the manifest as a review artifact, not an authorization.
4. **Get sponsor approval.** Send the sponsor the source commit, constructor values, expected resource/fee estimate, and intended token recipient. The sponsor must independently inspect the contract and approve the exact deployment. If using resource delegation instead of sponsor deployment, verify the deploying account still has enough resources to complete the transaction.
5. **Deploy outside Render.** Use a supported TRON deployment tool and a non-TronLink wallet supported by that tool (for example, OKX Wallet, Bitget Wallet, or TokenPocket, subject to the tool/browser integration). The wallet must show the target Mainnet, deployer account, constructor arguments, and expected cost before the sponsor confirms.
6. **Confirm the receipt.** Record the transaction ID and contract address only after the transaction succeeds. Confirm deployed bytecode exists and query `name`, `symbol`, `decimals`, `totalSupply`, and `balanceOf` for the intended recipient. Stop if the deployer/recipient is not what was approved.
7. **Verify source.** Open [TRONSCAN contract verification](https://tronscan.org/contracts/verify), select Mainnet, and submit the exact source and exact compiler/optimizer settings used for deployment. If deploying flattened source, submit that exact flattened file. Verification failure is a reason to compare build settings and source; do not edit the deployed source and claim it matches.
8. **Verify a small transfer.** After reviewing token ownership and resources, send a small amount from the intended token holder. Confirm transaction success, the `Transfer` event, and both balance changes.
9. **Publish deployment facts.** Publish the Mainnet contract address, transaction ID, source commit, verified-source link, token parameters, and a clear statement that this is an independent custom token and not Tether USDT.

## Wallet and application architecture

- Token Studio may connect to supported injected TRON wallet providers. Provider support varies by wallet version and browser context; verify the actual wallet connection and signing flow before relying on it.
- Token Studio currently reads deployed token metadata/balances and initiates wallet-approved transfers. It does **not** deploy contracts or automatically sponsor deployment.
- Keep Render API endpoints read-only for public blockchain queries. Do not add a private-key field, seed phrase field, server-side signer secret, or unauthenticated endpoint that can spend sponsor funds.
- If a future sponsor service is built, isolate it from the public API, require explicit per-transaction approval, enforce allow-listed source revisions/constructor parameters and spending limits, and use an external key-management/signing service. Never store raw private keys in application source, logs, or ordinary Render environment variables.

## Cost statement

The project owner can avoid paying personally only if a sponsor voluntarily pays the Mainnet deployment costs or supplies sufficient resources and covers any shortfall. This is not a protocol-level zero-fee deployment. If no sponsor is available, the safe action is to stop before broadcasting.
