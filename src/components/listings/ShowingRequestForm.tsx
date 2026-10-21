"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

interface Props {
  listingId: string;
  address: string;
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent";

export default function ShowingRequestForm({ listingId, address }: Props) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Signed-in clients don't retype their details
  useEffect(() => {
    if (!open || prefill) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user;
        setPrefill(
          u
            ? { name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(), email: u.email ?? "", phone: u.phone ?? "" }
            : { name: "", email: "", phone: "" }
        );
      })
      .catch(() => setPrefill({ name: "", email: "", phone: "" }));
  }, [open, prefill]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/showing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          preferredTimes: form.get("preferredTimes"),
          message: form.get("message"),
          website: form.get("website"),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Something went wrong. Please call or email instead.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please call or email instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        <div className="font-medium">Request sent</div>
        <p className="mt-1">
          Cory will get back to you to confirm a time for {address}. For anything urgent, call (416) 498-9995.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Request a Showing
      </button>
    );
  }

  if (!prefill) return <div className="h-64 bg-slate-100 rounded-md animate-pulse" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium text-slate-900">Request a showing</h3>
      <input name="name" required defaultValue={prefill.name} placeholder="Your name *" className={inputClass} />
      <input name="email" type="email" required defaultValue={prefill.email} placeholder="Email *" className={inputClass} />
      <input name="phone" type="tel" defaultValue={prefill.phone} placeholder="Phone" className={inputClass} />
      <textarea
        name="preferredTimes"
        required
        rows={2}
        placeholder="When works for you? e.g. Sat morning, weekdays after 6 *"
        className={inputClass}
      />
      <textarea name="message" rows={2} placeholder="Anything else? (optional)" className={inputClass} />
      {/* Honeypot for bots; hidden from people and screen readers */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Sending..." : "Send request"}
      </button>
      <p className="text-xs text-slate-500">
        Cory Wong, Broker, will use these details to arrange this showing. See the{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
