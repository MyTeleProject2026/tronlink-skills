# Multi-chain wallet and asset support matrix

This document distinguishes working integrations from planned work. A network appearing in a demo ledger is not evidence of a live wallet integration.

## Live capability boundaries

| Network / asset | Read balance | Wallet-signed transfer | Cross-chain execution | Status |
|---|---|---|---|---|
| TRON Mainnet native TRX | Yes, through the connected wallet's TRON provider | Wallet-approved TRX transfer support depends on the connected wallet/provider path | No | Implemented in Token Studio |
| TRON Mainnet TRC-20 | Yes, for a contract implementing the expected TRC-20 interface | Yes, after explicit wallet approval | No | Implemented in Token Studio |
| TRON Shasta / Nile | Depends on the wallet's selected endpoint and available test tokens | Testnet use only; verify the selected network before signing | No | Wallet/network dependent |
| Ethereum | Not implemented as a live Token Studio wallet integration | Not implemented | No | Planned |
| BNB Smart Chain | Not implemented as a live Token Studio wallet integration | Not implemented | No | Planned |
| Polygon | Not implemented as a live Token Studio wallet integration | Not implemented | No | Planned |
| Arbitrum One | Asset reference is displayed for the documented provider handoff; live wallet balance and transfers are not implemented in Token Studio | Not implemented in Token Studio | Provider handoff only; no in-app bridge execution or settlement verification | Partial, external provider handoff |
| Solana | Not implemented as a live Token Studio wallet integration | Not implemented | No | Planned |

## Asset identity and exchange deposits

A token's name and symbol are not unique identifiers. Always identify an asset by its network and contract or mint address. A custom TRC-20 named `TRC20` with symbol `VTRC` is a separate asset, not Tether USDT.

A transfer being visible in a wallet or explorer does not guarantee an exchange deposit will be credited. The receiving service must explicitly support the exact asset and network, the deposit address and memo/tag requirements (if any) must be correct, and its confirmation policy must be satisfied. Never send a test amount to an exchange unless the exchange's current deposit page explicitly lists that network and contract.

## Safe implementation rules for additional networks

Before marking a network as supported, implementation and tests must cover all of the following:

1. Explicit chain identity from the wallet provider, with a clear mismatch warning before any signature request.
2. Read-only balance retrieval from a chain-appropriate RPC or explorer API, with validated addresses and correct token decimals.
3. Transfer construction using the selected wallet provider only. The user must review recipient, network, asset contract, amount, and estimated fee before signing.
4. Transaction hash capture followed by independent chain-specific receipt/confirmation polling. A wallet prompt or submitted hash alone is not confirmation.
5. Tests for rejected signatures, wrong networks, RPC failures/rate limits, malformed addresses, token decimal edge cases, and pending/reverted transactions.
6. No private key or seed phrase collection or server-side storage.
7. No fabricated balance, transaction hash, receipt, bridge status, or exchange-credit claim.

## Current demo routes

- `/multichain-demo` is a local browser simulation only. It does not query blockchains or move funds.
- `/demo-funds` is a local demonstration ledger only.
- `/token-studio` is the real TRON wallet/token interaction page, subject to the provider and network limitations described above.
- `/bridge-status` is a read-only provider-explorer handoff, not independent bridge settlement verification.

These routes must retain visible disclosures so demonstration data cannot be mistaken for real assets.
