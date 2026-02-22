"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import Navbar from "@/components/nav_bar";

// Contract addresses
const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const SAVINGS_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ABIs for events
const ESCROW_ABI = [
  {
    name: "TradeCreated",
    type: "event",
    inputs: [
      { name: "trade_id", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "isETH", type: "bool", indexed: false },
    ],
  },
  {
    name: "TradeCompleted",
    type: "event",
    inputs: [{ name: "trade_id", type: "uint256", indexed: true }],
  },
  {
    name: "TradeCancelled",
    type: "event",
    inputs: [{ name: "trade_id", type: "uint256", indexed: true }],
  },
] as const;

const VAULT_ABI = [
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Withdrawn",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

type Transaction = {
  id: string;
  hash: string;
  type: string;
  asset: string;
  amount: string;
  to?: string;
  from?: string;
  timestamp: number;
  status: string;
  blockNumber: bigint;
};

type FilterType = "all" | "send" | "receive" | "escrow" | "savings" | "vault";

export default function HistoryPage() {
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterType>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // Fetch transactions from events
  useEffect(() => {
    if (!address || !publicClient) return;

    const fetchTransactions = async () => {
      setLoading(true);
      const allTxns: Transaction[] = [];

      try {
        // Get recent blocks (last 10000 blocks for demo)
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock =
          currentBlock > BigInt(10000)
            ? currentBlock - BigInt(10000)
            : BigInt(0);

        // ── FETCH ESCROW EVENTS ──
        // TradeCreated events where user is seller
        const escrowCreatedSeller = await publicClient.getLogs({
          address: ESCROW_ADDRESS,
          event: ESCROW_ABI[0],
          args: { seller: address },
          fromBlock,
          toBlock: "latest",
        });

        // TradeCreated events where user is buyer
        const escrowCreatedBuyer = await publicClient.getLogs({
          address: ESCROW_ADDRESS,
          event: ESCROW_ABI[0],
          args: { buyer: address },
          fromBlock,
          toBlock: "latest",
        });

        // Process escrow created events
        for (const log of [...escrowCreatedSeller, ...escrowCreatedBuyer]) {
          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber,
          });
          const isSeller =
            log.args.seller?.toLowerCase() === address.toLowerCase();

          allTxns.push({
            id: `escrow-create-${log.transactionHash}`,
            hash: log.transactionHash,
            type: "escrow_create",
            asset: log.args.isETH ? "ETH" : "Token",
            amount: `-${formatUnits(log.args.amount || BigInt(0), 18)}`,
            to: isSeller ? log.args.buyer : undefined,
            from: isSeller ? undefined : log.args.seller,
            timestamp: Number(block.timestamp) * 1000,
            status: "confirmed",
            blockNumber: log.blockNumber,
          });
        }

        // TradeCompleted events
        const escrowCompleted = await publicClient.getLogs({
          address: ESCROW_ADDRESS,
          event: ESCROW_ABI[1],
          fromBlock,
          toBlock: "latest",
        });

        for (const log of escrowCompleted) {
          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber,
          });
          allTxns.push({
            id: `escrow-complete-${log.transactionHash}`,
            hash: log.transactionHash,
            type: "escrow_confirm",
            asset: "ETH",
            amount: "+0.00",
            timestamp: Number(block.timestamp) * 1000,
            status: "confirmed",
            blockNumber: log.blockNumber,
          });
        }

        // TradeCancelled events
        const escrowCancelled = await publicClient.getLogs({
          address: ESCROW_ADDRESS,
          event: ESCROW_ABI[2],
          fromBlock,
          toBlock: "latest",
        });

        for (const log of escrowCancelled) {
          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber,
          });
          allTxns.push({
            id: `escrow-cancel-${log.transactionHash}`,
            hash: log.transactionHash,
            type: "escrow_cancel",
            asset: "ETH",
            amount: "+0.00",
            timestamp: Number(block.timestamp) * 1000,
            status: "confirmed",
            blockNumber: log.blockNumber,
          });
        }

        // Sort by block number (most recent first)
        allTxns.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setTransactions(allTxns);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address, publicClient]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredTxns =
    filter === "all"
      ? transactions
      : transactions.filter((tx) => {
          if (filter === "send") return tx.type === "send";
          if (filter === "receive") return tx.type === "receive";
          if (filter === "escrow") return tx.type.includes("escrow");
          if (filter === "savings") return tx.type.includes("savings");
          if (filter === "vault") return tx.type.includes("vault");
          return true;
        });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "send", label: "Sent" },
    { key: "receive", label: "Received" },
    { key: "escrow", label: "Escrow" },
    { key: "savings", label: "Savings" },
    { key: "vault", label: "Vault" },
  ];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      send: "Sent",
      receive: "Received",
      escrow_create: "Escrow Created",
      escrow_confirm: "Escrow Confirmed",
      escrow_cancel: "Escrow Cancelled",
      savings_create: "Savings Created",
      savings_withdraw: "Savings Withdrawn",
      vault_deposit: "Vault Deposit",
      vault_withdraw: "Vault Withdrawal",
    };
    return labels[type] ?? type;
  };

  const getTypeColor = (type: string) => {
    if (type === "send") return "text-red-400";
    if (type === "receive") return "text-emerald-400";
    if (type.includes("escrow")) return "text-violet-400";
    if (type.includes("savings")) return "text-emerald-400";
    if (type.includes("vault")) return "text-amber-400";
    return "text-zinc-400";
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="lg:pl-56">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-10">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
              // Activity
            </p>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Transaction History
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              All your on-chain activity from blockchain events
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  filter === key
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500 font-mono">
                Loading transactions from blockchain...
              </span>
            </div>
          )}

          {/* Transaction list */}
          {!loading && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              {filteredTxns.length === 0 ? (
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
                      <path d="M12 8v4l3 3" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">No transactions found</p>
                  <p className="text-xs text-zinc-600 max-w-sm">
                    Once you interact with savings, vault, or escrow, your
                    transactions will appear here.
                  </p>
                </div>
              ) : (
                filteredTxns.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/50 transition-colors ${
                      idx !== filteredTxns.length - 1
                        ? "border-b border-zinc-800"
                        : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                        tx.type === "send"
                          ? "bg-red-500/10 border-red-500/20"
                          : tx.type === "receive"
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : tx.type.includes("escrow")
                          ? "bg-violet-500/10 border-violet-500/20"
                          : tx.type.includes("savings")
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      {tx.type === "send" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-400"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                      {tx.type === "receive" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-400"
                        >
                          <polyline points="8 17 12 21 16 17" />
                          <line x1="12" y1="12" x2="12" y2="21" />
                          <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                        </svg>
                      )}
                      {tx.type.includes("escrow") && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-violet-400"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                      {tx.type.includes("savings") && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-400"
                        >
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      )}
                      {tx.type.includes("vault") && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-amber-400"
                        >
                          <rect x="2" y="3" width="20" height="18" rx="2" />
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                        </svg>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${getTypeColor(
                          tx.type
                        )}`}
                      >
                        {getTypeLabel(tx.type)}
                      </p>
                      <p className="text-xs font-mono text-zinc-500 truncate">
                        {tx.to && `To ${tx.to}`}
                        {tx.from && `From ${tx.from}`}
                        {!tx.to && !tx.from && `Tx ${tx.hash.slice(0, 10)}...`}
                      </p>
                    </div>

                    {/* Amount & time */}
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold font-mono ${
                          tx.amount.startsWith("+")
                            ? "text-emerald-400"
                            : tx.amount.startsWith("-")
                            ? "text-red-400"
                            : "text-zinc-300"
                        }`}
                      >
                        {tx.amount} {tx.asset}
                      </p>
                      <p className="text-xs font-mono text-zinc-500">
                        {formatTime(tx.timestamp)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tx.status}
                      </span>
                    </div>

                    {/* Link to explorer */}
                    <a
                      href={`https://chainscan-newton.0g.ai/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
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
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Info note */}
          {!loading && transactions.length > 0 && (
            <div className="mt-6 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
              <h3 className="text-sm font-bold text-blue-400 mb-2">
                📊 Real Blockchain Data
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This history is fetched directly from blockchain events emitted
                by your smart contracts. Showing transactions from the last
                ~10,000 blocks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
