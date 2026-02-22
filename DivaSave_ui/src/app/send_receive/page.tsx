"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther, formatEther, isAddress } from "viem";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/nav_bar";

const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── Escrow ABI (ETH version) ──
const ESCROW_ABI = [
  {
    name: "createTradeETH",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Tab = "send" | "receive";

export default function SendReceivePage() {
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  // ── UI state ──
  const [tab, setTab] = useState<Tab>("send");
  const [useEscrow, setUseEscrow] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{
    to?: string;
    amount?: string;
    desc?: string;
  }>({});
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── ETH balance ──
  const { data: ethBalance } = useBalance({ address });

  // ── Direct ETH send ──
  const {
    sendTransaction,
    data: ethTxHash,
    isPending: ethPending,
    isError: ethError,
    error: ethErrorMsg,
    reset: resetEth,
  } = useSendTransaction();

  const { isLoading: ethConfirming, isSuccess: ethConfirmed } =
    useWaitForTransactionReceipt({ hash: ethTxHash });

  // ── Escrow ETH send ──
  const {
    writeContract: createEscrow,
    data: escrowTxHash,
    isPending: escrowPending,
    isError: escrowError,
    error: escrowErrorMsg,
    reset: resetEscrow,
  } = useWriteContract();
  const { isLoading: escrowConfirming, isSuccess: escrowConfirmed } =
    useWaitForTransactionReceipt({ hash: escrowTxHash });

  // ── Derived ──
  const isPending = useEscrow ? escrowPending : ethPending;
  const isConfirming = useEscrow ? escrowConfirming : ethConfirming;
  const isConfirmed = useEscrow ? escrowConfirmed : ethConfirmed;
  const isError = useEscrow ? escrowError : ethError;
  const errorMsg = useEscrow ? escrowErrorMsg : ethErrorMsg;
  const txHash = useEscrow ? escrowTxHash : ethTxHash;

  const ethBalNum = ethBalance ? parseFloat(formatEther(ethBalance.value)) : 0;

  const usdEstimate =
    amount && !isNaN(parseFloat(amount))
      ? (parseFloat(amount) * 2450).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })
      : null;

  // Auth guard
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // Watch for confirmation
  useEffect(() => {
    if (isConfirmed) setSuccess(true);
  }, [isConfirmed]);

  // ── Validate ──
  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!isAddress(toAddress)) e.to = "Enter a valid Ethereum address";
    if (!amount || parseFloat(amount) <= 0) e.amount = "Enter a valid amount";
    else if (parseFloat(amount) > ethBalNum)
      e.amount = "Exceeds your ETH balance";
    if (useEscrow && !description.trim())
      e.desc = "Add a description for this escrow payment";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Send handler ──
  const handleSend = () => {
    if (!validate()) return;

    if (useEscrow) {
      // Escrow flow
      createEscrow({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "createTradeETH",
        args: [toAddress as `0x${string}`, description],
        value: parseEther(amount),
      });
    } else {
      // Direct transfer
      sendTransaction({
        to: toAddress as `0x${string}`,
        value: parseEther(amount),
      });
    }
  };

  const handleReset = () => {
    resetEth();
    resetEscrow();
    setSuccess(false);
    setToAddress("");
    setAmount("");
    setDescription("");
    setErrors({});
  };

  const handleSetMax = () => {
    const max = Math.max(0, ethBalNum - 0.001); // leave gas buffer
    setAmount(max.toFixed(6));
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-2xl mx-auto px-6 py-8 lg:py-10">
          {/* ── HEADER ── */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Wallet
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Send & Receive ETH
            </h1>
          </div>

          {/* ── BALANCE ── */}
          <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                Your Balance
              </p>
              <p className="text-xl font-black tracking-tight">
                {ethBalNum.toFixed(4)}{" "}
                <span className="text-zinc-400 font-bold text-base">ETH</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live balance
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-6">
            {(["send", "receive"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
                  tab === t
                    ? "bg-zinc-950 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "send" ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
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
                    Receive
                  </>
                )}
              </button>
            ))}
          </div>

          {/* ════════════════════
              SEND TAB
          ════════════════════ */}
          {tab === "send" && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
              {/* ── SUCCESS ── */}
              {success && (
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
                      {useEscrow ? "Escrow Created!" : "Sent Successfully!"}
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono">
                      {useEscrow
                        ? `${amount} ETH locked in escrow until ${toAddress.slice(
                            0,
                            10
                          )}... confirms`
                        : `${amount} ETH sent to ${toAddress.slice(0, 10)}...`}
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-zinc-500 hover:text-emerald-400 underline underline-offset-4 transition-colors"
                    >
                      View on BaseScan →
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold transition-all"
                  >
                    Send Again
                  </button>
                </div>
              )}

              {/* ── FORM ── */}
              {!success && (
                <div className="flex flex-col gap-5">
                  {/* ── ESCROW TOGGLE ── */}
                  <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20">
                    <input
                      type="checkbox"
                      id="escrow"
                      checked={useEscrow}
                      onChange={(e) => setUseEscrow(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-violet-500"
                    />
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="escrow"
                        className="text-sm font-bold text-violet-400 cursor-pointer"
                      >
                        Use escrow protection
                      </label>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Lock ETH in a smart contract until the recipient
                        confirms they received what they paid for. Both parties
                        are protected.
                      </p>
                    </div>
                  </div>

                  {/* ── ERROR BANNER ── */}
                  {isError && (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f87171"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 mt-0.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p className="text-xs text-red-400 font-mono leading-relaxed">
                        {errorMsg?.message?.slice(0, 140) ??
                          "Transaction failed"}
                      </p>
                    </div>
                  )}

                  {/* ── TO ADDRESS ── */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={toAddress}
                      onChange={(e) => {
                        setToAddress(e.target.value);
                        setErrors((p) => ({ ...p, to: undefined }));
                      }}
                      className={`w-full px-4 py-3.5 rounded-xl bg-zinc-950 border text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                        errors.to
                          ? "border-red-500/50"
                          : toAddress && isAddress(toAddress)
                          ? "border-emerald-500/40"
                          : "border-zinc-700 focus:border-zinc-500"
                      }`}
                    />
                    {errors.to && (
                      <p className="text-xs text-red-400 font-mono">
                        {errors.to}
                      </p>
                    )}
                    {toAddress && isAddress(toAddress) && !errors.to && (
                      <p className="text-xs text-emerald-400 font-mono">
                        ✓ Valid address
                      </p>
                    )}
                  </div>

                  {/* ── AMOUNT ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Amount (ETH)
                      </label>
                      <button
                        onClick={handleSetMax}
                        className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Max: {ethBalNum.toFixed(4)} ETH
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setErrors((p) => ({ ...p, amount: undefined }));
                        }}
                        className={`w-full px-4 py-3.5 pr-16 rounded-xl bg-zinc-950 border text-sm font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                          errors.amount
                            ? "border-red-500/50"
                            : "border-zinc-700 focus:border-zinc-500"
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-500">
                        ETH
                      </span>
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-red-400 font-mono">
                        {errors.amount}
                      </p>
                    )}
                    {usdEstimate && !errors.amount && (
                      <p className="text-xs font-mono text-zinc-500">
                        ≈ {usdEstimate} USD
                      </p>
                    )}
                  </div>

                  {/* ── DESCRIPTION (escrow only) ── */}
                  {useEscrow && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Payment Description
                      </label>
                      <textarea
                        placeholder="What is this payment for? (e.g., 'Payment for freelance design work')"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setErrors((p) => ({ ...p, desc: undefined }));
                        }}
                        rows={2}
                        className={`w-full px-4 py-3.5 rounded-xl bg-zinc-950 border text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all resize-none ${
                          errors.desc
                            ? "border-red-500/50"
                            : "border-zinc-700 focus:border-zinc-500"
                        }`}
                      />
                      {errors.desc && (
                        <p className="text-xs text-red-400 font-mono">
                          {errors.desc}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── SUMMARY BOX ── */}
                  {toAddress &&
                    isAddress(toAddress) &&
                    amount &&
                    parseFloat(amount) > 0 &&
                    (!useEscrow || (useEscrow && description)) && (
                      <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 flex flex-col gap-2">
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                          Summary
                        </p>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Sending</span>
                          <span className="text-zinc-200">{amount} ETH</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">To</span>
                          <span className="text-zinc-200">
                            {toAddress.slice(0, 10)}...{toAddress.slice(-6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-500">Method</span>
                          <span
                            className={
                              useEscrow ? "text-violet-400" : "text-emerald-400"
                            }
                          >
                            {useEscrow
                              ? "Escrow (protected)"
                              : "Direct transfer"}
                          </span>
                        </div>
                        {useEscrow && description && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-500">Note</span>
                            <span className="text-zinc-200 text-right max-w-[60%] truncate">
                              {description}
                            </span>
                          </div>
                        )}
                        {!useEscrow && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-500">Est. gas</span>
                            <span className="text-zinc-400">~0.0005 ETH</span>
                          </div>
                        )}
                        {usdEstimate && (
                          <>
                            <div className="h-px bg-zinc-800 my-1" />
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-500">USD value</span>
                              <span className="text-emerald-400">
                                {usdEstimate}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  {/* ── CONFIRMING INDICATOR ── */}
                  {isConfirming && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full animate-spin shrink-0" />
                      <p className="text-xs font-mono text-amber-400">
                        Waiting for on-chain confirmation...
                      </p>
                    </div>
                  )}

                  {/* ── SEND BUTTON ── */}
                  <button
                    onClick={handleSend}
                    disabled={isPending || isConfirming}
                    className={`w-full flex items-center justify-center gap-2.5 py-4 px-5 rounded-xl font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 active:scale-95 ${
                      useEscrow
                        ? "bg-violet-500 hover:bg-violet-400 text-white hover:shadow-violet-500/25"
                        : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:shadow-emerald-500/25"
                    }`}
                  >
                    {isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-950 rounded-full animate-spin" />
                        Confirm in wallet...
                      </>
                    ) : isConfirming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-950 rounded-full animate-spin" />
                        Broadcasting...
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
                          {useEscrow ? (
                            <>
                              <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                              />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </>
                          ) : (
                            <>
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </>
                          )}
                        </svg>
                        {useEscrow ? "Lock in Escrow" : "Send ETH"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════
              RECEIVE TAB
          ════════════════════ */}
          {tab === "receive" && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center gap-6">
              <div className="text-center">
                <h3 className="text-base font-bold mb-1">
                  Your Wallet Address
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  Same address works on all EVM chains (Ethereum, Base, Scroll,
                  Arbitrum, etc.)
                </p>
              </div>
              <div className="w-48 h-48 rounded-2xl bg-zinc-950 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-3">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3f3f46"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="3" height="3" />
                  <rect x="19" y="14" width="2" height="2" />
                  <rect x="14" y="19" width="2" height="2" />
                  <rect x="18" y="18" width="3" height="3" />
                </svg>
                <p className="text-xs font-mono text-zinc-600 text-center px-4">
                  QR code coming soon
                </p>
              </div>
              <div className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3.5">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
                  Wallet address
                </p>
                <p className="text-xs font-mono text-zinc-200 break-all leading-relaxed">
                  {address}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-150 ${
                  copied
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200"
                }`}
              >
                {copied ? (
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
                    Copied!
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
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Address
                  </>
                )}
              </button>
              <div className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-xs font-mono text-amber-400/80 leading-relaxed">
                  Make sure the sender is on the same network (Base, Scroll,
                  etc.) as you. ETH sent on Base cannot be received on Ethereum
                  mainnet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
