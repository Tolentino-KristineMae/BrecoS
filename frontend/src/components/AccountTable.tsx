"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { batchColor, accountColor } from "@/lib/batchColors";

const API_BASE = "http://localhost:5000/api";
const ACCOUNTS = ["Babilyn", "Kristine", "Nixie"] as const;

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

type DraftRow = {
  date: string;
  amount: string;
  type: "credit" | "deduction";
  ref_note: string;
};

const emptyDraft = (): DraftRow => ({
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  type: "credit",
  ref_note: "",
});

const fmt = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Note autocomplete input ──────────────────────────────────────────────────

function NoteInput({
  value, suggestions, onChange, onKeyDown, onSelect, className,
}: {
  value: string;
  suggestions: string[];
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelect: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const hasLetters = /[a-zA-Z]/.test(value);
  const filtered = hasLetters && value.trim()
    ? suggestions.filter(s => s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : [];
  const showDropdown = open && filtered.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); return; }
      if (e.key === "Tab" || (e.key === "Enter" && filtered[highlighted])) {
        e.preventDefault(); onSelect(filtered[highlighted]); setOpen(false); return;
      }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    onKeyDown(e);
  };

  return (
    <div className="relative w-full">
      <input
        type="text" value={value} placeholder="Reference number or note"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {showDropdown && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden text-xs">
          {filtered.map((s, i) => (
            <li key={s}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                i === highlighted ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Single account table ─────────────────────────────────────────────────────

interface SingleAccountTableProps {
  account: string;
  filterType: "all" | "credit" | "deduction";
  search: string;
  deletingId: number | null;
  handleDelete: (id: number) => void;
  isLoading?: boolean;
  onSaved: () => void;
  globalNoteSuggestions?: string[];
  transactions?: Transaction[];
}

export function SingleAccountTable(props: SingleAccountTableProps) {
  const { account, filterType, search, deletingId, handleDelete, onSaved } = props;

  const [internalTx, setInternalTx] = useState<Transaction[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const [draft, setDraft] = useState<DraftRow>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  const isInternal = props.transactions === undefined;

  const fetchData = useCallback(async () => {
    if (!isInternal) return;
    try {
      const txRes = await axios.get(`${API_BASE}/transactions?account=${account}`);
      setInternalTx(txRes.data.data || []);
    } catch { }
    finally { setInternalLoading(false); }
  }, [account, isInternal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const transactions = isInternal ? internalTx : (props.transactions ?? []);
  const loading = isInternal ? internalLoading : (props.isLoading ?? false);

  const setDraftField = (field: keyof DraftRow, value: string) => {
    setDraft(p => ({ ...p, [field]: value }));
    setSaveError("");
  };

  const handleSave = async () => {
    const amount = parseFloat(draft.amount);
    if (!draft.amount || isNaN(amount) || amount <= 0) {
      setSaveError("Amount required.");
      amountRef.current?.focus();
      return;
    }
    if (!draft.date) { setSaveError("Date required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const isNumeric = /^\d+$/.test(draft.ref_note.trim());
      await axios.post(`${API_BASE}/transactions`, {
        amount,
        type: draft.type,
        account,
        reference_number: isNumeric ? draft.ref_note.trim() || null : null,
        transaction_date: draft.date + "T00:00:00",
        note: !isNumeric ? draft.ref_note.trim() || null : null,
      });
      setDraft(emptyDraft());
      if (isInternal) await fetchData();
      onSaved();
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || "Save failed.");
    } finally { setSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
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

  const txTotal = filtered.reduce((s, tx) => s + (tx.type === "credit" ? tx.amount : -tx.amount), 0);
  const draftAmount = parseFloat(draft.amount) || 0;
  const previewTotal = txTotal + (draftAmount > 0 ? (draft.type === "credit" ? draftAmount : -draftAmount) : 0);
  const totalCredits = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDeductions = filtered.filter(t => t.type === "deduction").reduce((s, t) => s + t.amount, 0);

  const localNoteSuggestions = Array.from(
    new Set(transactions.map(tx => tx.note).filter((n): n is string => !!n && /[a-zA-Z]/.test(n)).map(n => n.trim()))
  ).sort();
  const noteSuggestions = props.globalNoteSuggestions ?? localNoteSuggestions;

  const accountColors = accountColor(account);

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Account Header */}
      <div className={`px-5 py-3.5 border-b border-gray-200 ${accountColors.header}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${accountColors.dot}`}></span>
            <span className="font-semibold text-white">{account}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">+₱ {fmt(totalCredits)}</span>
            <span className="text-white font-medium">−₱ {fmt(totalDeductions)}</span>
            <span className={`px-3 py-1 rounded-md font-bold ${txTotal >= 0 ? "bg-white/90 text-gray-800" : "bg-rose-100 text-rose-800"}`}>
              ₱ {fmt(txTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 800 }}>
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <th className="w-12 px-3 py-2.5 text-center">#</th>
              <th className="w-32 px-3 py-2.5 text-left">Date</th>
              <th className="w-28 px-3 py-2.5 text-left">Type</th>
              <th className="w-36 px-3 py-2.5 text-right">Amount (₱)</th>
              <th className="px-3 py-2.5 text-left">Reference / Note</th>
              <th className="w-24 px-3 py-2.5 text-center">Batch</th>
              <th className="w-36 px-3 py-2.5 text-right">Running Total</th>
              <th className="w-12 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {/* Input Row */}
            <tr className="border-b-2 border-blue-200 bg-blue-50/30">
              <td className="px-3 py-2 text-center text-blue-500 font-bold">+</td>
              <td className="px-2 py-1.5">
                <input type="date" value={draft.date}
                  onChange={(e) => setDraftField("date", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </td>
              <td className="px-2 py-1.5">
                <select value={draft.type} onChange={(e) => setDraftField("type", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="credit">Credit</option>
                  <option value="deduction">Deduction</option>
                </select>
              </td>
              <td className="px-2 py-1.5">
                <input ref={amountRef} type="number" min="0.01" step="0.01"
                  value={draft.amount} placeholder="0.00"
                  onChange={(e) => setDraftField("amount", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full px-2.5 py-1.5 border rounded-md text-sm text-right font-mono focus:outline-none focus:ring-2 ${
                    saveError ? "border-rose-400" : "border-gray-300"
                  }`} />
              </td>
              <td className="px-2 py-1.5">
                <NoteInput
                  value={draft.ref_note}
                  suggestions={noteSuggestions}
                  onChange={(v) => setDraftField("ref_note", v)}
                  onKeyDown={handleKeyDown}
                  onSelect={(v) => setDraftField("ref_note", v)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="px-3 py-2 text-center text-gray-300 text-xs">—</td>
              <td className="px-3 py-2 text-right">
                {draftAmount > 0 && (
                  <span className={`font-mono font-semibold text-xs ${previewTotal >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    ₱ {fmt(previewTotal)}
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center">
                <button onClick={handleSave} disabled={saving}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "..." : "Save"}
                </button>
              </td>
            </tr>

            {saveError && (
              <tr className="bg-rose-50">
                <td colSpan={8} className="px-5 py-2 text-xs text-rose-600">{saveError}</td>
              </tr>
            )}
          </tbody>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading transactions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                {search || filterType !== "all" ? "No results found." : "No transactions yet — add one above."}
              </td></tr>
            ) : (() => {
              let running = 0;
              const withRunning = [...filtered].reverse().map((tx) => {
                running += tx.type === "credit" ? tx.amount : -tx.amount;
                return { tx, running };
              });
              return withRunning.reverse().map(({ tx, running: rt }, i) => (
                <tr key={tx.id}
                  className={`border-b border-gray-100 transition-colors ${
                    tx.type === "credit" ? "hover:bg-emerald-50/30" : "hover:bg-rose-50/30"
                  }`}>
                  <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {new Date(tx.transaction_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                    }`}>
                      {tx.type === "credit" ? "+" : "−"} {tx.type}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-medium text-xs ${
                    tx.type === "credit" ? "text-emerald-700" : "text-rose-600"
                  }`}>
                    {tx.type === "credit" ? "+" : "−"}{fmt(tx.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[200px] truncate">
                    {tx.reference_number
                      ? <span className="font-mono text-gray-700">{tx.reference_number}</span>
                      : tx.note
                      ? <span className="text-gray-500">{tx.note}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {tx.batch_number != null ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${batchColor(tx.batch_number)}`}>
                        B{tx.batch_number}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-medium text-xs ${rt >= 0 ? "text-gray-700" : "text-rose-600"}`}>
                    ₱ {fmt(rt)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => handleDelete(tx.id)} disabled={deletingId === tx.id}
                      className="text-gray-400 hover:text-rose-500 transition disabled:opacity-30"
                      title="Delete transaction">
                      {deletingId === tx.id ? "..." : "✕"}
                    </button>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 bg-gray-100 border-t-2 border-gray-300">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="text-gray-700">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-emerald-700 font-semibold">+₱ {fmt(totalCredits)}</span>
                <span className="mx-2 text-gray-500">|</span>
                <span className="text-rose-700 font-semibold">−₱ {fmt(totalDeductions)}</span>
              </div>
              <div className={`font-bold ${txTotal >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                Balance: ₱ {fmt(txTotal)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── All accounts view ────────────────────────────────────────────────────────

interface AllAccountsTablesProps {
  allTransactions: Transaction[];
  filterType: "all" | "credit" | "deduction";
  search: string;
  deletingId: number | null;
  handleDelete: (id: number) => void;
  isLoading: boolean;
  fmt: (n: number) => string;
  onSaved: () => void;
}

export function AllAccountsTables({
  allTransactions, filterType, search, deletingId, handleDelete, isLoading, onSaved,
}: AllAccountsTablesProps) {
  const globalNoteSuggestions = Array.from(
    new Set(
      allTransactions
        .map(tx => tx.note)
        .filter((n): n is string => !!n && /[a-zA-Z]/.test(n))
        .map(n => n.trim())
    )
  ).sort();

  return (
    <div className="space-y-0">
      {ACCOUNTS.map((account) => (
        <div key={account} className="border-b-4 border-gray-300">
          <SingleAccountTable
            account={account}
            filterType={filterType}
            search={search}
            deletingId={deletingId}
            handleDelete={handleDelete}
            isLoading={isLoading}
            onSaved={onSaved}
            globalNoteSuggestions={globalNoteSuggestions}
          />
        </div>
      ))}
    </div>
  );
}