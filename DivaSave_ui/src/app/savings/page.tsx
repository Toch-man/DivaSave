"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { isAddress, parseUnits, formatUnits } from "viem";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/nav_bar";

const SAVINGS_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── SavingsPlan ABI ──
const SAVINGS_ABI = [
  {
    name: "create_saving",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "token", type: "address" },
      { name: "lock_days", type: "uint256" },
      { name: "goalName", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "withdraw_saving",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "saving_id", type: "uint256" }],
    outputs: [],
  },
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
  {
    name: "getTimeUntilUnlock",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "savingsId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── ERC20 ABI ──
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

type Tab = "create" | "mysavings";
type Step = "idle" | "approving" | "saving" | "done";

type Saving = {
  amount: bigint;
  unlockTime: bigint;
  token: `0x${string}`;
  withdrawn: boolean;
  goalName: string;
};

// ── helpers ──
function secondsToDHM(seconds: number): string {
  if (seconds <= 0) return "Unlocked";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

function unlockProgress(unlockTime: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  const unlock = Number(unlockTime);
  if (now >= unlock) return 100;
  // assume max 365 days display window
  const total = 365 * 24 * 3600;
  const elapsed = total - (unlock - now);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

// ── Saving card ──
function SavingCard({
  saving,
  index,
  address,
  onWithdraw,
  isWithdrawing,
}: {
  saving: Saving;
  index: number;
  address?: string;
  onWithdraw: (id: number) => void;
  isWithdrawing: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const unlockSec = Number(saving.unlockTime);
  const isUnlocked = now >= unlockSec;
  const remaining = Math.max(0, unlockSec - now);
  const progress = unlockProgress(saving.unlockTime);
  const canWithdraw = isUnlocked && !saving.withdrawn;

  const unlockDate = new Date(unlockSec * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-xl border bg-zinc-900 p-5 flex flex-col gap-4 transition-all ${
        saving.withdrawn
          ? "border-zinc-800 opacity-60"
          : isUnlocked
          ? "border-emerald-500/30"
          : "border-zinc-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-100">
              {saving.goalName || "Unnamed Goal"}
            </span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              #{index}
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-500 break-all">
            Token: {saving.token.slice(0, 10)}...{saving.token.slice(-6)}
          </p>
        </div>

        {/* Status badge */}
        {saving.withdrawn ? (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 border border-zinc-600 shrink-0">
            Withdrawn
          </span>
        ) : isUnlocked ? (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            Ready
          </span>
        ) : (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            Locked
          </span>
        )}
      </div>

      {/* Amount */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black tracking-tighter">
          {parseFloat(formatUnits(saving.amount, 18)).toFixed(4)}
        </span>
        <span className="text-sm font-bold text-zinc-400 mb-1">tokens</span>
      </div>

      {/* Progress bar */}
      {!saving.withdrawn && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500">
              {isUnlocked ? "Fully unlocked" : secondsToDHM(remaining)}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              {unlockDate}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isUnlocked ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Withdraw button */}
      {canWithdraw && (
        <button
          onClick={() => onWithdraw(index)}
          disabled={isWithdrawing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25"
        >
          {isWithdrawing ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-950 rounded-full animate-spin" />
              Withdrawing...
            </>
          ) : (
            <>
              <svg
                width="15"
                height="15"
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
              Withdraw Tokens
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════
export default function SavingsPage() {
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("create");
  const [step, setStep] = useState<Step>("idle");
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  // Form state
  const [tokenAddr, setTokenAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [lockDays, setLockDays] = useState("30");
  const [goalName, setGoalName] = useState("");
  const [formError, setFormError] = useState("");

  // ── Token info ──
  const validToken = isAddress(tokenAddr)
    ? (tokenAddr as `0x${string}`)
    : undefined;

  const { data: tokenSymbol } = useReadContract({
    address: validToken,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!validToken },
  });

  const { data: tokenDecimals } = useReadContract({
    address: validToken,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!validToken },
  });

  // ── Read user savings ──
  const { data: userSavings, refetch: refetchSavings } = useReadContract({
    address: SAVINGS_ADDRESS,
    abi: SAVINGS_ABI,
    functionName: "get_user_saving",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  }) as { data: Saving[] | undefined; refetch: () => void };

  // ── Writes ──
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: createSaving, data: saveTxHash } = useWriteContract();
  const { writeContract: withdrawSaving } = useWriteContract();

  // ── Wait for txns ──
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: saveConfirmed, isLoading: saveConfirming } =
    useWaitForTransactionReceipt({ hash: saveTxHash });

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // After approve confirmed → create saving
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      const decimals = (tokenDecimals as number | undefined) ?? 18;
      const parsed = parseUnits(amount, decimals);
      createSaving({
        address: SAVINGS_ADDRESS,
        abi: SAVINGS_ABI,
        functionName: "create_saving",
        args: [parsed, tokenAddr as `0x${string}`, BigInt(lockDays), goalName],
      });
      setStep("saving");
    }
  }, [approveConfirmed, step]);

  // After saving confirmed
  useEffect(() => {
    if (saveConfirmed && step === "saving") {
      setStep("done");
      refetchSavings();
    }
  }, [saveConfirmed, step]);

  // ── Handlers ──
  const handleCreate = () => {
    setFormError("");
    if (!isAddress(tokenAddr))
      return setFormError("Enter a valid token address");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return setFormError("Enter a valid amount");
    if (!lockDays || parseInt(lockDays) < 3)
      return setFormError("Lock period must be at least 3 days");
    if (!goalName.trim()) return setFormError("Give your savings goal a name");

    const decimals = (tokenDecimals as number | undefined) ?? 18;
    const parsed = parseUnits(amount, decimals);

    setStep("approving");
    approve({
      address: tokenAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SAVINGS_ADDRESS, parsed],
    });
  };

  const handleWithdraw = (id: number) => {
    setWithdrawingId(id);
    withdrawSaving({
      address: SAVINGS_ADDRESS,
      abi: SAVINGS_ABI,
      functionName: "withdraw_saving",
      args: [BigInt(id)],
    });
  };

  const handleReset = () => {
    setStep("idle");
    setTokenAddr("");
    setAmount("");
    setLockDays("30");
    setGoalName("");
    setFormError("");
  };

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const activeSavings = userSavings?.filter((s) => !s.withdrawn) ?? [];
  const completedSavings = userSavings?.filter((s) => s.withdrawn) ?? [];
  const totalLocked = activeSavings.reduce(
    (acc, s) => acc + Number(formatUnits(s.amount, 18)),
    0
  );

  // Quick lock presets
  const presets = [
    { label: "1 Week", days: "7" },
    { label: "1 Month", days: "30" },
    { label: "3 Months", days: "90" },
    { label: "1 Year", days: "365" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-10">
          {/* ── HEADER ── */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Goals
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Savings Plan
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Lock tokens for a set period and build towards your goals.
            </p>
          </div>

          {/* ── STATS ROW ── */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="flex flex-col gap-1 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Active Plans
              </p>
              <p className="text-2xl font-black tracking-tight text-emerald-400">
                {activeSavings.length}
              </p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Total Locked
              </p>
              <p className="text-2xl font-black tracking-tight">
                {totalLocked.toFixed(4)}
              </p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Completed
              </p>
              <p className="text-2xl font-black tracking-tight text-zinc-400">
                {completedSavings.length}
              </p>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
            {(["create", "mysavings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
                  tab === t
                    ? "bg-zinc-950 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "create"
                  ? "New Plan"
                  : `My Plans ${userSavings ? `(${userSavings.length})` : ""}`}
              </button>
            ))}
          </div>

          {/* ════════════════════════
              CREATE TAB
          ════════════════════════ */}
          {tab === "create" && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
              {/* Success */}
              {step === "done" && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-400 mb-1">
                      Savings Plan Created!
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      Your{" "}
                      <span className="text-white">
                        {amount} {(tokenSymbol as string) ?? "tokens"}
                      </span>{" "}
                      are locked for{" "}
                      <span className="text-white">{lockDays} days</span>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition-all"
                    >
                      New Plan
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        setTab("mysavings");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-all"
                    >
                      View My Plans
                    </button>
                  </div>
                </div>
              )}

              {/* Step progress */}
              {(step === "approving" || step === "saving") && (
                <div className="flex flex-col gap-3 mb-6">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      step === "approving"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                    }`}
                  >
                    {step === "approving" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                        <p className="text-xs font-mono text-amber-400">
                          Step 1/2 — Approving token spend...
                        </p>
                      </>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <p className="text-xs font-mono text-emerald-400">
                          Step 1/2 — Approved ✓
                        </p>
                      </>
                    )}
                  </div>
                  {step === "saving" && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
                      <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                      <p className="text-xs font-mono text-amber-400">
                        Step 2/2 — Locking tokens on-chain...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              {step === "idle" && (
                <div className="flex flex-col gap-5">
                  {formError && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f87171"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p className="text-xs text-red-400 font-mono">
                        {formError}
                      </p>
                    </div>
                  )}

                  {/* Goal name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Goal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Holiday fund, Emergency savings..."
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                    />
                  </div>

                  {/* Token address */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Token Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x... ERC-20 token contract"
                      value={tokenAddr}
                      onChange={(e) => setTokenAddr(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl bg-zinc-950 border text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                        validToken
                          ? "border-emerald-500/40"
                          : "border-zinc-700 focus:border-zinc-500"
                      }`}
                    />
                    {validToken && tokenSymbol && (
                      <div className="flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-mono text-emerald-400">
                          {tokenSymbol as string} detected
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-3.5 pr-24 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-500">
                        {(tokenSymbol as string) ?? "TOKENS"}
                      </span>
                    </div>
                  </div>

                  {/* Lock period */}
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Lock Period
                    </label>
                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-2">
                      {presets.map(({ label, days }) => (
                        <button
                          key={days}
                          onClick={() => setLockDays(days)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            lockDays === days
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-zinc-950 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* Custom days input */}
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Or enter custom days (min 3)"
                        value={lockDays}
                        onChange={(e) => setLockDays(e.target.value)}
                        min={3}
                        className="w-full px-4 py-3 pr-16 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                        days
                      </span>
                    </div>
                    {lockDays && parseInt(lockDays) >= 3 && (
                      <p className="text-xs font-mono text-zinc-500">
                        Unlocks on:{" "}
                        <span className="text-zinc-300">
                          {new Date(
                            Date.now() + parseInt(lockDays) * 86400000
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Summary */}
                  {goalName &&
                    validToken &&
                    amount &&
                    parseFloat(amount) > 0 &&
                    parseInt(lockDays) >= 3 && (
                      <div className="rounded-xl bg-zinc-950 border border-emerald-500/10 px-4 py-4 flex flex-col gap-2">
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                          Plan Summary
                        </p>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Goal</span>
                          <span className="text-zinc-200">{goalName}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Locking</span>
                          <span className="text-zinc-200">
                            {amount} {(tokenSymbol as string) ?? "tokens"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Duration</span>
                          <span className="text-zinc-200">{lockDays} days</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Unlocks</span>
                          <span className="text-emerald-400">
                            {new Date(
                              Date.now() + parseInt(lockDays) * 86400000
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Submit */}
                  <button
                    onClick={handleCreate}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25"
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
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Start Saving
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════
              MY SAVINGS TAB
          ════════════════════════ */}
          {tab === "mysavings" && (
            <div className="flex flex-col gap-4">
              {!userSavings ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-sm text-zinc-500 font-mono">
                    Loading your savings...
                  </span>
                </div>
              ) : userSavings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#52525b"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">No savings plans yet.</p>
                  <button
                    onClick={() => setTab("create")}
                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                  >
                    Create your first plan →
                  </button>
                </div>
              ) : (
                <>
                  {/* Active plans first */}
                  {activeSavings.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Active Plans
                      </p>
                      {userSavings.map((saving, i) =>
                        !saving.withdrawn ? (
                          <SavingCard
                            key={i}
                            saving={saving}
                            index={i}
                            address={address}
                            onWithdraw={handleWithdraw}
                            isWithdrawing={withdrawingId === i}
                          />
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Completed plans */}
                  {completedSavings.length > 0 && (
                    <div className="flex flex-col gap-3 mt-2">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Completed
                      </p>
                      {userSavings.map((saving, i) =>
                        saving.withdrawn ? (
                          <SavingCard
                            key={i}
                            saving={saving}
                            index={i}
                            address={address}
                            onWithdraw={handleWithdraw}
                            isWithdrawing={withdrawingId === i}
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
