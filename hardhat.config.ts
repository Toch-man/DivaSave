import "@nomicfoundation/hardhat-viem";
import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
        },
      },
    },
  },
  networks: {
    ogTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://evmrpc-testnet.0g.ai",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});
