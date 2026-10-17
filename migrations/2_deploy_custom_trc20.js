const CustomTRC20 = artifacts.require("CustomTRC20");

const CONFIRMATION = "TRC20-VTRC-18-1000000";

module.exports = async function (deployer, network) {
  const isMainnet = network === "mainnet";

  // Mainnet deployments are deliberately opt-in and require two independent
  // environment confirmations. Never set these in a routine CI workflow.
  if (isMainnet) {
    if (process.env.DEPLOY_MAINNET !== "true") {
      throw new Error("Mainnet deployment blocked: set DEPLOY_MAINNET=true only after sponsor approval.");
    }
    if (process.env.CONFIRM_MAINNET_DEPLOYMENT !== CONFIRMATION) {
      throw new Error("Mainnet deployment blocked: confirmation string does not match the reviewed token configuration.");
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Mainnet deployment blocked: configure the sponsor signer locally in the environment; never commit it.");
    }
  }

  const tokenName = process.env.TOKEN_NAME || "TRC20";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "VTRC";
  const tokenDecimals = Number(process.env.TOKEN_DECIMALS || "18");
  const initialWholeTokenSupply = process.env.INITIAL_WHOLE_TOKEN_SUPPLY || "1000000";

  if (tokenSymbol.toUpperCase() === "USDT") {
    throw new Error("Refusing USDT symbol: this project must not impersonate official Tether USDT.");
  }
  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 18) {
    throw new Error("TOKEN_DECIMALS must be an integer from 0 through 18.");
  }
  if (!/^[1-9][0-9]*$/.test(String(initialWholeTokenSupply))) {
    throw new Error("INITIAL_WHOLE_TOKEN_SUPPLY must be a positive whole-number string.");
  }

  // The contract assigns the entire initial supply to msg.sender, the deployer.
  // For Mainnet, the sponsor/deployer therefore receives the initial supply.
  await deployer.deploy(
    CustomTRC20,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    initialWholeTokenSupply
  );
};
