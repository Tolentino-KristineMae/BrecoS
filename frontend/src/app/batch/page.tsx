"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountColor, batchColor } from "@/lib/batchColors";

type SavedBatchDetail = {
  billsCoins: Record<string, string>;
  otherDeduction: { selected: string; customLabel: string; amount: string; enabled: boolean };
  paymentMode: "cash" | "bank" | "both";
  bankTransfer: { amount: string };
  savedAt: string;
};

const API_BASE = "http://localhost:5000/api";

type FullTransaction = {
  id: number;
  amount: number;
  type: "credit" | "deduction";
  account: string | null;
  reference_number: string | null;
  note: string | null;
  transaction_date: string;
  batch_number: number | null;
  created_at: string;
};

type Claim = { amount: string; ref_note: string };

type ClaimResult = {
  claim: { amount: number; ref_note: string };
  matched: boolean;
  tx: {
    id: number;
    amount: number;
    type: "credit" | "deduction";
    account: string | null;
    reference_number: string | null;
    note: string | null;
    transaction_date: string;
    batch_number: number;
  } | null;
};

type CheckResult = {
  batchNumber: number;
  matched: number;
  unresolved: number;
  unresolvedClaims: Claim[];
  claimResults: ClaimResult[];
  matchedIds: number[];
};

type BatchSummary = {
  batchNumber: number;
  count: number;
  net: number;
  earliest: string;
  latest: string;
};

const ACCOUNTS = ["Babilyn", "Kristine", "Nixie"] as const;
type AccountName = typeof ACCOUNTS[number];

type AccountClaims = {
  account: AccountName;
  claims: Claim[];
  skipped: boolean;
};

const emptyClaim = (): Claim => ({ amount: "", ref_note: "" });
const emptyAccountClaims = (account: AccountName): AccountClaims => ({
  account,
  claims: [emptyClaim()],
  skipped: false,
});

const STORAGE_KEY = "batchPageState";

export default function BatchPage() {
  const [accountClaims, setAccountClaims] = useState<AccountClaims[]>(ACCOUNTS.map(emptyAccountClaims));
  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  const [checking, setChecking] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [unbatched, setUnbatched] = useState(0);
  const [allTransactions, setAllTransactions] = useState<FullTransaction[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<number | null>(null);

  // Saved bills/coins + deductions per batch number
  const [savedDetails, setSavedDetails] = useState<Record<number, SavedBatchDetail>>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const [detailStep, setDetailStep] = useState<1 | 2 | 3>(1);

  // Bills & coins state for selected batch detail
  const BILLS  = ["1000", "500", "200", "100", "50", "20"] as const;
  const COINS  = ["20", "10", "5", "1"] as const;
  const [billsCoins, setBillsCoins] = useState<Record<string, string>>({});

  // Payment mode: cash | bank | both
  const [paymentMode, setPaymentMode] = useState<"cash" | "bank" | "both">("cash");
  const [bankTransfer, setBankTransfer] = useState({ amount: "" });

  // Other deduction — single dropdown entry
  const DEDUCTION_OPTIONS = ["Cash Out", "Royal Cable", "Other"] as const;
  const [otherDeduction, setOtherDeduction] = useState<{ selected: string; customLabel: string; amount: string; enabled: boolean }>({
    selected: "Cash Out", customLabel: "", amount: "", enabled: false,
  });

  const allActiveClaims = accountClaims
    .filter(ac => !ac.skipped)
    .flatMap(ac => ac.claims.filter(c => c.amount && c.ref_note.trim()));

  const activeAC = accountClaims[activeAccountIdx];

  // ── Persistence ──────────────────────────────────────────────────────────
  const persist = (patch: Partial<{ accountClaims: AccountClaims[]; activeAccountIdx: number; result: CheckResult | null; isPreview: boolean }>) => {
    try {
      const cur = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } })();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch { /* ignore */ }
  };

  // Rehydrate on mount only — avoids SSR hydration mismatch
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.accountClaims) setAccountClaims(s.accountClaims);
      if (s.activeAccountIdx != null) setActiveAccountIdx(s.activeAccountIdx);
      if (s.result !== undefined) setResult(s.result);
      if (s.isPreview !== undefined) setIsPreview(s.isPreview);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Claim mutations ───────────────────────────────────────────────────────
  const setClaimForAccount = (ai: number, ci: number, field: keyof Claim, value: string) => {
    setAccountClaims(prev => {
      const next = prev.map((ac, a) => a !== ai ? ac : {
        ...ac, claims: ac.claims.map((c, i) => i !== ci ? c : { ...c, [field]: value }),
      });
      persist({ accountClaims: next });
      return next;
    });
    setGlobalError("");
  };

  const addClaim = (ai: number) => {
    setAccountClaims(prev => {
      const next = prev.map((ac, a) => a !== ai || ac.claims.length >= 5 ? ac : { ...ac, claims: [...ac.claims, emptyClaim()] });
      persist({ accountClaims: next });
      return next;
    });
  };

  const removeClaim = (ai: number, ci: number) => {
    setAccountClaims(prev => {
      const next = prev.map((ac, a) => a !== ai ? ac : { ...ac, claims: ac.claims.filter((_, i) => i !== ci) });
      persist({ accountClaims: next });
      return next;
    });
  };

  const skipAccount = (ai: number) => {
    setAccountClaims(prev => {
      const next = prev.map((ac, a) => a !== ai ? ac : { ...ac, skipped: true, claims: [emptyClaim()] });
      persist({ accountClaims: next });
      return next;
    });
    const nextIdx = ai < ACCOUNTS.length - 1 ? ai + 1 : ai;
    setActiveAccountIdx(nextIdx);
    persist({ activeAccountIdx: nextIdx });
  };

  const unskipAccount = (ai: number) => {
    setAccountClaims(prev => {
      const next = prev.map((ac, a) => a !== ai ? ac : { ...ac, skipped: false });
      persist({ accountClaims: next });
      return next;
    });
    setActiveAccountIdx(ai);
    persist({ activeAccountIdx: ai });
  };

  const switchTab = (idx: number) => {
    setActiveAccountIdx(idx);
    persist({ activeAccountIdx: idx });
  };

  const resetAll = () => {
    setAccountClaims(ACCOUNTS.map(emptyAccountClaims));
    setActiveAccountIdx(0);
    setResult(null);
    setIsPreview(false);
    setGlobalError("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // ── API ───────────────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        axios.get(`${API_BASE}/batch/summary`),
        axios.get(`${API_BASE}/transactions`),
      ]);
      setBatches(sRes.data.batches || []);
      setUnbatched(sRes.data.unbatched ?? 0);
      setAllTransactions(tRes.data.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleCheck = async () => {
    if (allActiveClaims.length === 0) { setGlobalError("Enter at least one claim."); return; }
    setChecking(true);
    setGlobalError("");
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE}/batch/preview`, {
        claims: allActiveClaims.map(c => ({ amount: parseFloat(c.amount), ref_note: c.ref_note })),
      });
      setResult(res.data);
      setIsPreview(true);
      persist({ result: res.data, isPreview: true });
    } catch (err: any) {
      setGlobalError(err?.response?.data?.error || "Check failed.");
    } finally { setChecking(false); }
  };

  const handleFinalize = async () => {
    if (!result || result.matched === 0) return;
    setFinalizing(true);
    setGlobalError("");
    try {
      await axios.post(`${API_BASE}/batch/finalize`, {
        batchNumber: result.batchNumber,
        matchedIds: result.matchedIds,
      });
      await fetchSummary();
      resetAll();
    } catch (err: any) {
      setGlobalError(err?.response?.data?.error || "Finalize failed.");
    } finally { setFinalizing(false); }
  };

  const handleDeleteBatch = async (n: number) => {
    if (!confirm(`Unbatch all transactions in Batch ${n}?`)) return;
    setDeletingBatch(n);
    try {
      await axios.delete(`${API_BASE}/batch/${n}`);
      await fetchSummary();
      if (selectedBatch === n) setSelectedBatch(null);
    } catch { alert("Failed to unbatch."); }
    finally { setDeletingBatch(null); }
  };

  const handleSaveBillsCoins = () => {
    if (selectedBatch === null) return;
    setSavedDetails(prev => ({
      ...prev,
      [selectedBatch]: {
        billsCoins: { ...billsCoins },
        otherDeduction: { ...otherDeduction },
        paymentMode,
        bankTransfer: { ...bankTransfer },        savedAt: new Date().toLocaleString("en-PH"),
      },
    }));
  };

  const handleCopyAsImage = async () => {
    if (!detailRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(detailRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async blob => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          alert("Copied to clipboard!");
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `batch-${selectedBatch}-details.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch {
      alert("Could not capture image.");
    }
  };

  const saved = selectedBatch !== null ? savedDetails[selectedBatch] : null;

  // ── Batch detail calculations ─────────────────────────────────────────────
  const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const batchTxs        = selectedBatch !== null ? allTransactions.filter(t => t.batch_number === selectedBatch) : [];
  const batchCredits    = batchTxs.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const batchDeductions = batchTxs.filter(t => t.type === "deduction").reduce((s, t) => s + t.amount, 0);
  const batchGross      = batchCredits - batchDeductions;

  const calcFee = (total: number) => {
    if (total < 500)  return 5;
    if (total < 1000) return 10;
    const per = Math.floor(total / 1000) * 10;
    const rem = total % 1000;
    return per + (rem < 500 ? 5 : 10);
  };
  const autoFee = calcFee(batchGross);

  const extraFeesTotal = (() => {
    if (!otherDeduction.enabled) return 0;
    const v = parseFloat(otherDeduction.amount || "0");
    return isNaN(v) ? 0 : v;
  })();

  const batchFinalTotal = batchGross - autoFee - extraFeesTotal;

  const billsTotal = ["1000","500","200","100","50","20"].reduce((s, k) => {
    const qty = parseInt(billsCoins[k] || "0", 10);
    return s + (isNaN(qty) ? 0 : qty * parseInt(k, 10));
  }, 0);
  const coinsTotal = (["20c","10c","5c","1c"] as const).reduce((s, k) => {
    const qty = parseInt(billsCoins[k] || "0", 10);
    const val = { "20c": 20, "10c": 10, "5c": 5, "1c": 1 }[k];
    return s + (isNaN(qty) ? 0 : qty * val);
  }, 0);
  const cashTotal = billsTotal + coinsTotal;

  const txByAccount = ACCOUNTS.reduce((acc, name) => {
    acc[name] = batchTxs.filter(t => t.account === name);
    return acc;
  }, {} as Record<string, FullTransaction[]>);
  const unassigned = batchTxs.filter(t => !t.account || !ACCOUNTS.includes(t.account as AccountName));

  return (
    <>
    {/* ── Detail Modal ── */}    {showDetailModal && selectedBatch !== null && saved && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetailModal(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Modal toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Batch #{selectedBatch} — Details</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAsImage}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-3 py-1.5 transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy as Image
              </button>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold px-1">×</button>
            </div>
          </div>

          {/* Printable / copyable card */}
          <div ref={detailRef} className="bg-white p-6 space-y-5">
            {/* Title */}
            <div className="text-center border-b border-slate-200 pb-4">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">GCash Monitor</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Batch #{selectedBatch}</h2>
              <p className="text-xs text-slate-400 mt-1">{saved.savedAt}</p>
            </div>

            {/* Per-account summary */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Claims by Account</p>
              <div className="space-y-1.5">
                {ACCOUNTS.map(name => {
                  const txs = txByAccount[name];
                  if (!txs || txs.length === 0) return null;
                  const col = accountColor(name);
                  const acNet = txs.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0)
                              - txs.filter(t => t.type === "deduction").reduce((s, t) => s + t.amount, 0);
                  return (
                    <div key={name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${col.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-sm font-semibold ${col.text}`}>{name}</span>
                        <span className={`text-xs ${col.text} opacity-60`}>{txs.length} tx</span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${col.text}`}>₱{fmt(acNet)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Amount breakdown */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount Breakdown</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
                <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Credits</span>
                  <span className="font-mono font-semibold text-emerald-600">₱{fmt(batchCredits)}</span>
                </div>
                {batchDeductions > 0 && (
                  <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                    <span className="text-slate-500">Deductions</span>
                    <span className="font-mono font-semibold text-rose-500">− ₱{fmt(batchDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <span className="font-semibold text-slate-700">Gross Total</span>
                  <span className="font-mono font-bold text-slate-800">₱{fmt(batchGross)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Service Fee</span>
                  <span className="font-mono font-semibold text-rose-500">− ₱{fmt(autoFee)}</span>
                </div>
                {saved.otherDeduction.enabled && saved.otherDeduction.amount && (
                  <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                    <span className="text-slate-500">
                      {saved.otherDeduction.selected === "Other"
                        ? (saved.otherDeduction.customLabel || "Other")
                        : saved.otherDeduction.selected}
                    </span>
                    <span className="font-mono font-semibold text-rose-500">− ₱{fmt(parseFloat(saved.otherDeduction.amount) || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-slate-800">
                  <span className="font-bold text-white">Final Total</span>
                  <span className="font-mono font-bold text-white">₱{fmt(batchFinalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bills & Coins / Payment */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {saved.paymentMode === "cash" ? "Prepared Cash" : saved.paymentMode === "bank" ? "Bank Transfer" : "Prepared Payment"}
              </p>
              <div className="space-y-3">

                {/* Cash section — shown for cash or both */}
                {(saved.paymentMode === "cash" || saved.paymentMode === "both") && (
                  <>
                    {saved.paymentMode === "both" && (
                      <p className="text-xs text-slate-400 font-semibold">Cash</p>
                    )}
                    {(["1000","500","200","100","50","20"] as const).some(d => parseInt(saved.billsCoins[d] || "0", 10) > 0) && (
                      <div>
                        <p className="text-xs text-slate-400 font-semibold mb-1.5">Bills</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["1000","500","200","100","50","20"] as const).map(denom => {
                            const qty = parseInt(saved.billsCoins[denom] || "0", 10);
                            if (!qty) return null;
                            return (
                              <div key={denom} className="bg-slate-50 rounded-lg border border-slate-200 px-2.5 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">₱{denom}</span>
                                <span className="text-xs font-mono text-slate-700">×{qty}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(["20c","10c","5c","1c"] as const).some(d => parseInt(saved.billsCoins[d] || "0", 10) > 0) && (
                      <div>
                        <p className="text-xs text-slate-400 font-semibold mb-1.5">Coins</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(["20c","10c","5c","1c"] as const).map(denom => {
                            const qty = parseInt(saved.billsCoins[denom] || "0", 10);
                            if (!qty) return null;
                            const label = { "20c":"₱20","10c":"₱10","5c":"₱5","1c":"₱1" }[denom];
                            return (
                              <div key={denom} className="bg-amber-50 rounded-lg border border-amber-100 px-2 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-700">{label}</span>
                                <span className="text-xs font-mono text-amber-700">×{qty}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(() => {
                      const b = ["1000","500","200","100","50","20"].reduce((s,k)=>{const q=parseInt(saved.billsCoins[k]||"0",10);return s+(isNaN(q)?0:q*parseInt(k,10));},0);
                      const c = (["20c","10c","5c","1c"] as const).reduce((s,k)=>{const q=parseInt(saved.billsCoins[k]||"0",10);const v={"20c":20,"10c":10,"5c":5,"1c":1}[k];return s+(isNaN(q)?0:q*v);},0);
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
                          <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                            <span className="text-slate-500">Bills</span>
                            <span className="font-mono font-semibold text-slate-700">₱{fmt(b)}</span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5 border-b border-slate-100">
                            <span className="text-slate-500">Coins</span>
                            <span className="font-mono font-semibold text-slate-700">₱{fmt(c)}</span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5 bg-slate-50 font-semibold">
                            <span className="text-slate-700">Cash Total</span>
                            <span className="font-mono font-bold text-slate-800">₱{fmt(b+c)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Bank transfer section — shown for bank or both */}
                {(saved.paymentMode === "bank" || saved.paymentMode === "both") && (
                  <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-700">
                      {saved.paymentMode === "both" ? "Bank Transfer" : "Amount Transferred"}
                    </span>
                    <span className="font-mono font-bold text-blue-800 text-sm">
                      ₱{fmt(parseFloat(saved.bankTransfer.amount || "0") || 0)}
                    </span>
                  </div>
                )}

                {/* Grand total row */}
                {(() => {
                  const cashAmt = (saved.paymentMode === "cash" || saved.paymentMode === "both")
                    ? ["1000","500","200","100","50","20"].reduce((s,k)=>{const q=parseInt(saved.billsCoins[k]||"0",10);return s+(isNaN(q)?0:q*parseInt(k,10));},0)
                    + (["20c","10c","5c","1c"] as const).reduce((s,k)=>{const q=parseInt(saved.billsCoins[k]||"0",10);const v={"20c":20,"10c":10,"5c":5,"1c":1}[k];return s+(isNaN(q)?0:q*v);},0)
                    : 0;
                  const bankAmt = (saved.paymentMode === "bank" || saved.paymentMode === "both")
                    ? parseFloat(saved.bankTransfer.amount || "0") || 0 : 0;
                  const total = cashAmt + bankAmt;
                  const exact = Math.abs(total - batchFinalTotal) < 0.01;
                  return (
                    <div className={`flex justify-between px-4 py-3 rounded-xl font-bold text-sm ${exact ? "bg-emerald-600" : "bg-rose-600"}`}>
                      <span className="text-white">Total Prepared</span>
                      <span className="font-mono text-white">₱{fmt(total)}</span>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    <main className="flex-1 overflow-auto bg-slate-100">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Verification</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">Batch Checker</h1>
        <p className="mt-1 text-xs text-slate-400">Match claims against unchecked transactions and group them into a batch.</p>
      </div>

      <div className="px-8 py-6">
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ══ LEFT — Claims input ══ */}
        <div className="space-y-4">

          {/* Claims card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Enter Claims</h2>
                <p className="text-xs text-slate-400 mt-0.5">Up to 5 claims per account</p>
              </div>
              <div className="flex items-center gap-2">
                {unbatched > 0 && (
                  <span className="bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {unbatched} unchecked
                  </span>
                )}
                {allActiveClaims.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {allActiveClaims.length} claim{allActiveClaims.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Account tabs */}
            <div className="flex border-b border-slate-100">
              {ACCOUNTS.map((acct, idx) => {
                const ac = accountClaims[idx];
                const isActive = idx === activeAccountIdx;
                const col = accountColor(acct);
                const filled = ac.claims.filter(c => c.amount && c.ref_note.trim()).length;
                return (
                  <button
                    key={acct}
                    onClick={() => switchTab(idx)}
                    className={`flex-1 px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${
                      isActive
                        ? `${col.bg} ${col.text} ${col.border}`
                        : ac.skipped
                        ? "bg-white text-slate-300 border-transparent line-through"
                        : "bg-white text-slate-500 border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${col.dot}`} />
                    {acct}
                    {!ac.skipped && filled > 0 && (
                      <span className={`ml-1.5 rounded-full px-1.5 text-xs font-bold ${col.bg} ${col.text}`}>{filled}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active account body */}
            {activeAC && (
              activeAC.skipped ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400 mb-3">No claims for <strong>{activeAC.account}</strong></p>
                  <button onClick={() => unskipAccount(activeAccountIdx)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline">
                    + Add claims for {activeAC.account}
                  </button>
                </div>
              ) : (
                <>
                  {/* Claims rows */}
                  <div className="px-5 pt-4 pb-2 space-y-2">
                    {/* Column headers */}
                    <div className="grid grid-cols-[24px_1fr_1fr_24px] gap-2 px-1">
                      <span />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₱)</span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ref / Note</span>
                      <span />
                    </div>
                    {activeAC.claims.map((claim, ci) => (
                      <div key={ci} className="grid grid-cols-[24px_1fr_1fr_24px] gap-2 items-center">
                        <span className="text-xs text-slate-300 font-bold text-center">{ci + 1}</span>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={claim.amount} placeholder="0.00"
                          onChange={e => setClaimForAccount(activeAccountIdx, ci, "amount", e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCheck()}
                          className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-right font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full"
                        />
                        <input
                          type="text"
                          value={claim.ref_note} placeholder="e.g. 12345 or note"
                          onChange={e => setClaimForAccount(activeAccountIdx, ci, "ref_note", e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCheck()}
                          className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full"
                        />
                        <button
                          onClick={() => removeClaim(activeAccountIdx, ci)}
                          disabled={activeAC.claims.length <= 1}
                          className="text-slate-300 hover:text-rose-500 disabled:opacity-0 transition text-lg font-bold text-center leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Per-account footer */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      {activeAC.claims.length < 5 && (
                        <button onClick={() => addClaim(activeAccountIdx)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition">
                          + Add row
                        </button>
                      )}
                      <button onClick={() => skipAccount(activeAccountIdx)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium border border-slate-200 rounded-lg px-2.5 py-1 transition">
                        No claims
                      </button>
                    </div>
                    {activeAccountIdx < ACCOUNTS.length - 1 && (
                      <button onClick={() => switchTab(activeAccountIdx + 1)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition">
                        Next: {ACCOUNTS[activeAccountIdx + 1]} →
                      </button>
                    )}
                  </div>
                </>
              )
            )}
          </div>

          {/* Error message */}
          {globalError && !isPreview && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {globalError}
            </div>
          )}

          {/* Run Check button */}
          {!isPreview && (
            <button
              onClick={handleCheck}
              disabled={checking || allActiveClaims.length === 0}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm py-3 transition shadow-sm"
            >
              {checking
                ? "Checking…"
                : allActiveClaims.length === 0
                ? "Enter claims above to run check"
                : `Run Check — ${allActiveClaims.length} claim${allActiveClaims.length !== 1 ? "s" : ""}`}
            </button>
          )}

          {/* Preview result */}
          {isPreview && result && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Preview — Batch #{result.batchNumber}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Review before finalizing</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {result.matched} matched
                  </span>
                  {result.unresolved > 0 && (
                    <span className="bg-rose-100 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {result.unresolved} unresolved
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {result.claimResults.map((cr, i) => (
                  <div key={i} className={`px-5 py-3 flex items-center gap-3 ${cr.matched ? "" : "bg-rose-50"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${cr.matched ? "bg-emerald-500" : "bg-rose-400"}`}>
                      {cr.matched ? "✓" : "!"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold text-slate-800 text-sm">
                        ₱{cr.claim.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="ml-2 text-slate-400 text-xs">{cr.claim.ref_note}</span>
                    </div>
                    {cr.tx?.account && (
                      <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{cr.tx.account}</span>
                    )}
                    {!cr.matched && (
                      <span className="text-xs text-rose-600 font-semibold">No match</span>
                    )}
                  </div>
                ))}
              </div>

              {globalError && (
                <div className="px-5 py-3 bg-rose-50 border-t border-rose-100 text-sm text-rose-700">{globalError}</div>
              )}

              <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleFinalize}
                  disabled={finalizing || result.matched === 0}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm py-2.5 transition"
                >
                  {finalizing ? "Saving…" : "Finalize Batch"}
                </button>
                <button
                  onClick={() => { setIsPreview(false); setResult(null); persist({ isPreview: false, result: null }); }}
                  className="rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm py-2.5 px-4 transition"
                >
                  Back
                </button>
                <button
                  onClick={resetAll}
                  className="rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 font-medium text-sm py-2.5 px-4 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT — Batch History + Detail ══ */}
        <div className="space-y-4">

          {/* Batch list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Batch History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{batches.length} batch{batches.length !== 1 ? "es" : ""} finalized</p>
              </div>
              <button onClick={fetchSummary} className="text-xs text-slate-400 hover:text-slate-700 transition font-medium">↻ Refresh</button>
            </div>
            {batches.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No batches yet. Run a check and finalize to create one.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {batches.map(b => {
                  const isSelected = selectedBatch === b.batchNumber;
                  return (
                    <button
                      key={b.batchNumber}
                      onClick={() => {
                        if (isSelected) { setSelectedBatch(null); return; }
                        setSelectedBatch(b.batchNumber);
                        setBillsCoins({});
                        setPaymentMode("cash");
                        setBankTransfer({ amount: "" });
                        setOtherDeduction({ selected: "Cash Out", customLabel: "", amount: "", enabled: false });
                        setDetailStep(1);
                      }}
                      className={`w-full px-5 py-3.5 flex items-center gap-3 text-left transition hover:bg-slate-50 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <span className={`text-xs font-bold rounded-lg px-2.5 py-1 border ${batchColor(b.batchNumber)}`}>#{b.batchNumber}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800">₱{fmt(b.net)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {b.count} tx · {b.earliest === b.latest ? b.earliest : `${b.earliest} – ${b.latest}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); handleDeleteBatch(b.batchNumber); }}
                          className="text-xs text-slate-300 hover:text-rose-500 transition font-medium cursor-pointer"
                        >
                          {deletingBatch === b.batchNumber ? "…" : "Unbatch"}
                        </span>
                        <span className={`text-slate-400 text-xs inline-block transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}>▾</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Batch Detail (stepped) ── */}
          {selectedBatch !== null && batchTxs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Step indicator */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <span className={`text-xs font-bold rounded-lg px-2.5 py-1 border ${batchColor(selectedBatch)}`}>#{selectedBatch}</span>
                <div className="flex-1 flex items-center gap-1">
                  {([{n:1,label:"Claims"},{n:2,label:"Summary & Fees"},{n:3,label:"Bills & Coins"}] as const).map((s,i) => (
                    <div key={s.n} className="flex items-center gap-1 flex-1">
                      <button onClick={() => setDetailStep(s.n)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition ${detailStep===s.n?"text-blue-600":detailStep>s.n?"text-emerald-600":"text-slate-400"}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${detailStep===s.n?"border-blue-500 bg-blue-500 text-white":detailStep>s.n?"border-emerald-500 bg-emerald-500 text-white":"border-slate-300 text-slate-400"}`}>
                          {detailStep>s.n?"✓":s.n}
                        </span>
                        <span className="hidden sm:inline">{s.label}</span>
                      </button>
                      {i<2&&<div className={`flex-1 h-px mx-1 ${detailStep>s.n?"bg-emerald-300":"bg-slate-200"}`}/>}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Step 1: Claims by Account ── */}
              {detailStep === 1 && (
                <div>
                  <div className="divide-y divide-slate-100">
                    {ACCOUNTS.map(name => {
                      const txs = txByAccount[name];
                      if (!txs || txs.length === 0) return null;
                      const col = accountColor(name);
                      const acNet = txs.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0) - txs.filter(t=>t.type==="deduction").reduce((s,t)=>s+t.amount,0);
                      return (
                        <div key={name}>
                          <div className={`px-5 py-2.5 flex items-center justify-between ${col.bg}`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${col.dot}`}/>
                              <span className={`text-xs font-bold uppercase tracking-wide ${col.text}`}>{name}</span>
                              <span className={`text-xs ${col.text} opacity-60`}>{txs.length} tx</span>
                            </div>
                            <span className={`text-sm font-bold font-mono ${col.text}`}>₱{fmt(acNet)}</span>
                          </div>
                          {txs.map((tx,ti) => (
                            <div key={tx.id} className={`px-5 py-2.5 flex items-center gap-3 ${ti<txs.length-1?"border-b border-slate-50":""}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${tx.type==="credit"?"bg-emerald-400":"bg-rose-400"}`}/>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-slate-800 text-sm">₱{fmt(tx.amount)}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tx.type==="credit"?"bg-emerald-50 text-emerald-600":"bg-rose-50 text-rose-500"}`}>{tx.type}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5 truncate">{tx.reference_number||tx.note||"—"}</div>
                              </div>
                              <div className="text-xs text-slate-400 shrink-0">{tx.transaction_date}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {unassigned.map(tx => (
                      <div key={tx.id} className="px-5 py-2.5 flex items-center gap-3">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.type==="credit"?"bg-emerald-400":"bg-rose-400"}`}/>
                        <span className="font-mono text-sm font-semibold text-slate-700">₱{fmt(tx.amount)}</span>
                        <span className="text-xs text-slate-400 flex-1 truncate">{tx.reference_number||tx.note||"—"}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Unassigned</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                    <button onClick={() => setDetailStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-5 py-2 transition">
                      Next: Summary & Fees →
                    </button>
                  </div>
                </div>
              )}
              {/* ── Step 2: Summary & Fees ── */}
              {detailStep === 2 && (
                <div>
                  <div className="px-5 py-4 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Totals</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Total Credits</span>
                      <span className="font-mono font-semibold text-emerald-600">+ ₱{fmt(batchCredits)}</span>
                    </div>
                    {batchDeductions > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Deductions</span>
                        <span className="font-mono font-semibold text-rose-500">− ₱{fmt(batchDeductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-sm font-semibold text-slate-700">Gross Total</span>
                      <span className="font-mono font-bold text-slate-800">₱{fmt(batchGross)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-slate-500">Service Fee</span>
                      <span className="ml-2 text-xs bg-slate-100 text-slate-400 rounded px-1.5 py-0.5">auto</span>
                    </div>
                    <span className="font-mono font-semibold text-rose-500">− ₱{fmt(autoFee)}</span>
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Other Deduction</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={otherDeduction.enabled}
                          onChange={e => setOtherDeduction(prev=>({...prev,enabled:e.target.checked}))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-400"/>
                        <span className="text-xs text-slate-500 font-medium">Enable</span>
                      </label>
                    </div>
                    <div className={`space-y-2.5 transition-opacity ${otherDeduction.enabled?"opacity-100":"opacity-40 pointer-events-none"}`}>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Type</label>
                        <select value={otherDeduction.selected}
                          onChange={e => setOtherDeduction(prev=>({...prev,selected:e.target.value,customLabel:""}))}
                          className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                          {DEDUCTION_OPTIONS.map(opt=><option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      {otherDeduction.selected==="Other" && (
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Label</label>
                          <input type="text" value={otherDeduction.customLabel} placeholder="e.g. Electricity bill"
                            onChange={e => setOtherDeduction(prev=>({...prev,customLabel:e.target.value}))}
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Amount (₱)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" step="0.01" value={otherDeduction.amount} placeholder="0.00"
                            onChange={e => setOtherDeduction(prev=>({...prev,amount:e.target.value}))}
                            className="flex-1 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-right font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
                          {otherDeduction.amount && <span className="text-sm font-mono font-semibold text-rose-500 shrink-0">− ₱{fmt(parseFloat(otherDeduction.amount)||0)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-5 bg-slate-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Final Amount to Prepare</p>
                        <p className="text-xs text-slate-500 mt-0.5">After ₱{fmt(autoFee)} fee{extraFeesTotal>0?` + ₱${fmt(extraFeesTotal)} ${otherDeduction.selected==="Other"?(otherDeduction.customLabel||"other"):otherDeduction.selected}`:""}</p>
                      </div>
                      <span className="text-2xl font-bold text-white font-mono">₱{fmt(batchFinalTotal)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 flex justify-between">
                    <button onClick={() => setDetailStep(1)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition px-3 py-2">← Back</button>
                    <button onClick={() => setDetailStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-5 py-2 transition">Next: Bills & Coins →</button>
                  </div>
                </div>
              )}
              {/* ── Step 3: Bills & Coins ── */}
              {detailStep === 3 && (
                <div>
                  <div className="px-5 py-4 space-y-5">

                    {/* Payment mode selector */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment Method</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["cash","bank","both"] as const).map(mode => (
                          <button key={mode} onClick={() => setPaymentMode(mode)}
                            className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                              paymentMode === mode
                                ? mode === "cash" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : mode === "bank" ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            }`}>
                            {mode === "cash" ? "💵 Cash" : mode === "bank" ? "🏦 Bank Transfer" : "⚡ Both"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cash section */}
                    {(paymentMode === "cash" || paymentMode === "both") && (
                      <div className="space-y-4">
                        {paymentMode === "both" && (
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Breakdown</p>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bills</p>
                          <div className="grid grid-cols-3 gap-2.5">
                            {(["1000","500","200","100","50","20"] as const).map(denom => {
                              const qty=parseInt(billsCoins[denom]||"0",10); const sub=isNaN(qty)?0:qty*parseInt(denom,10);
                              return (
                                <div key={denom} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600">₱{denom}</span>
                                    {sub>0&&<span className="text-xs text-emerald-600 font-mono font-semibold">₱{fmt(sub)}</span>}
                                  </div>
                                  <input type="number" min="0" step="1" value={billsCoins[denom]||""} placeholder="0"
                                    onChange={e=>setBillsCoins(prev=>({...prev,[denom]:e.target.value}))}
                                    className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Coins</p>
                          <div className="grid grid-cols-4 gap-2.5">
                            {(["20c","10c","5c","1c"] as const).map(denom => {
                              const label={"20c":"₱20","10c":"₱10","5c":"₱5","1c":"₱1"}[denom];
                              const val={"20c":20,"10c":10,"5c":5,"1c":1}[denom] as number;
                              const qty=parseInt(billsCoins[denom]||"0",10); const sub=isNaN(qty)?0:qty*val;
                              return (
                                <div key={denom} className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-amber-700">{label}</span>
                                    {sub>0&&<span className="text-xs text-amber-600 font-mono font-semibold">₱{fmt(sub)}</span>}
                                  </div>
                                  <input type="number" min="0" step="1" value={billsCoins[denom]||""} placeholder="0"
                                    onChange={e=>setBillsCoins(prev=>({...prev,[denom]:e.target.value}))}
                                    className="w-full border border-amber-200 bg-white rounded-lg px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"/>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Cash subtotals */}
                        <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
                          <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                            <span className="text-slate-500">Bills</span><span className="font-mono font-semibold text-slate-700">₱{fmt(billsTotal)}</span>
                          </div>
                          <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                            <span className="text-slate-500">Coins</span><span className="font-mono font-semibold text-slate-700">₱{fmt(coinsTotal)}</span>
                          </div>
                          <div className="px-4 py-2.5 flex justify-between items-center bg-slate-50 font-semibold">
                            <span className="text-slate-700">Total Cash</span><span className="font-mono font-bold text-slate-800">₱{fmt(cashTotal)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank transfer section */}
                    {(paymentMode === "bank" || paymentMode === "both") && (
                      <div className="space-y-3">
                        {paymentMode === "both" && (
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Transfer Details</p>
                        )}
                        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                          <label className="text-xs text-slate-500 font-medium mb-1 block">Amount Transferred (₱)</label>
                          <input type="number" min="0" step="0.01" value={bankTransfer.amount} placeholder="0.00"
                            onChange={e=>setBankTransfer(prev=>({...prev,amount:e.target.value}))}
                            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm text-right font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
                        </div>
                      </div>
                    )}

                    {/* Grand total comparison */}
                    {(() => {
                      const bankAmt = parseFloat(bankTransfer.amount || "0") || 0;
                      const totalPrepared = paymentMode === "cash" ? cashTotal
                        : paymentMode === "bank" ? bankAmt
                        : cashTotal + bankAmt;
                      const diff = Math.abs(totalPrepared - batchFinalTotal);
                      const exact = diff < 0.01;
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
                          {paymentMode === "both" && (
                            <>
                              <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                                <span className="text-slate-500">Cash prepared</span><span className="font-mono font-semibold text-slate-700">₱{fmt(cashTotal)}</span>
                              </div>
                              <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                                <span className="text-slate-500">Bank transfer</span><span className="font-mono font-semibold text-slate-700">₱{fmt(bankAmt)}</span>
                              </div>
                            </>
                          )}
                          <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
                            <span className="font-semibold text-slate-700">Total Prepared</span><span className="font-mono font-bold text-slate-800">₱{fmt(totalPrepared)}</span>
                          </div>
                          <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                            <span className="font-semibold text-slate-700">Target Amount</span><span className="font-mono font-bold text-slate-800">₱{fmt(batchFinalTotal)}</span>
                          </div>
                          <div className={`px-4 py-3 flex justify-between items-center font-semibold ${totalPrepared===0?"bg-white":exact?"bg-emerald-50":"bg-rose-50"}`}>
                            <span className="text-slate-700">Difference</span>
                            <span className={`font-mono font-bold ${totalPrepared===0?"text-slate-400":exact?"text-emerald-600":"text-rose-600"}`}>
                              {totalPrepared===0?"—":exact?"✓ Exact match":`₱${fmt(diff)} ${totalPrepared>batchFinalTotal?"over":"short"}`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button onClick={() => setDetailStep(2)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition px-3 py-2">← Back</button>
                    <div className="flex gap-2">
                      <button onClick={handleSaveBillsCoins} className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm py-2 px-4 transition">
                        {saved?"✓ Update":"Save"}
                      </button>
                      {saved && (
                        <button onClick={() => setShowDetailModal(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 transition">
                          Show Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
      </div>
    </main>
    </>
  );
}
