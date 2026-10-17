# Meson SDK review for Token Studio

**Review status: SDK identified; native bridge execution remains disabled.**

## Official SDK found

Meson Finance publishes the [MesonFi/meson-to](https://github.com/MesonFi/meson-to) repository and the `@mesonfi/to` package. Its documented integration opens a Meson-powered popup from a frontend. The repository README describes this as a cross-chain stablecoin deposit into an integrating application's smart contract, not as a generic embedded wallet-to-wallet bridge API.

Official references:
- SDK source and integration guide: https://github.com/MesonFi/meson-to
- Meson developer documentation: https://meson.dev/
- Meson supported stablecoins: https://docs.meson.fi/references/supported-stablecoins
- Meson user guide: https://docs.meson.fi/guides/meson
- Meson Explorer: https://explorer.meson.fi/

## Why this is not yet a safe drop-in replacement

The published `meson-to` README says the destination app contract must implement `depositWithBeneficiary(address token, uint256 amount, address beneficiary, uint64 data)`. It also says an integrating app must submit its app ID, URL, icon/logo, deployed contract information, and a description for Meson review/registration. Therefore, installing the package or opening its demo app ID does not establish that this repository is registered or that the intended TRON USDT → Arbitrum USDT user-to-user route is enabled.

Before any native integration is enabled, confirm directly with Meson:
1. Whether `@mesonfi/to` is approved for this exact production origin and app ID.
2. Whether the intended source and destination tokens and direction are currently supported for the app's intended flow.
3. The current SDK release/version, integrity and dependency review, wallet/provider requirements, and documented completion/error callbacks.
4. Whether an application contract is required for the intended use case and, if so, its reviewed source, deployment, verification, ownership, and recovery behavior.
5. How the app should independently verify source submission, destination settlement, refunds, and delayed or failed swaps.

Do not assume that the SDK's `onCompleted` callback alone is proof of destination-chain finality. Cross-check the documented event data against the provider's official explorer and destination-chain explorer.

## Safe current behavior

- Keep the existing official Meson website handoff and read-only Explorer lookup.
- Keep in-app bridge execution disabled until the provider confirms the correct integration path and a testnet-to-mainnet verification plan is complete.
- Never ask users for seed phrases/private keys. Wallets must perform signing.
- Never display a swap as confirmed based only on a popup closing, a button click, or a local status string.
- Do not use a demo app ID as a production integration, hard-code a guessed contract address, or invent quote/status API responses.

This review is based on Meson's public SDK repository and docs. It is not an audit, an approval from Meson, or evidence that a live route is available.