"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ACCOUNTS = ["Babilyn", "Kristine", "Nixie"] as const;
const API_BASE = "http://localhost:5000/api";

export default function UploadPage() {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "deduction">("credit");
  const [account, setAccount] = useState<string>(ACCOUNTS[0]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError("Valid amount is required."); return; }
    if (!transactionDate) { setError("Transaction date is required."); return; }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/transactions`, {
        sender_name: null,
        amount: amountNum,
        type,
        account,
        reference_number: referenceNumber.trim() || null,
        transaction_date: transactionDate + "T00:00:00",
        note: note.trim() || null,
      });
      router.push("/transactions");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save transaction.");
    } finally { setSaving(false); }
  };

  return (
    <main className="flex-1 overflow-auto bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Entry</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">Add Transaction</h1>
      </div>

      <div className="px-8 py-6">
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Transaction Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">Fill in the details below to record a new entry</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Type toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["credit", "deduction"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`rounded-xl py-2.5 text-sm font-semibold border-2 transition ${
                        type === t
                          ? t === "credit"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      {t === "credit" ? "↑ Credit" : "↓ Deduction"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Account</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNTS.map(a => (
                    <button key={a} type="button" onClick={() => setAccount(a)}
                      className={`rounded-xl py-2 text-sm font-semibold border-2 transition ${
                        account === a
                          ? a === "Babilyn" ? "border-sky-500 bg-sky-50 text-sky-700"
                          : a === "Kristine" ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700"
                          : "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Amount (₱)</label>
                <input type="number" min="0.01" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-right font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white" />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Date</label>
                <input type="date" value={transactionDate}
                  onChange={e => setTransactionDate(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white" />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Reference Number <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                <input type="text" value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. 12345"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white" />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Note <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Optional description" rows={3}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white resize-none" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm py-3 shadow-sm shadow-indigo-200 transition">
                {saving ? "Saving…" : "Save Transaction"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
