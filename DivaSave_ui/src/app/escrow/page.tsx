"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { isAddress, parseUnits, formatUnits } from "viem";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "./../../components/nav_bar";

// ── Paste your deployed contract address here after deployment ──
const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── Escrow contract ABI — only the functions we need ──
const ESCROW_ABI = [
  {
    name: "createTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "confirmTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeId", type: "uint256" }],
    outputs: [],
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

// ── ERC20 approve ABI ──
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
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

type Tab = "create" | "mytrades" | "lookup";
type Step = "idle" | "approving" | "approved" | "creating" | "done" | "error";

// Trade type matching contract struct
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

// ── Status badge helper ──
function StatusBadge({ trade }: { trade: Trade }) {
  if (trade.cancelled)
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        Cancelled
      </span>
    );
  if (trade.completed)
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  if (trade.sellerDeposited)
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Awaiting buyer
      </span>
    );
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 border border-zinc-600">
      Pending
    </span>
  );
}

// ── Trade Card ──
function TradeCard({
  tradeId,
  trade,
  currentAddress,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  tradeId: number;
  trade: Trade;
  currentAddress?: string;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  isConfirming: boolean;
  isCancelling: boolean;
}) {
  const isBuyer = currentAddress?.toLowerCase() === trade.buyer.toLowerCase();
  const isSeller = currentAddress?.toLowerCase() === trade.seller.toLowerCase();
  const canConfirm = isBuyer && !trade.completed && !trade.cancelled;
  const canCancel =
    isSeller && !trade.buyerConfirmed && !trade.completed && !trade.cancelled;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Trade
          </span>
          <span className="text-xs font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
            #{tradeId}
          </span>
        </div>
        <StatusBadge trade={trade} />
      </div>

      {/* Description */}
      {trade.description && (
        <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-violet-500/40 pl-3">
          {trade.description}
        </p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Role
          </span>
          <span
            className={`text-sm font-bold ${
              isBuyer ? "text-blue-400" : "text-emerald-400"
            }`}
          >
            {isBuyer ? "Buyer" : isSeller ? "Seller" : "Observer"}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Amount
          </span>
          <span className="text-sm font-bold text-zinc-200">
            {formatUnits(trade.amount, 18)}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 col-span-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {isBuyer ? "Seller" : "Buyer"}
          </span>
          <span className="text-xs font-mono text-zinc-300 break-all">
            {isBuyer ? trade.seller : trade.buyer}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 col-span-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Token
          </span>
          <span className="text-xs font-mono text-zinc-300 break-all">
            {trade.token}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canConfirm && (
        <button
          onClick={() => onConfirm(tradeId)}
          disabled={isConfirming}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-all duration-150 hover:-translate-y-0.5"
        >
          {isConfirming ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-950 rounded-full animate-spin" />{" "}
              Confirming...
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirm Receipt
            </>
          )}
        </button>
      )}

      {canCancel && (
        <button
          onClick={() => onCancel(tradeId)}
          disabled={isCancelling}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 font-bold text-sm transition-all duration-150"
        >
          {isCancelling ? (
            <>
              <div className="w-4 h-4 border-2 border-red-900 border-t-red-400 rounded-full animate-spin" />{" "}
              Cancelling...
            </>
          ) : (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel Trade
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function EscrowPage() {
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("create");
  const [step, setStep] = useState<Step>("idle");

  // Create trade form
  const [buyerAddress, setBuyerAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  // Lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupIdNum, setLookupIdNum] = useState<bigint | undefined>(undefined);

  // My trades (track IDs manually after creating)
  const [myTradeIds, setMyTradeIds] = useState<number[]>([0, 1]); // seed with 0,1 for demo

  // Active action IDs
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // ── Contract writes ──
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: createTrade, data: createTxHash } = useWriteContract();
  const { writeContract: confirmTrade } = useWriteContract();
  const { writeContract: cancelTrade } = useWriteContract();

  // ── Wait for approve ──
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // ── Wait for createTrade ──
  const { isSuccess: createConfirmed, isLoading: createConfirming } =
    useWaitForTransactionReceipt({ hash: createTxHash });

  // ── Lookup trade ──
  const { data: lookedUpTrade } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getTrade",
    args: lookupIdNum !== undefined ? [lookupIdNum] : undefined,
    query: { enabled: lookupIdNum !== undefined },
  }) as { data: Trade | undefined };

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // After approval confirmed → fire createTrade
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      setStep("approved");
      const parsedAmount = parseUnits(amount, 18);
      createTrade({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "createTrade",
        args: [
          buyerAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          parsedAmount,
          description,
        ],
      });
      setStep("creating");
    }
  }, [approveConfirmed, step]);

  // After create confirmed
  useEffect(() => {
    if (createConfirmed && step === "creating") {
      setStep("done");
    }
  }, [createConfirmed, step]);

  // ── Validate + kick off approve ──
  const handleCreateTrade = () => {
    setFormError("");
    if (!isAddress(buyerAddress)) return setFormError("Invalid buyer address");
    if (!isAddress(tokenAddress)) return setFormError("Invalid token address");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return setFormError("Enter a valid amount");
    if (!description.trim()) return setFormError("Add a description");
    if (buyerAddress.toLowerCase() === address?.toLowerCase())
      return setFormError("You cannot trade with yourself");

    setStep("approving");
    const parsedAmount = parseUnits(amount, 18);

    approve({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, parsedAmount],
    });
  };

  const handleConfirm = (tradeId: number) => {
    setConfirmingId(tradeId);
    confirmTrade({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "confirmTrade",
      args: [BigInt(tradeId)],
    });
  };

  const handleCancel = (tradeId: number) => {
    setCancellingId(tradeId);
    cancelTrade({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cancelTrade",
      args: [BigInt(tradeId)],
    });
  };

  const handleLookup = () => {
    const id = parseInt(lookupId);
    if (!isNaN(id) && id >= 0) setLookupIdNum(BigInt(id));
  };

  const handleReset = () => {
    setStep("idle");
    setBuyerAddress("");
    setTokenAddress("");
    setAmount("");
    setDescription("");
    setFormError("");
  };

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "create", label: "Create Trade" },
    { key: "mytrades", label: "My Trades" },
    { key: "lookup", label: "Lookup" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-10">
          {/* ── PAGE HEADER ── */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Trustless Trade
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Escrow
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Lock tokens in a smart contract until both parties agree.
            </p>
          </div>

          {/* ── HOW IT WORKS ── */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              {
                n: "1",
                label: "Seller deposits",
                desc: "Tokens locked in contract",
              },
              {
                n: "2",
                label: "Buyer confirms",
                desc: "Releases tokens to buyer",
              },
              { n: "3", label: "Or seller cancels", desc: "Gets tokens back" },
            ].map(({ n, label, desc }) => (
              <div
                key={n}
                className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800"
              >
                <span className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-black flex items-center justify-center">
                  {n}
                </span>
                <p className="text-xs font-bold text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          {/* ── TAB BAR ── */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
                  tab === key
                    ? "bg-zinc-950 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 
              CREATE TRADE TAB
          */}
          {tab === "create" && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
              {/* Success */}
              {step === "done" && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-violet-400 mb-1">
                      Trade Created!
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      Tokens are locked. Share the trade ID with your buyer.
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition-all"
                  >
                    Create Another
                  </button>
                </div>
              )}

              {/* Approval step indicator */}
              {(step === "approving" ||
                step === "approved" ||
                step === "creating") && (
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
                  {(step === "creating" || step === "approved") && (
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                        step === "creating"
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      {step === "creating" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                          <p className="text-xs font-mono text-amber-400">
                            Step 2/2 — Creating trade on-chain...
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-mono text-zinc-500">
                          Step 2/2 — Create trade
                        </p>
                      )}
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

                  {/* Buyer address */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Buyer Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl bg-zinc-950 border text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                        buyerAddress && isAddress(buyerAddress)
                          ? "border-violet-500/50"
                          : "border-zinc-700 focus:border-zinc-500"
                      }`}
                    />
                    {buyerAddress && isAddress(buyerAddress) && (
                      <p className="text-xs text-violet-400 font-mono">
                        ✓ Valid address
                      </p>
                    )}
                  </div>

                  {/* Token address */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Token Contract Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x... (ERC-20 token address)"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl bg-zinc-950 border text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                        tokenAddress && isAddress(tokenAddress)
                          ? "border-violet-500/50"
                          : "border-zinc-700 focus:border-zinc-500"
                      }`}
                    />
                    <p className="text-xs text-zinc-600 font-mono">
                      Enter the ERC-20 contract address of the token to lock
                    </p>
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
                        className="w-full px-4 py-3.5 pr-20 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-500">
                        TOKENS
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Description
                    </label>
                    <textarea
                      placeholder="What is this trade for? e.g. Payment for design work"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Summary */}
                  {buyerAddress &&
                    isAddress(buyerAddress) &&
                    tokenAddress &&
                    isAddress(tokenAddress) &&
                    amount &&
                    parseFloat(amount) > 0 && (
                      <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 flex flex-col gap-2">
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                          What will happen
                        </p>
                        <p className="text-xs font-mono text-zinc-400">
                          1. You approve the escrow contract to spend{" "}
                          <span className="text-white">{amount} tokens</span>
                        </p>
                        <p className="text-xs font-mono text-zinc-400">
                          2. Tokens are locked in the contract
                        </p>
                        <p className="text-xs font-mono text-zinc-400">
                          3. Buyer at{" "}
                          <span className="text-white">
                            {buyerAddress.slice(0, 10)}...
                          </span>{" "}
                          confirms to release
                        </p>
                      </div>
                    )}

                  {/* Submit */}
                  <button
                    onClick={handleCreateTrade}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-violet-500 hover:bg-violet-400 active:scale-95 text-white font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25"
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
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Lock Tokens in Escrow
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════
              MY TRADES TAB
          ════════════════════════════ */}
          {tab === "mytrades" && (
            <div className="flex flex-col gap-4">
              {myTradeIds.length === 0 ? (
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
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">
                    No trades yet. Create one to get started.
                  </p>
                </div>
              ) : (
                myTradeIds.map((id) => (
                  <TradeCardWrapper
                    key={id}
                    tradeId={id}
                    currentAddress={address}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isConfirming={confirmingId === id}
                    isCancelling={cancellingId === id}
                  />
                ))
              )}
            </div>
          )}

          {/* ════════════════════════════
              LOOKUP TAB
          ════════════════════════════ */}
          {tab === "lookup" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
                  Trade ID Lookup
                </p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Enter trade ID e.g. 0"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-500 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
                  />
                  <button
                    onClick={handleLookup}
                    className="px-5 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all"
                  >
                    Search
                  </button>
                </div>
              </div>

              {lookedUpTrade && lookupIdNum !== undefined && (
                <TradeCard
                  tradeId={Number(lookupIdNum)}
                  trade={lookedUpTrade}
                  currentAddress={address}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  isConfirming={confirmingId === Number(lookupIdNum)}
                  isCancelling={cancellingId === Number(lookupIdNum)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wrapper that fetches a single trade by ID ──
function TradeCardWrapper({
  tradeId,
  currentAddress,
  onConfirm,
  onCancel,
  isConfirming,
  isCancelling,
}: {
  tradeId: number;
  currentAddress?: string;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  isConfirming: boolean;
  isCancelling: boolean;
}) {
  const { data: trade } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getTrade",
    args: [BigInt(tradeId)],
  }) as { data: Trade | undefined };

  if (!trade) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
        <span className="text-xs font-mono text-zinc-500">
          Loading trade #{tradeId}...
        </span>
      </div>
    );
  }

  return (
    <TradeCard
      tradeId={tradeId}
      trade={trade}
      currentAddress={currentAddress}
      onConfirm={onConfirm}
      onCancel={onCancel}
      isConfirming={isConfirming}
      isCancelling={isCancelling}
    />
  );
}
