"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatUnits } from "viem";
import Navbar from "./../../components/nav_bar";
import Link from "next/link";

// ── Contract Addresses ──
const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const SAVINGS_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── ABIs ──
const SAVINGS_ABI = [
  {
    name: "get_user_saving",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "amount", type: "uint256" },
          { name: "unlockTime", type: "uint256" },
          { name: "token", type: "address" },
          { name: "withdrawn", type: "bool" },
          { name: "goalName", type: "string" },
        ],
      },
    ],
  },
] as const;

const ESCROW_ABI = [
  {
    name: "nextTradeId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTrade",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "seller", type: "address" },
          { name: "buyer", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "sellerDeposited", type: "bool" },
          { name: "buyerConfirmed", type: "bool" },
          { name: "completed", type: "bool" },
          { name: "cancelled", type: "bool" },
          { name: "description", type: "string" },
        ],
      },
    ],
  },
] as const;

type Saving = {
  amount: bigint;
  unlockTime: bigint;
  token: `0x${string}`;
  withdrawn: boolean;
  goalName: string;
};

type Trade = {
  seller: `0x${string}`;
  buyer: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  sellerDeposited: boolean;
  buyerConfirmed: boolean;
  completed: boolean;
  cancelled: boolean;
  description: string;
};

// Mock transaction data (we'll keep this until you integrate a transaction indexer)
const recentTxns = [
  {
    id: 1,
    type: "Deposit",
    amount: "+0.25 ETH",
    usd: "+$612.50",
    time: "2 mins ago",
    status: "confirmed",
    icon: "↓",
  },
  {
    id: 2,
    type: "Swap",
    amount: "0.1 ETH → USDC",
    usd: "$245.10",
    time: "1 hour ago",
    status: "confirmed",
    icon: "⇄",
  },
];

// Quick action cards
const quickActions = [
  {
    href: "/savings",
    label: "Savings",
    desc: "Time-lock your tokens",
    badge: null,
    color: "emerald",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    href: "/send_receive",
    label: "Send & Receive",
    desc: "Transfer tokens instantly",
    badge: null,
    color: "blue",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 16V4m0 0L3 8m4-4 4 4" />
        <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
      </svg>
    ),
  },
  {
    href: "/vault",
    label: "Vault",
    desc: "Store tokens securely",
    badge: null,
    color: "amber",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
  },
];

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; glow: string }
> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "hover:shadow-emerald-500/10",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    glow: "hover:shadow-blue-500/10",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "hover:shadow-violet-500/10",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "hover:shadow-amber-500/10",
  },
};

export default function DashboardPage() {
  const { authenticated, ready, user } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  // Fetch live ETH balance
  const { data: balance } = useBalance({ address });

  // ── FETCH SAVINGS DATA ──
  const { data: userSavings } = useReadContract({
    address: SAVINGS_ADDRESS,
    abi: SAVINGS_ABI,
    functionName: "get_user_saving",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: Saving[] | undefined };

  // ── FETCH ESCROW DATA ──
  const { data: nextTradeId } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextTradeId",
  });

  // Count active escrow trades where user is buyer or seller
  const activeEscrowCount = 0; // We'd need to loop through all trades to count this properly

  // Track vault tokens (simplified - in production you'd track this properly)
  const storedTokens: string[] = []; // Replace with actual vault token tracking

  // Guard — redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const displayName =
    user?.email?.address?.split("@")[0] ?? shortAddress ?? "anon";

  const ethBalance = balance
    ? parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)
    : "0.0000";

  const usdBalance = balance
    ? (
        parseFloat(formatUnits(balance.value, balance.decimals)) * 2450
      ).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$0.00";

  // Calculate savings total (sum all non-withdrawn savings)
  const activeSavings = userSavings?.filter((s) => !s.withdrawn) ?? [];
  const totalSavingsETH = activeSavings.reduce((acc, s) => {
    // Assuming all savings are in 18 decimal tokens for now
    return acc + parseFloat(formatUnits(s.amount, 18));
  }, 0);

  // For demo purposes - vaulted amount
  const vaultedETH = 0; // You'd need to track deposited tokens per user

  // In escrow
  const escrowETH = 0; // You'd need to sum up active trades

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-10">
          <div className="flex items-start justify-between mb-10">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1"></p>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                Welcome back,{" "}
                <span className="text-emerald-400">{displayName}</span>
              </h1>
              {shortAddress && (
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  {shortAddress}
                </p>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1.5">
              <span className="text-xs text-zinc-500 font-mono">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Base Sepolia
              </span>
            </div>
          </div>

          {/* ── BUY GAS BANNER (if low balance) ── */}
          {ethBalance && parseFloat(ethBalance) < 0.01 && (
            <div className="rounded-2xl bg-gradient-to from-orange-500/10 to-red-500/10 border border-orange-500/30 p-6 mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-orange-400 mb-1">
                    Low Gas Balance
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                    You need A0GI tokens to pay for transaction fees on 0G
                    Chain. Get free testnet tokens from the faucet to interact
                    with your savings, vault, and escrow.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href="https://faucet.0g.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25"
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
                    <polyline points="8 17 12 21 16 17" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                  </svg>
                  Get Free Testnet Tokens
                </a>
                <a
                  href="https://discord.gg/0gfoundation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-sm transition-all"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Join Discord
                </a>
              </div>
            </div>
          )}

          <div className="relative rounded-2xl bg-gradient-to from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 p-6 lg:p-8 mb-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
                  Total Balance
                </p>
                <div className="flex items-end gap-3 mb-1">
                  <span className="text-4xl lg:text-5xl font-black tracking-tighter">
                    {ethBalance}
                  </span>
                  <span className="text-lg font-bold text-zinc-400 mb-1">
                    ETH
                  </span>
                </div>
                <p className="text-zinc-500 font-mono text-sm">
                  {usdBalance} USD
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    Savings
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {totalSavingsETH.toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    Vaulted
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {vaultedETH.toFixed(2)} ETH
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    In Escrow
                  </span>
                  <span className="text-sm font-bold text-violet-400">
                    {escrowETH.toFixed(2)} ETH
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar - only show if there's data */}
            {(totalSavingsETH > 0 || vaultedETH > 0 || escrowETH > 0) && (
              <>
                <div className="relative mt-6 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${
                        (totalSavingsETH /
                          (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full bg-amber-500 rounded-full"
                    style={{
                      left: `${
                        (totalSavingsETH /
                          (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                      }%`,
                      width: `${
                        (vaultedETH /
                          (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full bg-violet-500 rounded-full"
                    style={{
                      left: `${
                        ((totalSavingsETH + vaultedETH) /
                          (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                      }%`,
                      width: `${
                        (escrowETH /
                          (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs font-mono text-zinc-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Savings{" "}
                    {Math.round(
                      (totalSavingsETH /
                        (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                    )}
                    %
                  </span>
                  <span className="text-xs font-mono text-zinc-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Vault{" "}
                    {Math.round(
                      (vaultedETH /
                        (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                    )}
                    %
                  </span>
                  <span className="text-xs font-mono text-zinc-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    Escrow{" "}
                    {Math.round(
                      (escrowETH / (totalSavingsETH + vaultedETH + escrowETH)) *
                        100
                    )}
                    %
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Active Plans",
                value: activeSavings.length.toString(),
                sub: "Savings goals",
                trend: null,
              },
              {
                label: "Total Locked",
                value: `${totalSavingsETH.toFixed(2)} ETH`,
                sub: "In savings",
                trend: activeSavings.length > 0 ? "up" : null,
              },
              {
                label: "Tokens Stored",
                value: storedTokens.length.toString(),
                sub: "In vault",
                trend: null,
              },
              {
                label: "Next Unlock",
                value: activeSavings.length > 0 ? "Check plans" : "—",
                sub:
                  activeSavings.length > 0 ? "View savings" : "No active locks",
                trend: null,
              },
            ].map(({ label, value, sub, trend }) => (
              <div
                key={label}
                className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-4 flex flex-col gap-1"
              >
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-xl font-black tracking-tight">{value}</p>
                <p
                  className={`text-xs font-mono ${
                    trend === "up" ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  {trend === "up" ? "↑ " : ""}
                  {sub}
                </p>
              </div>
            ))}
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
              // Quick actions
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map(({ href, label, desc, badge, color, icon }) => {
                const c = colorMap[color];
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col gap-3 p-4 rounded-xl border ${c.border} ${c.bg} hover:shadow-lg ${c.glow} transition-all duration-200 hover:-translate-y-0.5 group`}
                  >
                    <span
                      className={`${c.text} group-hover:scale-110 transition-transform duration-200`}
                    >
                      {icon}
                    </span>
                    <div>
                      <p className={`text-sm font-bold ${c.text}`}>{label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                        {desc}
                      </p>
                    </div>
                    {badge && (
                      <span
                        className={`self-start text-xs font-mono ${c.bg} ${c.text} border ${c.border} px-2 py-0.5 rounded-full`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RECENT TRANSACTIONS*/}
          {/* <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                // Recent transactions
              </p>
              <Link
                href="/history"
                className="text-xs font-mono text-zinc-500 hover:text-emerald-400 transition-colors"
              >
                View all →
              </Link>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              {recentTxns.map((txn, idx) => (
                <div
                  key={txn.id}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/50 transition-colors ${
                    idx !== recentTxns.length - 1
                      ? "border-b border-zinc-800"
                      : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm shrink-0">
                    {txn.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100">
                      {txn.type}
                    </p>
                    <p className="text-xs font-mono text-zinc-500">
                      {txn.time}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold font-mono ${
                        txn.amount.startsWith("+")
                          ? "text-emerald-400"
                          : txn.amount.startsWith("-")
                          ? "text-red-400"
                          : "text-zinc-300"
                      }`}
                    >
                      {txn.amount}
                    </p>
                    <p className="text-xs font-mono text-zinc-500">{txn.usd}</p>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        txn.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
