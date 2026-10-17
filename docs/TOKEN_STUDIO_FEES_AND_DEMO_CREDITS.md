# Token Studio fees, balances, and demo credits

## What the current Token Studio supports

- Connect to a supported TRON wallet provider and inspect an arbitrary TRC-20 contract address on the wallet's active TRON network.
- Read the selected contract's name, symbol, decimals, total supply, and the selected account's token balance.
- Read the connected account's native TRX balance to help users understand whether they may have a fee-paying asset.
- Request a same-network TRC-20 transfer through the wallet, where the user reviews and signs it.
- Display simulated local demo credits separately from on-chain balances.

The generic contract field means the UI can inspect many TRC-20 tokens. It does not mean every token contract is trustworthy, that every network is supported, or that matching symbols identify the same asset. Check the chain, full contract address, decimals, and explorer source before sending.

## Can Mainnet transfers be free?

Not automatically. TRON transactions consume Bandwidth and smart-contract calls such as TRC-20 transfers consume Energy. If available free Bandwidth, staked resources, delegated resources, or contract-deployer sponsorship are insufficient, the network can burn TRX. The current wallet balance display is informational; it is not a fee quote or guarantee that a transaction will succeed.

Official references:

- TRON resource model: https://developers.tron.network/docs/bandwidth-and-energy
- Paying for resources and Energy sharing: https://developers.tron.network/docs/paying-for-resources
- TronLink transfer and signing flow: https://docs.tronlink.org/dapp/transfer/

A real fee-sponsorship integration must identify who pays, which contracts and methods are eligible, what limits apply, and what happens when the sponsor has insufficient resources. Never send users to an unverified "free USDT" site or ask for seed phrases/private keys. This repository does not claim a general-purpose Mainnet gas sponsor is connected.

## Free test transactions

For development, use a dedicated wallet on Shasta or Nile and request test TRX / test TRC-20 assets from the faucet linked by the official TRON documentation:

- https://developers.tron.network/docs/getting-testnet-tokens-on-tron
- Shasta API: https://api.shasta.trongrid.io
- Nile API: https://nile.trongrid.io

Testnet tokens have no real-world value. Keep testnet and Mainnet assets clearly separated. Never import a Mainnet seed phrase into test tooling.

## Demo credits

The Demo credits page is a local simulation for UI testing. Its balance is not stored on a blockchain, is not backed by a token contract, and cannot be transferred, redeemed, deposited, or withdrawn. It must not generate fabricated transaction hashes or show demo amounts as real wallet assets.

## Future sponsored-transfer requirements

Before enabling any sponsored Mainnet flow, require a named provider or an operator-controlled resource pool, written terms, supported contract allowlists, spending limits, abuse controls, transaction simulation, on-chain confirmation checks, monitoring, and an emergency disable path. Testnet success is not proof that Mainnet fees will be covered.

## Multi-token portfolio and network scope

Token Studio's local watchlist supports up to 50 user-added TRC-20 contract addresses. Use Inspect token, Add inspected token, then Refresh all balances. It reads each saved token's symbol(), decimals(), and balanceOf() from the currently selected wallet provider. The list is stored in browser local storage only; it does not store wallet secrets or automatically discover every token held by an account. Saved entries are scoped to the RPC/network endpoint recorded when added to reduce accidental cross-network balance confusion.

This app's transfer implementation is TRON/TRC-20 only. It cannot transfer ERC-20 assets on Ethereum, Arbitrum, BNB Chain, Solana SPL tokens, or other networks through the TRON wallet provider. Those need separate chain-specific wallet adapters, token ABIs, chain-ID checks, explorers, transaction confirmation logic, and audits. A cross-chain bridge is not the same thing as sending a token on its own network.

The send action checks that the inspected contract still matches the contract field before submitting, so changing the contract field cannot silently leave the prior contract selected for sending. Users must still verify the token contract, recipient, and network in their wallet confirmation.

