# Custom TRC-20 token workflow

This repository includes a fixed-supply token contract and a Token Studio page with a wallet selector for supported non-TronLink TRON providers (OKX Wallet, Bitget Wallet, and TokenPocket where their TRON provider is exposed). Provider support depends on the wallet version and browser context; the integration is not guaranteed to work in every wallet environment.

## Sponsored Mainnet deployment\n\nFor a sponsor-funded Mainnet workflow, source/constructor manifest, recipient ownership warning, wallet signing boundaries, and TRONSCAN verification checklist, see [`SPONSORED_MAINNET_DEPLOYMENT.md`](./SPONSORED_MAINNET_DEPLOYMENT.md). Mainnet deployment remains blocked operationally until a sponsor agrees to fund the transaction or resources.\n\n## Demo sender/receiver simulator

The `/demo-funds` page is a separate local-only UI sandbox. It allows a developer to add DEMO credits to a sample sender and simulate transfers to a receiver address label. The ledger is stored in the current browser local storage only. It does not connect to a wallet, invoke a contract, create a transaction ID, change an on-chain balance, or represent USDT. Demo data must never be described to a wallet user or exchange as real funds.

## Files

- `contracts/CustomTRC20.sol`: a standard fixed-supply token contract with `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, and `transferFrom`.
- `public/token-studio.html`: reads metadata/balances and requests transfers through a selected wallet's injected TRON provider.
- `public/demo-funds.html`: clearly labelled local-only demo credits and sender-to-receiver simulator. It never asks for a seed phrase or private key. It does not deploy contracts.
- `https://tronlink-skills-api.onrender.com/token-studio`: served by the Render API once the HTTP route is deployed.

## Important token design details

- Token name and symbol are not unique identifiers. This project rejects the exact `USDT` symbol in the constructor so a custom token is not confused with Tether USD. Use a distinct symbol such as `VTRC` or `TRC20`. The official TRON Mainnet USDT contract is `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`; this custom token is not affiliated with Tether.
- The contract mints the entire initial supply to the deploying wallet once. There is no later mint function or arbitrary balance-edit function.
- `initialWholeTokenSupply` is the number of whole tokens. The contract multiplies it by `10 ** decimals`. Choose decimals from 0 through 18 and test with a small supply first.
- This contract is a minimal implementation for learning and review, not an audited financial product. Review and test it before any Mainnet deployment.

## Deploy the contract

1. Open the official TRON smart-contract guide: https://developers.tron.network/docs/smart-contract-development
2. Use TRON's official TronIDE or a locally controlled TronBox/TronWeb development setup.
3. Compile `contracts/CustomTRC20.sol` with Solidity 0.8.20 or a compatible compiler, keeping the compiler settings and ABI/bytecode from the compilation output.
4. A testnet deployment is recommended before Mainnet, but this repository does not deploy automatically to any network. For the requested direct-Mainnet path, use Mainnet only after the sponsor has reviewed the exact source commit, approved the recipient and constructor values, and confirmed funding. The Mainnet migration requires explicit environment confirmations. Constructor parameters are:
   - `tokenName`: your chosen public token name
   - `tokenSymbol`: a distinct ticker such as `VTRC` or `TRC20` (the exact symbol `USDT` is rejected)
   - `tokenDecimals`: `18`
   - `initialWholeTokenSupply`: `1000000` (one million whole tokens)
5. For this project's current zero-personal-cost goal, do not submit a Mainnet deployment until a willing sponsor has agreed to pay or delegate resources. A non-TronLink wallet does not remove network costs. This repository's Token Studio currently does not deploy contracts; use a separate deployment interface and have the funded signer approve the transaction. Keep signing outside Render.
6. Copy the resulting contract address and confirm its name, symbol, decimals, total supply, and deployer balance on the selected network's explorer. Confirm the raw total supply is `1000000000000000000000000` and the UI formats it as `1000000` tokens at 18 decimals.
7. The requested configuration is `tokenName = TRC20`, `tokenDecimals = 18`, and `initialWholeTokenSupply = 1000000`. The raw total supply is `1000000000000000000000000` base units (1e24), assigned entirely to the deployer. The requested `USDT` ticker remains blocked by the contract safeguard; use a distinct ticker such as `VTRC` or `TRC20`. Deploy to Mainnet only after testnet validation; Mainnet deployment costs real TRX and cannot be undone.

## Transfer and verify tokens

1. Open `/token-studio` in the selected wallet's supported browser or a browser where its TRON provider is injected. Select OKX Wallet, Bitget Wallet, or TokenPocket. If the selected provider is unavailable, use that wallet's official DApp browser or supported extension; the page intentionally does not fall back to TronLink.
2. Connect the wallet and ensure it is on the same network as the deployed contract.
3. Paste the contract address, load metadata, and inspect the deployer balance. Check name `TRC20`, the distinct ticker you deployed, decimals `18`, and total supply `1000000`.
4. On the first test, send a small amount (for example, `0.1`) to a second address you control. Verify the recipient address and contract address carefully, then approve the transaction in TronLink.
5. Wait for confirmation and open the transaction ID on [TRONSCAN](https://tronscan.org/). Confirm success status and a `Transfer` event with the expected sender, recipient, and raw amount. At 18 decimals, `0.1` token is `100000000000000000` base units.
6. Refresh Token Studio and confirm the sender balance decreased by the transfer amount and the recipient balance increased by the same amount. Account for any other transactions separately.
7. Verify the deployed source on [TRONSCAN Contract Verification](https://tronscan.org/#/contracts/verify) using the exact compiler version, optimization setting, and runs from the deployment build. Verification compares source and deployed bytecode; it does not certify the token as safe or affiliated with another issuer.

The current wallet selector uses wallet-specific injected providers rather than the official unified TronWallet Adapter SDK. It is an initial integration and still requires end-to-end testing with each supported wallet/version. The transfer page does not hold keys. Signing and authorization happen in the selected wallet. Never add private keys or seed phrases to Render environment variables, source code, logs, or HTTP requests. This page does not yet implement a deployment transaction or sponsored deployment flow.

## API scope

The existing `POST /api/command` endpoint remains read-only. It does not accept private keys and does not sign or broadcast transactions. Token transfers are initiated by the wallet page after explicit user approval. Read-only balance queries can use the deployed token's contract address via the existing `token-balance` command.

## Example read-only API request

```bash
curl -X POST https://tronlink-skills-api.onrender.com/api/command \
  -H 'Content-Type: application/json' \
  -d '{
    "command": "token-balance",
    "args": {
      "address": "YOUR_PUBLIC_TRON_ADDRESS",
      "contract": "YOUR_DEPLOYED_TOKEN_CONTRACT"
    }
  }'
```

Replace both placeholders with public addresses. Never put a private key or seed phrase in this request.
