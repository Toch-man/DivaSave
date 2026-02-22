import { http } from "wagmi";
import { mainnet, sepolia, base } from "viem/chains";
import { createConfig } from "@privy-io/wagmi";

export const wagmiConfig = createConfig({
  chains: [mainnet, base, sepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});
