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

const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── Vault ABI ──
const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Tab = "deposit" | "myvault";
type Step = "idle" | "approving" | "depositing" | "withdrawing" | "done";

export default function VaultPage() {
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("deposit");
  const [step, setStep] = useState<Step>("idle");
  const [tokenAddr, setTokenAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [actionType, setActionType] = useState<"deposit" | "withdraw">(
    "deposit"
  );

  // Track which tokens user has stored (for demo we'll use state, real app would query events)
  const [storedTokens, setStoredTokens] = useState<string[]>([]);

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

  const { data: walletBalance } = useReadContract({
    address: validToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!validToken && !!address },
  });

  const { data: vaultBalance, refetch: refetchVault } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getBalance",
    args: address && validToken ? [address, validToken] : undefined,
    query: { enabled: !!address && !!validToken },
  });

  // ── Writes ──
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: deposit, data: depositTxHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract();

  // ── Wait for txns ──
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });
  const { isSuccess: withdrawConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // After approve → deposit
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      const decimals = (tokenDecimals as number | undefined) ?? 18;
      const parsed = parseUnits(amount, decimals);
      deposit({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [tokenAddr as `0x${string}`, parsed],
      });
      setStep("depositing");
    }
  }, [approveConfirmed, step]);

  // After deposit confirmed
  useEffect(() => {
    if (depositConfirmed && step === "depositing") {
      setStep("done");
      if (!storedTokens.includes(tokenAddr)) {
        setStoredTokens((prev) => [...prev, tokenAddr]);
      }
      refetchVault();
    }
  }, [depositConfirmed, step]);

  // After withdraw confirmed
  useEffect(() => {
    if (withdrawConfirmed && step === "withdrawing") {
      setStep("done");
      refetchVault();
    }
  }, [withdrawConfirmed, step]);

  // ── Handlers ──
  const handleDeposit = () => {
    setFormError("");
    if (!isAddress(tokenAddr))
      return setFormError("Enter a valid token address");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return setFormError("Enter a valid amount");

    const decimals = (tokenDecimals as number | undefined) ?? 18;
    const walletBalNum = walletBalance
      ? parseFloat(formatUnits(walletBalance as bigint, decimals))
      : 0;

    if (parseFloat(amount) > walletBalNum)
      return setFormError("Amount exceeds your wallet balance");

    const parsed = parseUnits(amount, decimals);
    setActionType("deposit");
    setStep("approving");
    approve({
      address: tokenAddr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [VAULT_ADDRESS, parsed],
    });
  };

  const handleWithdraw = () => {
    setFormError("");
    if (!isAddress(tokenAddr))
      return setFormError("Enter a valid token address");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return setFormError("Enter a valid amount");

    const decimals = (tokenDecimals as number | undefined) ?? 18;
    const vaultBalNum = vaultBalance
      ? parseFloat(formatUnits(vaultBalance as bigint, decimals))
      : 0;

    if (parseFloat(amount) > vaultBalNum)
      return setFormError("Amount exceeds your vault balance");

    const parsed = parseUnits(amount, decimals);
    setActionType("withdraw");
    setStep("withdrawing");
    withdraw({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [tokenAddr as `0x${string}`, parsed],
    });
  };

  const handleReset = () => {
    setStep("idle");
    setTokenAddr("");
    setAmount("");
    setFormError("");
  };

  const handleSetMax = () => {
    const decimals = (tokenDecimals as number | undefined) ?? 18;
    if (tab === "deposit") {
      const max = walletBalance
        ? parseFloat(formatUnits(walletBalance as bigint, decimals))
        : 0;
      setAmount(max.toFixed(6));
    } else {
      const max = vaultBalance
        ? parseFloat(formatUnits(vaultBalance as bigint, decimals))
        : 0;
      setAmount(max.toFixed(6));
    }
  };

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  const decimals = (tokenDecimals as number | undefined) ?? 18;
  const walletBalNum = walletBalance
    ? parseFloat(formatUnits(walletBalance as bigint, decimals))
    : 0;
  const vaultBalNum = vaultBalance
    ? parseFloat(formatUnits(vaultBalance as bigint, decimals))
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-10">
          {/* ── HEADER ── */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Storage
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Multi-Token Vault
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Store multiple tokens safely. Withdraw anytime — no locks.
            </p>
          </div>

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="flex flex-col gap-1 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Tokens Stored
              </p>
              <p className="text-2xl font-black tracking-tight text-amber-400">
                {storedTokens.length}
              </p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Total Value
              </p>
              <p className="text-2xl font-black tracking-tight">—</p>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
            {(["deposit", "myvault"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
                  tab === t
                    ? "bg-zinc-950 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "deposit" ? "Deposit" : "My Vault"}
              </button>
            ))}
          </div>

          {/* ════════════════════
              DEPOSIT TAB
          ════════════════════ */}
          {tab === "deposit" && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
              {/* Success */}
              {step === "done" && actionType === "deposit" && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-amber-400 mb-1">
                      Deposited Successfully!
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      {amount} {(tokenSymbol as string) ?? "tokens"} safely
                      stored in your vault.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition-all"
                    >
                      Deposit More
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        setTab("myvault");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition-all"
                    >
                      View Vault
                    </button>
                  </div>
                </div>
              )}

              {/* Step indicator */}
              {(step === "approving" || step === "depositing") && (
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
                          Step 1/2 — Approving...
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
                  {step === "depositing" && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
                      <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                      <p className="text-xs font-mono text-amber-400">
                        Step 2/2 — Depositing to vault...
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
                          ? "border-amber-500/40"
                          : "border-zinc-700 focus:border-zinc-500"
                      }`}
                    />
                    {validToken && tokenSymbol && (
                      <div className="flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-mono text-amber-400">
                          {tokenSymbol as string} · Wallet:{" "}
                          {walletBalNum.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Amount
                      </label>
                      <button
                        onClick={handleSetMax}
                        className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        Max: {walletBalNum.toFixed(4)}{" "}
                        {(tokenSymbol as string) ?? "tokens"}
                      </button>
                    </div>
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

                  {/* Summary */}
                  {validToken && amount && parseFloat(amount) > 0 && (
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 flex flex-col gap-2">
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                        What will happen
                      </p>
                      <p className="text-xs font-mono text-zinc-400">
                        1. Approve vault to access{" "}
                        <span className="text-white">
                          {amount} {tokenSymbol as string}
                        </span>
                      </p>
                      <p className="text-xs font-mono text-zinc-400">
                        2. Transfer tokens to vault contract
                      </p>
                      <p className="text-xs font-mono text-zinc-400">
                        3. Withdraw anytime from "My Vault"
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleDeposit}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/25"
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
                      <rect x="2" y="3" width="20" height="18" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                    </svg>
                    Deposit to Vault
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════
              MY VAULT TAB
          ════════════════════ */}
          {tab === "myvault" && (
            <div className="flex flex-col gap-4">
              {/* Success (withdraw) */}
              {step === "done" && actionType === "withdraw" && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center gap-4 py-10 text-center">
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
                      Withdrawn Successfully!
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      {amount} {(tokenSymbol as string) ?? "tokens"} returned to
                      your wallet.
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition-all"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Withdraw form */}
              {step !== "done" && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
                  {step === "withdrawing" && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                      <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                      <p className="text-xs font-mono text-amber-400">
                        Processing withdrawal...
                      </p>
                    </div>
                  )}

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

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Token Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x... token to withdraw"
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
                            {tokenSymbol as string} · Vault:{" "}
                            {vaultBalNum.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                          Amount
                        </label>
                        <button
                          onClick={handleSetMax}
                          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Max: {vaultBalNum.toFixed(4)}{" "}
                          {(tokenSymbol as string) ?? "tokens"}
                        </button>
                      </div>
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

                    <button
                      onClick={handleWithdraw}
                      disabled={step === "withdrawing"}
                      className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-zinc-950 font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25"
                    >
                      {step === "withdrawing" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-950 rounded-full animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        <>
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
                          Withdraw from Vault
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {storedTokens.length === 0 && step === "idle" && (
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
                      <rect x="2" y="3" width="20" height="18" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">Your vault is empty.</p>
                  <button
                    onClick={() => setTab("deposit")}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                  >
                    Deposit tokens →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
