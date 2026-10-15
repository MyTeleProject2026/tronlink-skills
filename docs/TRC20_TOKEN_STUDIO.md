# Custom TRC-20 token workflow

This repository now includes a simple fixed-supply token contract and a TronLink-connected token transfer page.

## Files

- `contracts/CustomTRC20.sol`: a standard fixed-supply token contract with `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, and `transferFrom`.
- `public/token-studio.html`: reads metadata/balances and submits token transfers through the user's connected TronLink wallet. It never asks for a seed phrase or private key.
- `https://tronlink-skills-api.onrender.com/token-studio`: served by the Render API once the HTTP route is deployed.

## Important token design details

- Token name and symbol are constructor parameters and may match a name/symbol used by another token. Symbols are not unique identifiers. Always identify a token by its deployed contract address and never imply that a custom token is official USDT or another third-party asset.
- The contract mints the entire initial supply to the deploying wallet once. There is no later mint function or arbitrary balance-edit function.
- `initialWholeTokenSupply` is the number of whole tokens. The contract multiplies it by `10 ** decimals`. Choose decimals from 0 through 18 and test with a small supply first.
- This contract is a minimal implementation for learning and review, not an audited financial product. Review and test it before any Mainnet deployment.

## Deploy the contract

1. Open the official TRON smart-contract guide: https://developers.tron.network/docs/smart-contract-development
2. Use TRON's official TronIDE or a locally controlled TronBox/TronWeb development setup.
3. Compile `contracts/CustomTRC20.sol` with Solidity 0.8.20 or a compatible compiler, keeping the compiler settings and ABI/bytecode from the compilation output.
4. Deploy to Shasta or Nile testnet first. Constructor parameters are:
   - `tokenName`: your chosen public token name
   - `tokenSymbol`: your chosen ticker
   - `tokenDecimals`: 6 or 18 are common choices; decide before deployment
   - `initialWholeTokenSupply`: positive integer number of whole tokens
5. Approve the deployment in your own wallet and keep enough testnet TRX for network resources. Deployment is a real on-chain transaction and costs resources.
6. Copy the resulting contract address and confirm its name, symbol, decimals, total supply, and deployer balance on the testnet explorer.
7. Only after testing, decide whether to deploy to Mainnet. Mainnet deployment costs real TRX and cannot be undone.

## Transfer tokens

1. Open `/token-studio` using the TronLink browser extension or TronLink mobile in-app browser.
2. Connect the wallet and ensure it is on the same network as the deployed contract.
3. Paste the contract address, load metadata, and inspect the balance.
4. Enter the recipient address and amount. Verify both the contract and recipient, then approve the transaction in TronLink.
5. Wait for chain confirmation and verify the transaction on TRONSCAN.

The transfer page does not hold keys. Signing and authorization happen in TronLink. Do not add private keys or seed phrases to Render environment variables or HTTP requests.

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
