"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { SingleAccountTable } from "@/components/AccountTable";

const ACCOUNTS = ["Babilyn", "Kristine", "Nixie"] as const;
type Account = typeof ACCOUNTS[number];

type Transaction = {
  id: number;
  amount: number;
  type: "credit" | "deduction";
  account: string | null;
  reference_number: string | null;
  transaction_date: string;
  note: string | null;
  batch_number: number | null;
  created_at: string;
};

const API_BASE = "http://localhost:5000/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "deduction">("all");
  const [filterAccount, setFilterAccount] = useState<Account>(ACCOUNTS[0]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const txRes = await axios.get(`${API_BASE}/transactions?account=${filterAccount}`);
      setTransactions(txRes.data.data || []);
    } catch { }
    finally { setIsLoading(false); }
  }, [filterAccount]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this transaction?")) return;
    setDeletingId(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await axios.delete(`${API_BASE}/transactions/${id}`);
    } catch {
      await fetchAll();
      alert("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      tx.reference_number?.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q) ||
      tx.note?.toLowerCase().includes(q);
    const matchType = filterType === "all" || tx.type === filterType;
    return matchSearch && matchType;
  });

  const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const txTotal = filtered.reduce((s, tx) => s + (tx.type === "credit" ? tx.amount : -tx.amount), 0);
  const totalCredits = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDeductions = filtered.filter(t => t.type === "deduction").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ledger</h1>
            <p className="text-sm text-gray-600 mt-0.5 font-medium">Financial transaction management</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..." 
                className="pl-10 pr-8 py-2 w-64 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 font-bold">✕</button>}
            </div>
            <span className="text-xs text-gray-700 bg-gray-200 px-2.5 py-1 rounded-full font-medium">{filtered.length} entries</span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-300 px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Account Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Account:</span>
            <select 
              value={filterAccount} 
              onChange={(e) => setFilterAccount(e.target.value as Account)}
              className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACCOUNTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Type:</span>
            <div className="flex rounded-lg p-0.5 bg-gray-100">
              {(["all", "credit", "deduction"] as const).map((t) => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                    filterType === t
                      ? t === "credit" ? "bg-emerald-600 text-white"
                      : t === "deduction" ? "bg-rose-600 text-white"
                      : "bg-gray-800 text-white"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 ml-auto text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-600 font-medium">Credits</p>
              <p className="font-semibold text-emerald-700">+₱ {fmt(totalCredits)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 font-medium">Deductions</p>
              <p className="font-semibold text-rose-700">−₱ {fmt(totalDeductions)}</p>
            </div>
            <div className={`px-3 py-2 rounded-lg font-semibold ${txTotal >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              ₱ {fmt(txTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <SingleAccountTable
          key={filterAccount}
          account={filterAccount}
          filterType={filterType}
          search={search}
          deletingId={deletingId}
          handleDelete={handleDelete}
          isLoading={isLoading}
          onSaved={fetchAll}
          transactions={filtered}
        />
      </div>
    </div>
  );
}