"use client";

import { useConnect, useAccount } from "wagmi";
export default function Wallet_connect() {
  const { connectors, connect } = useConnect();
  const { isConnecting } = useAccount();
  return (
    <div className="flex flex-row gap-4 p-10">
      <h1>🏦 Welcome to Vault Exchange</h1>
      <p>Connect your wallet to get started</p>

      <div className="connector-buttons">
        {connectors.map((connector: any) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
          >
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  );
}
