"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TRANSACTION_TYPES = [
  {
    type: "BUYER",
    title: "Buyer",
    description:
      "Representing a buyer in a property purchase. Includes pre-approval, offer, conditions, and closing stages.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
    color: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
    selectedColor: "border-blue-500 bg-blue-50 ring-2 ring-blue-200",
    iconColor: "text-blue-600",
  },
  {
    type: "SELLER",
    title: "Seller",
    description:
      "Representing a seller in a property sale. Includes listing prep, active listing, offer review, and closing stages.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "border-purple-200 hover:border-purple-400 hover:bg-purple-50",
    selectedColor: "border-purple-500 bg-purple-50 ring-2 ring-purple-200",
    iconColor: "text-purple-600",
  },
  {
    type: "LEASE",
    title: "Lease",
    description:
      "Representing a landlord or tenant in a lease agreement. Includes setup, screening, agreement, and move-in stages.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
        />
      </svg>
    ),
    color: "border-teal-200 hover:border-teal-400 hover:bg-teal-50",
    selectedColor: "border-teal-500 bg-teal-50 ring-2 ring-teal-200",
    iconColor: "text-teal-600",
  },
  {
    type: "ASSIGNMENT",
    title: "Assignment",
    description:
      "Managing an assignment sale of a pre-construction contract. Includes setup, marketing, builder consent, and legal closing.",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
    ),
    color: "border-orange-200 hover:border-orange-400 hover:bg-orange-50",
    selectedColor: "border-orange-500 bg-orange-50 ring-2 ring-orange-200",
    iconColor: "text-orange-600",
  },
];

export default function NewTransactionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType || !address.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        type: selectedType,
        address: address.trim(),
      };
      if (mlsNumber.trim()) body.mlsNumber = mlsNumber.trim();
      if (listPrice.trim()) body.listPrice = listPrice.trim();
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create transaction");
      }

      const data = await res.json();
      router.push(`/transactions/${data.transaction?.id || data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Transactions
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          New Transaction
        </h1>
        <p className="text-slate-500 mt-1">
          Create a new real estate transaction to start tracking.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            step === 1 ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1
                ? "bg-blue-600 text-white"
                : selectedType
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {step > 1 ? (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              "1"
            )}
          </span>
          Transaction Type
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            step === 2 ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            2
          </span>
          Details
        </div>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Select Transaction Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRANSACTION_TYPES.map((tt) => (
              <button
                key={tt.type}
                type="button"
                onClick={() => setSelectedType(tt.type)}
                className={`text-left p-5 rounded-lg border-2 transition-all ${
                  selectedType === tt.type ? tt.selectedColor : tt.color
                }`}
              >
                <div className={`mb-3 ${tt.iconColor}`}>{tt.icon}</div>
                <div className="font-semibold text-slate-900">{tt.title}</div>
                <p className="text-sm text-slate-500 mt-1">{tt.description}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!selectedType}
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Transaction Details
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Creating a{" "}
            <span className="font-medium text-slate-700">
              {selectedType?.charAt(0)}
              {selectedType?.slice(1).toLowerCase()}
            </span>{" "}
            transaction.{" "}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Change type
            </button>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Property Address{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, Toronto, ON M5V 1A1"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mlsNumber"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  MLS Number
                </label>
                <input
                  id="mlsNumber"
                  type="text"
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  placeholder="W1234567"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="listPrice"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  List Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    $
                  </span>
                  <input
                    id="listPrice"
                    type="text"
                    value={listPrice}
                    onChange={(e) =>
                      setListPrice(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this transaction..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !address.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {submitting ? "Creating..." : "Create Transaction"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
