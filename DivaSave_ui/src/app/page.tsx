"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./../components/nav_bar";

export default function HomePage() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address, chainId } = useAccount();
  const router = useRouter();

  useEffect(() => {
    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (embeddedWallet) {
      setActiveWallet(embeddedWallet);
    }
  }, [wallets, setActiveWallet]);

  useEffect(() => {
    if (authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, router]);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const chainName =
    chainId === 1
      ? "Ethereum Mainnet"
      : chainId === 8453
      ? "Base"
      : chainId === 16602
      ? "0G Newton Testnet"
      : chainId === 16661
      ? "0G Mainnet"
      : chainId === 11155111
      ? "Sepolia Testnet"
      : chainId
      ? `Chain ${chainId}`
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {authenticated && <Navbar />}

      {!authenticated && (
        <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">DivaSave</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900">
            <span
              className={`w-2 h-2 rounded-full ${
                ready ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="text-xs text-zinc-400 font-mono">
              {ready ? "All systems live" : "Initialising..."}
            </span>
          </div>
        </header>
      )}

      <main className="flex flex-1 flex-col lg:flex-row">
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-16 lg:py-0">
          <span className="inline-flex items-center gap-2 self-start mb-8 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Self-custodial · Non-custodial · On-chain
          </span>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none mb-6">
            Save money.
            <br />
            <span className="text-emerald-400">Own it</span>
            <br />
            forever.
          </h1>

          <p className="text-zinc-400 text-base lg:text-lg leading-relaxed max-w-lg mb-12">
            DivaSave gives everyone a self-custodial wallet on 0G Chain.
            Time-lock your tokens, store them securely, or use escrow for
            protected payments. Your funds, your keys, always.
          </p>

          <div className="flex items-center gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black tracking-tight">Secure</span>
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                Time-locked
              </span>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black tracking-tight">
                Protected
              </span>
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                Escrow trades
              </span>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black tracking-tight text-emerald-400">
                0G Chain
              </span>
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                AI-native L1
              </span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-110 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900 flex flex-col justify-center px-8 py-12 lg:px-10">
          <div className="mb-6">
            <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2">
              // Get started
            </p>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              Connect or create
              <br />
              your wallet
            </h2>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed mb-6 pb-6 border-b border-zinc-800">
            New to crypto? Sign in with email — we&apos;ll create your wallet
            automatically. Already have one? Connect it directly.
          </p>

          {!ready && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="w-4 h-4 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500 font-mono">
                Initialising...
              </span>
            </div>
          )}

          {ready && !authenticated && (
            <div className="flex flex-col gap-4">
              <button
                onClick={login}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-sm py-4 px-5 rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 8 10 6 10-6" />
                </svg>
                Continue with Email
                <span className="text-xs font-normal opacity-70">
                  + auto wallet
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs font-mono text-zinc-600 tracking-widest">
                  OR
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <button
                onClick={login}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 text-sm font-medium"
              >
                <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="17" viewBox="0 0 35 33" fill="none">
                    <path
                      d="M32.9 1L19.4 10.8l2.4-5.8L32.9 1z"
                      fill="#E17726"
                    />
                    <path d="M2.1 1l13.4 9.9-2.3-5.9L2.1 1z" fill="#E27625" />
                    <path
                      d="M28.1 23.5l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1z"
                      fill="#E27625"
                    />
                    <path
                      d="M1 23.6l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z"
                      fill="#E27625"
                    />
                    <path
                      d="M10.5 14.5l-2.1 3.2 7.5.3-.3-8-5.1 4.5z"
                      fill="#E27625"
                    />
                    <path
                      d="M24.5 14.5l-5.2-4.6-.2 8.1 7.5-.3-2.1-3.2z"
                      fill="#E27625"
                    />
                  </svg>
                </span>
                <span className="flex-1 text-left text-zinc-200">MetaMask</span>
                <span className="text-xs font-mono bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                  Popular
                </span>
              </button>

              <button
                onClick={login}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 text-sm font-medium"
              >
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="11" viewBox="0 0 300 185" fill="none">
                    <path
                      d="M61.4 36.6C112.3-12.2 194.7-12.2 245.6 36.6L251.8 42.8C254.3 45.2 254.3 49.1 251.8 51.5L229.7 73.6C228.5 74.8 226.5 74.8 225.3 73.6L216.8 65.1C181.2 30.6 119.8 30.6 84.2 65.1L75.1 74.2C73.9 75.4 71.9 75.4 70.7 74.2L48.6 52.1C46.1 49.7 46.1 45.8 48.6 43.4L61.4 36.6Z"
                      fill="#3B99FC"
                    />
                    <path
                      d="M271.2 62.4L290.9 82.1C293.4 84.5 293.4 88.4 290.9 90.8L205.6 176.1C203.1 178.5 199.1 178.5 196.6 176.1L136.2 115.7C135.6 115.1 134.6 115.1 134 115.7L73.6 176.1C71.1 178.5 67.1 178.5 64.6 176.1L-20.9 90.8C-23.4 88.4 -23.4 84.5 -20.9 82.1L-1.2 62.4C1.3 60 5.3 60 7.8 62.4L68.2 122.8C68.8 123.4 69.8 123.4 70.4 122.8L130.8 62.4C133.3 60 137.3 60 139.8 62.4L200.2 122.8C200.8 123.4 201.8 123.4 202.4 122.8L262.8 62.4C265.1 60 269.1 60 271.2 62.4Z"
                      fill="#3B99FC"
                    />
                  </svg>
                </span>
                <span className="flex-1 text-left text-zinc-200">
                  WalletConnect
                </span>
              </button>

              <button
                onClick={login}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 text-sm font-medium"
              >
                <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    <circle
                      cx="17"
                      cy="14"
                      r="1.5"
                      fill="#71717a"
                      stroke="none"
                    />
                  </svg>
                </span>
                <span className="flex-1 text-left text-zinc-400">
                  Other wallets
                </span>
              </button>

              <p className="text-center text-xs text-zinc-600 font-mono leading-relaxed pt-1">
                By continuing you agree to our Terms &amp; Privacy.
                <br />
                Your keys · Your coins · Always.
              </p>
            </div>
          )}

          {ready && authenticated && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                    Status
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                </div>
                {shortAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Address
                    </span>
                    <span className="text-xs font-mono text-zinc-200">
                      {shortAddress}
                    </span>
                  </div>
                )}
                {chainName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Network
                    </span>
                    <span className="text-xs font-mono text-zinc-200">
                      {chainName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2.5 py-2">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-sm text-zinc-400 font-mono">
                  Redirecting to dashboard...
                </span>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 hover:border-red-500/30 hover:bg-red-500/5 text-zinc-500 hover:text-red-400 text-sm font-medium transition-all duration-150"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out instead
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
