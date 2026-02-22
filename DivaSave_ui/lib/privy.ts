import { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "twitter", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#676FFF",
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    }, // autocreate wallet for web2 users
  },
};
