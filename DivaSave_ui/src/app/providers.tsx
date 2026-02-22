"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi"; // ← no State import needed
import { privyConfig } from "../../lib/privy"; // ← your config
import { wagmiConfig } from "../../lib/wagmi"; // ← your wagmi config
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={privyConfig} // ← use imported config
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}> {children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
