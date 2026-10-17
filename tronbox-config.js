// TronBox configuration for reproducible TRON-compatible compilation.
// No private keys are stored in this file or in the repository.
module.exports = {
  contracts_directory: "./contracts",
  contracts_build_directory: "./build/contracts",
  migrations_directory: "./migrations",
  test_directory: "./test",
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: { enabled: true, runs: 200 }
      }
    }
  },
  networks: {
    nile: {
      privateKey: process.env.PRIVATE_KEY || "",
      fullHost: process.env.TRON_FULL_HOST || "https://nile.trongrid.io",
      network_id: "*",
      feeLimit: 1000 * 1e6,
      userFeePercentage: 100
    },
    mainnet: {
      privateKey: process.env.PRIVATE_KEY || "",
      fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
      network_id: "*",
      feeLimit: 1000 * 1e6,
      userFeePercentage: 100
    }
  }
};
