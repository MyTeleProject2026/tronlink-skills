# Contract build, tests, deployment and verification

This repository's custom token is a fixed-supply TRC-20-style contract, not official Tether USDT.

## Approved token configuration

- Name: `TRC20`
- Symbol: `VTRC` (the contract rejects the exact symbol `USDT`)
- Decimals: `18`
- Initial whole-token supply: `1000000`
- Raw supply: `1000000000000000000000000`
- Initial recipient: the deploying wallet, because the constructor mints to `msg.sender`

## Local build

Use Node.js 20 or newer and install the repository dependencies:

```sh
npm install
npm run contracts:flatten
npm run contracts:check
npm run contracts:compile
```

TronBox is pinned to version 4.11.0 in `package.json`; the compiler is pinned to Solidity 0.8.20 with optimization enabled and 200 runs in `tronbox-config.js`. Keep these settings identical when compiling the source intended for deployment and when submitting verification.

The Node.js tests validate key source safeguards and supply arithmetic. The Remix test suite at `tests/CustomTRC20_flat_test.sol` checks contract behavior in Remix's Solidity Unit Testing plugin. Do not describe source-pattern tests as a substitute for runtime tests or an independent audit.

## Deploying to TRON Mainnet

Mainnet deployment is intentionally blocked unless all of the following are set in the deploying operator's local environment:

- `PRIVATE_KEY`: sponsor-controlled deployment signer; never commit it, paste it into chat, or configure it in routine CI.
- `DEPLOY_MAINNET=true`
- `CONFIRM_MAINNET_DEPLOYMENT=TRC20-VTRC-18-1000000`

Only after a sponsor has agreed to fund the deployment and reviewed the exact commit should the operator run:

```sh
npx tronbox migrate --network mainnet
```

The sponsor's address pays the network costs and receives the initial supply. Do not put signing secrets in Render. Never run the command until the sponsor confirms the exact source commit, constructor settings, recipient, network, and expected resource/fee exposure. A TRON Mainnet deployment consumes network resources and/or TRX; it is not cost-free.

The migration checks prevent accidental deployment from an ordinary command, but they are not a substitute for sponsor authorization or independent review.

## After deployment

1. Save the exact source commit, transaction ID, contract address, sponsor/deployer public address, constructor parameters, compiler version, optimizer settings, and build artifact hashes.
2. Confirm the transaction succeeded on TRON Mainnet and that the contract bytecode exists at the returned address.
3. Query `name`, `symbol`, `decimals`, `totalSupply`, and `balanceOf(deployer)`. Stop if they do not match the approved values.
4. Open [TRONSCAN contract verification](https://tronscan.org/contracts/verify), select Mainnet, enter the actual deployed contract address and main contract name `CustomTRC20`, then upload the exact flattened source used for deployment.
5. Select the exact compiler version, license, optimizer settings and runs used for the deployed bytecode. This repository's intended settings are Solidity 0.8.20, MIT, optimizer enabled, 200 runs. Confirm against the actual build artifact before submitting.
6. Complete TRONSCAN's human verification and publish. A source upload is not proof of verification; record the resulting explorer page only after TRONSCAN confirms it.
7. Test a small transfer and confirm the transaction receipt and recipient balance before relying on the token.

## Safety boundary

- This token cannot mint or create official Tether USDT. It is a separate custom token identified by its own contract address.
- Do not claim an exchange will credit this token as USDT. Exchanges decide which contract addresses they support.
- The contract has no public mint function, but it is a minimal implementation and has not been independently audited.
- No Mainnet contract address is recorded in this repository until an authorized, funded deployment has actually succeeded.
