"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/nav_bar";
import Link from "next/link";

type Section =
  | "getting-started"
  | "send-receive"
  | "savings"
  | "vault"
  | "escrow";

export default function GuidePage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const [activeSection, setActiveSection] =
    useState<Section>("getting-started");

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: "getting-started" as Section, label: "Getting Started", icon: "🚀" },
    { id: "send-receive" as Section, label: "Send & Receive", icon: "💸" },
    { id: "savings" as Section, label: "Savings Plans", icon: "💰" },
    { id: "vault" as Section, label: "Vault", icon: "🔒" },
    { id: "escrow" as Section, label: "Escrow Protection", icon: "🤝" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-10">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Help Center
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              How to Use Vaultly
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Everything you need to know about managing your crypto
            </p>
          </div>

          {/* Section selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
            {sections.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeSection === id
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 lg:p-8">
            {/* Getting Started */}
            {activeSection === "getting-started" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-black mb-2">
                    🚀 Welcome to Vaultly
                  </h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Vaultly is your self-custodial crypto wallet. You own your
                    keys, you own your funds — always.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                    <h3 className="text-sm font-bold text-emerald-400 mb-2">
                      ✓ Your Wallet Address
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Your wallet address is the same across all EVM chains
                      (Ethereum, Base, Scroll, Arbitrum). Find it on the{" "}
                      <Link
                        href="/send_receive"
                        className="text-emerald-400 underline"
                      >
                        Receive tab
                      </Link>{" "}
                      — share it with anyone to receive funds.
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                    <h3 className="text-sm font-bold text-emerald-400 mb-2">
                      ✓ Network Matters
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Make sure both sender and receiver are on the{" "}
                      <strong>same network</strong>. ETH sent on Base cannot be
                      received on Ethereum mainnet.
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                    <h3 className="text-sm font-bold text-emerald-400 mb-2">
                      ✓ Gas Fees
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Every blockchain transaction costs a small gas fee paid in
                      ETH. Always keep a small amount of ETH for fees.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Send & Receive */}
            {activeSection === "send-receive" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-black mb-2">
                    💸 Send & Receive ETH
                  </h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Transfer ETH instantly to anyone, or lock it in escrow for
                    protected payments.
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                  <h3 className="text-sm font-bold text-emerald-400 mb-3">
                    📤 How to Send ETH
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>
                      Go to{" "}
                      <Link
                        href="/send_receive"
                        className="text-emerald-400 underline"
                      >
                        Send & Receive
                      </Link>
                    </li>
                    <li>Enter the recipient's wallet address</li>
                    <li>Enter the amount of ETH to send</li>
                    <li>
                      (Optional) Check "Use escrow protection" for protected
                      payments
                    </li>
                    <li>Click "Send ETH" and confirm in your wallet</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
                  <h3 className="text-sm font-bold text-blue-400 mb-3">
                    📥 How to Receive ETH
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>
                      Go to the <strong>Receive</strong> tab
                    </li>
                    <li>Copy your wallet address</li>
                    <li>Share it with the person sending you ETH</li>
                    <li>Wait for them to send — funds appear automatically</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
                  <h3 className="text-sm font-bold text-violet-400 mb-3">
                    🤝 Escrow Protection
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                    Check the "Use escrow protection" box when sending to lock
                    ETH in a smart contract until the recipient confirms.
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Perfect for: freelance payments, buying/selling goods, any
                    situation where you need both parties to agree before funds
                    transfer.
                  </p>
                </div>
              </div>
            )}

            {/* Savings */}
            {activeSection === "savings" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-black mb-2">💰 Savings Plans</h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Lock tokens for a set period to reach your financial goals.
                    Can't withdraw until unlock date.
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                  <h3 className="text-sm font-bold text-emerald-400 mb-3">
                    📝 How to Create a Savings Plan
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>
                      Go to{" "}
                      <Link
                        href="/savings"
                        className="text-emerald-400 underline"
                      >
                        Savings
                      </Link>{" "}
                      → New Plan
                    </li>
                    <li>Give your goal a name (e.g., "Holiday fund")</li>
                    <li>Enter the token contract address you want to lock</li>
                    <li>Enter the amount to save</li>
                    <li>Choose lock period (quick presets or custom days)</li>
                    <li>Review the unlock date and click "Start Saving"</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2">
                    ⚠️ Important
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    <li>
                      • You <strong>cannot</strong> withdraw before the unlock
                      date
                    </li>
                    <li>• Minimum lock period is 3 days</li>
                    <li>
                      • Tokens are locked in a smart contract — they're safe
                    </li>
                    <li>• Once unlocked, withdraw anytime from "My Plans"</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Vault */}
            {activeSection === "vault" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-black mb-2">🔒 Vault</h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Store multiple tokens safely in one place. Withdraw anytime
                    — no time locks.
                  </p>
                </div>

                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                  <h3 className="text-sm font-bold text-amber-400 mb-3">
                    📥 How to Deposit
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>
                      Go to{" "}
                      <Link href="/vault" className="text-amber-400 underline">
                        Vault
                      </Link>
                    </li>
                    <li>Enter the token contract address</li>
                    <li>Enter the amount to deposit</li>
                    <li>Click "Deposit to Vault"</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                  <h3 className="text-sm font-bold text-emerald-400 mb-3">
                    📤 How to Withdraw
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>Go to "My Vault" tab</li>
                    <li>Find the token you want to withdraw</li>
                    <li>Enter the amount</li>
                    <li>Click "Withdraw" — funds return to your wallet</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2">
                    💡 When to Use Vault
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    <li>• Safe storage for tokens you're not actively using</li>
                    <li>• No time restrictions — withdraw anytime</li>
                    <li>• Supports any ERC-20 token</li>
                    <li>• Think of it as a savings account without interest</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Escrow */}
            {activeSection === "escrow" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-black mb-2">
                    🤝 Escrow Protection
                  </h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Lock funds in a smart contract until both buyer and seller
                    agree. Perfect for trustless trades.
                  </p>
                </div>

                <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
                  <h3 className="text-sm font-bold text-violet-400 mb-3">
                    🔐 How Escrow Works
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                    <li>
                      <strong>Seller</strong> creates the trade and deposits
                      funds
                    </li>
                    <li>Funds are locked in the smart contract</li>
                    <li>
                      <strong>Buyer</strong> delivers goods/services (off-chain)
                    </li>
                    <li>
                      <strong>Seller</strong> confirms they received what they
                      paid for
                    </li>
                    <li>Contract releases funds to the buyer</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                    <h3 className="text-sm font-bold text-emerald-400 mb-2">
                      ✓ As a Buyer
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Wait for the seller to deliver. Once you receive what you
                      paid for, go to "My Trades" and click "Confirm Receipt" to
                      release the funds.
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                    <h3 className="text-sm font-bold text-red-400 mb-2">
                      ✓ As a Seller
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      If the buyer never confirms, you can cancel the trade to
                      get your funds back — but only before the buyer clicks
                      "Confirm".
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                  <h3 className="text-sm font-bold text-zinc-200 mb-2">
                    ⚠️ Important
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    <li>• Escrow uses smart contracts — funds are safe</li>
                    <li>
                      • Seller can cancel <strong>before</strong> buyer confirms
                    </li>
                    <li>• Once buyer confirms, funds immediately release</li>
                    <li>• Always add a clear description to avoid disputes</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 rounded-xl bg-gradient-to from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 p-6 text-center">
            <h3 className="text-lg font-black mb-2">Still have questions?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Check out our community or reach out for support
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
