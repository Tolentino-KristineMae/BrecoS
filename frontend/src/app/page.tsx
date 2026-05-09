"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: number;
  sender_name: string | null;
  amount: number;
  type: "credit" | "deduction";
  reference_number: string | null;
  transaction_date: string;
  note: string | null;
  created_at: string;
};

type Analytics = {
  totalTransactions: number;
  totalCredits: number;
  totalDeductions: number;
  runningTotal: number;
};

const API_BASE = "http://localhost:5000/api";
const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalTransactions: 0, totalCredits: 0, totalDeductions: 0, runningTotal: 0 });
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [txRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/analytics`),
      ]);
      setTransactions(txRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recent = transactions.slice(0, 8);
  const isPositive = analytics.runningTotal >= 0;

  return (
    <main className="flex-1 overflow-auto bg-slate-100">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overview</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">Dashboard</h1>
          </div>
          <Link href="/upload"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 shadow-sm shadow-indigo-200 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Hero + stat cards */}
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Running total hero */}
          <div className={`lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between min-h-[140px] shadow-sm ${
            isPositive
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200"
              : "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200"
          }`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Running Total</p>
            <div>
              <p className="text-3xl font-black text-white mt-2">
                {isPositive ? "+" : ""}₱{fmt(analytics.runningTotal)}
              </p>
              <p className="text-xs text-white/60 mt-1">Credits minus deductions</p>
            </div>
          </div>

          {/* Stat cards */}
          <StatCard label="Transactions" value={analytics.totalTransactions.toString()} sub="total entries"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            iconBg="bg-blue-100 text-blue-600" />
          <StatCard label="Total Credits" value={`₱${fmt(analytics.totalCredits)}`} sub="money in"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
            iconBg="bg-emerald-100 text-emerald-600" />
          <StatCard label="Total Deductions" value={`₱${fmt(analytics.totalDeductions)}`} sub="money out"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>}
            iconBg="bg-rose-100 text-rose-600" />
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest 8 entries across all accounts</p>
            </div>
            <Link href="/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
              View all <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first entry to get started</p>
              <Link href="/upload" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Add entry →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sender</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Ref No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map((tx) => (
                    <tr key={tx.id} onClick={() => setActiveTransaction(tx)}
                      className="cursor-pointer hover:bg-slate-50 transition group">
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          tx.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                        }`}>
                          {tx.type === "credit" ? "↑" : "↓"} {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{tx.sender_name || "—"}</td>
                      <td className={`px-6 py-3.5 text-right font-mono font-semibold ${tx.type === "credit" ? "text-emerald-700" : "text-rose-600"}`}>
                        {tx.type === "credit" ? "+" : "−"}₱{fmt(tx.amount)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{tx.reference_number || "—"}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">{new Date(tx.transaction_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { href: "/transactions", label: "View Ledger", desc: "All transactions", color: "from-blue-500 to-indigo-600" },
            { href: "/batch", label: "Batch Checker", desc: "Verify & group", color: "from-violet-500 to-purple-600" },
            { href: "/upload", label: "Add Entry", desc: "Manual entry", color: "from-emerald-500 to-teal-600" },
            { href: "/analytics", label: "Analytics", desc: "Insights & trends", color: "from-amber-500 to-orange-600" },
          ].map(q => (
            <Link key={q.href} href={q.href}
              className={`rounded-2xl bg-gradient-to-br ${q.color} p-4 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
              <p className="text-sm font-bold">{q.label}</p>
              <p className="text-xs text-white/70 mt-0.5">{q.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {activeTransaction && (
        <TransactionModal tx={activeTransaction} onClose={() => setActiveTransaction(null)} />
      )}
    </main>
  );
}

function StatCard({ label, value, sub, icon, iconBg }: { label: string; value: string; sub: string; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Transaction Details</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <Detail label="Type" value={tx.type} />
          <Detail label="Amount" value={`${tx.type === "credit" ? "+" : "−"}₱${tx.amount.toFixed(2)}`} />
          <Detail label="Sender" value={tx.sender_name || "—"} />
          <Detail label="Ref No." value={tx.reference_number || "—"} />
          <Detail label="Date" value={new Date(tx.transaction_date).toLocaleString()} />
          {tx.note && <Detail label="Note" value={tx.note} />}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
