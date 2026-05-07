import { useState } from 'react';
import { Printer, FileText, ArrowDownCircle, ArrowUpCircle, LayoutList, ChevronRight, Filter } from 'lucide-react';

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1')
  .replace('/api/v1', '') + '/print';

const inputCls =
  'border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400 w-full';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { val, label: d.toLocaleString('en-PH', { month: 'long', year: 'numeric' }) };
});

// ── Option Card ───────────────────────────────────────────────────────────────
function OptionCard({ icon: Icon, title, description, color, gradient, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 border-2 transition-all active:scale-[0.98]"
      style={{
        borderColor: selected ? color : '#e0e7ff',
        background: selected ? color + '10' : '#fff',
        boxShadow: selected ? `0 4px 16px ${color}25` : '0 2px 8px rgba(37,99,235,0.05)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: selected ? gradient : '#f8faff' }}>
          <Icon size={20} style={{ color: selected ? '#fff' : color }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{ borderColor: selected ? color : '#cbd5e1', background: selected ? color : 'transparent' }}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PrintPage() {
  const [mode, setMode]           = useState('all');
  const [month, setMonth]         = useState('');
  const [billStatus, setBillStatus]   = useState('');
  const [cashStatus, setCashStatus]   = useState('');

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);

    if (mode === 'bills') {
      if (billStatus) params.set('status', billStatus);
      return `${BASE}/bills?${params}`;
    }
    if (mode === 'cash_in') {
      params.set('type', 'cash_in');
      if (cashStatus) params.set('status', cashStatus);
      return `${BASE}/cash?${params}`;
    }
    if (mode === 'cash_out') {
      params.set('type', 'cash_out');
      if (cashStatus) params.set('status', cashStatus);
      return `${BASE}/cash?${params}`;
    }
    // all — combined bills + cash
    if (billStatus) params.set('bill_status', billStatus);
    if (cashStatus) params.set('cash_status', cashStatus);
    return `${BASE}/all?${params}`;
  };

  const options = [
    {
      key: 'all',
      icon: LayoutList,
      title: 'All Transactions',
      description: 'Bills, cash in, and cash out in one report',
      color: '#7c3aed',
      gradient: 'linear-gradient(135deg, #4c1d95, #8b5cf6)',
    },
    {
      key: 'bills',
      icon: FileText,
      title: 'Bills Only',
      description: 'Bill records with payment history',
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    },
    {
      key: 'cash_in',
      icon: ArrowDownCircle,
      title: 'Cash In Only',
      description: 'Incoming cash transactions',
      color: '#059669',
      gradient: 'linear-gradient(135deg, #064e3b, #10b981)',
    },
    {
      key: 'cash_out',
      icon: ArrowUpCircle,
      title: 'Cash Out Only',
      description: 'Outgoing cash transactions',
      color: '#dc2626',
      gradient: 'linear-gradient(135deg, #7f1d1d, #ef4444)',
    },
  ];

  const showBillStatus = mode === 'bills' || mode === 'all';
  const showCashStatus = mode !== 'bills';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Print</h1>
        <p className="text-sm text-slate-400 mt-0.5">Choose what to print and apply filters</p>
      </div>

      {/* What to print */}
      <div className="bg-white rounded-2xl p-5 space-y-3"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">What to print</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((o) => (
            <OptionCard key={o.key} {...o} selected={mode === o.key} onClick={() => setMode(o.key)} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 space-y-4"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-400" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters (optional)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
              <option value="">All Months</option>
              {MONTHS.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {showBillStatus && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bill Status</label>
              <select value={billStatus} onChange={(e) => setBillStatus(e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}

          {showCashStatus && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cash Status</label>
              <select value={cashStatus} onChange={(e) => setCashStatus(e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={() => window.open(buildUrl(), '_blank')}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-all"
        style={{
          background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
          boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
        }}
      >
        <Printer size={20} />
        Open Print Preview
        <ChevronRight size={18} className="opacity-70" />
      </button>

      <p className="text-center text-xs text-slate-400">
        Opens in a new tab — use your browser's print dialog to print or save as PDF
      </p>
    </div>
  );
}
