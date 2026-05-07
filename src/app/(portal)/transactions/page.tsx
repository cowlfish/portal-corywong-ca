"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface TransactionStage {
  id: string;
  name: string;
  isComplete: boolean;
  dueDate: string | null;
}

interface Transaction {
  id: string;
  transactionType: string;
  status: string;
  address: string;
  mlsNumber: string | null;
  listPrice: string | null;
  salePrice: string | null;
  closingDate: string | null;
  updatedAt: string;
  stages: TransactionStage[];
  _count: { documents: number };
}

interface UserInfo {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
  CONDITIONAL: "bg-amber-50 text-amber-700 border-amber-200",
  FIRM: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-300",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const TYPE_COLORS: Record<string, string> = {
  BUYER: "bg-blue-100 text-blue-800",
  SELLER: "bg-purple-100 text-purple-800",
  LEASE: "bg-teal-100 text-teal-800",
  ASSIGNMENT: "bg-orange-100 text-orange-800",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
        <div className="h-5 w-20 bg-slate-200 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
      <div className="h-2 w-full bg-slate-100 rounded-full mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-100 rounded" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/transactions").then((r) => r.json()),
    ])
      .then(([userData, txnData]) => {
        setUser(userData.user || null);
        setTransactions(txnData.transactions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">
            Manage your real estate transactions and documents
          </p>
        </div>
        {user?.role === "AGENT" && (
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Transaction
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-slate-500 text-lg font-medium">
            No transactions yet
          </p>
          <p className="text-slate-400 mt-1">
            {user?.role === "AGENT"
              ? "Create your first transaction to get started."
              : "Your agent will link you to a transaction once one is started."}
          </p>
          {user?.role === "AGENT" && (
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Transaction
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {transactions.map((txn) => {
            const completedStages = txn.stages.filter(
              (s) => s.isComplete
            ).length;
            const totalStages = txn.stages.length;
            const progress =
              totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

            return (
              <Link
                key={txn.id}
                href={`/transactions/${txn.id}`}
                className="block bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      TYPE_COLORS[txn.transactionType] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {txn.transactionType}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      STATUS_COLORS[txn.status] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {txn.status}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                  {txn.address}
                </h3>

                {txn.mlsNumber && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    MLS# {txn.mlsNumber}
                  </p>
                )}

                {totalStages > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Stage Progress</span>
                      <span>
                        {completedStages} / {totalStages}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 rounded-full h-1.5 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>{txn._count.documents} docs</span>
                  </div>
                  {txn.updatedAt && (
                    <span className="text-xs text-slate-400">
                      Updated{" "}
                      {new Date(txn.updatedAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
