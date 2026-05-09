"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";

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

const API_BASE = "http://localhost:5000/api";
const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState({ totalTransactions: 0, totalCredits: 0, totalDeductions: 0, runningTotal: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [txRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/analytics`),
      ]);
      setTransactions(txRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Monthly breakdown
  const monthMap: Record<string, { credits: number; deductions: number }> = {};
  for (const tx of transactions) {
    const date = new Date(tx.transaction_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { credits: 0, deductions: 0 };
    if (tx.type === "credit") monthMap[key].credits += tx.amount;
    else monthMap[key].deductions += tx.amount;
  }
  const months = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const maxBar = Math.max(...months.flatMap(([, v]) => [v.credits, v.deductions]), 1);

  // Top senders
  const senderMap: Record<string, { credits: number; deductions: number; count: number }> = {};
  for (const tx of transactions) {
    const name = tx.sender_name || "Unknown";
    if (!senderMap[name]) senderMap[name] = { credits: 0, deductions: 0, count: 0 };
    senderMap[name].count += 1;
    if (tx.type === "credit") senderMap[name].credits += tx.amount;
    else senderMap[name].deductions += tx.amount;
  }
  const topSenders = Object.entries(senderMap)
    .sort((a, b) => (b[1].credits + b[1].deductions) - (a[1].credits + a[1].deductions))
    .slice(0, 5);

  const avg = analytics.totalTransactions > 0
    ? (analytics.totalCredits + analytics.totalDeductions) / analytics.totalTransactions : 0;

  const isPositive = analytics.runningTotal >= 0;

  return (
    <main className="flex-1 overflow-auto bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Insights</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">Analytics</h1>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-2xl p-5 shadow-sm ${isPositive ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-rose-500 to-pink-600"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Running Total</p>
            <p className="mt-2 text-2xl font-black text-white">{isPositive ? "+" : ""}₱{fmt(analytics.runningTotal)}</p>
          </div>
          <StatCard label="Total Credits" value={`₱${fmt(analytics.totalCredits)}`} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Total Deductions" value={`₱${fmt(analytics.totalDeductions)}`} color="text-rose-600" bg="bg-rose-50" />
          <StatCard label="Avg. per Transaction" value={`₱${fmt(avg)}`} color="text-indigo-600" bg="bg-indigo-50" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Monthly bar chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900">Monthly Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-5">Credits vs deductions — last 6 months</p>
            <div className="flex gap-4 mb-5 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Credits</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" /> Deductions</span>
            </div>
            {months.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No data yet</div>
            ) : (
              <div className="space-y-5">
                {months.map(([month, data]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{month}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(data.credits / maxBar) * 100}%` }} />
                        </div>
                        <span className="w-28 text-right text-xs text-emerald-700 font-semibold">₱{fmt(data.credits)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bg-rose-400 transition-all" style={{ width: `${(data.deductions / maxBar) * 100}%` }} />
                        </div>
                        <span className="w-28 text-right text-xs text-rose-600 font-semibold">₱{fmt(data.deductions)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top senders */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900">Top Senders</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-5">By total transaction volume</p>
            {topSenders.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No data yet</div>
            ) : (
              <div className="space-y-3">
                {topSenders.map(([name, data], i) => (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400">{data.count} transaction{data.count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-emerald-700 font-semibold">+₱{fmt(data.credits)}</p>
                      {data.deductions > 0 && <p className="text-xs text-rose-500 font-semibold">−₱{fmt(data.deductions)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 shadow-sm p-5 ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
