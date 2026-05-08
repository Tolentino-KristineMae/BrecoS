import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronLeft, ChevronRight, TrendingUp,
  ReceiptText, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { getDashboardSummary } from '../api/bills';
import StatusBadge from '../components/StatusBadge';
import CategoryDisplay from '../components/CategoryDisplay';
import Spinner from '../components/Spinner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function formatMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, bg, text }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
      style={{ background: bg }}
    >
      <span className={`text-base font-bold ${text}`}>{value}</span>
      <span className="text-xs font-medium" style={{ color: text.replace('text-', '') === text ? '#64748b' : undefined, opacity: 0.75 }}
      >{label}</span>
    </div>
  );
}

// ── Overview Card ─────────────────────────────────────────────────────────────

function OverviewCard({ total, paid, partial, unpaid, totalAmount, totalPaid, totalBal }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)',
        boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
      }}
    >
      {/* Decorations */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute right-16 -bottom-10 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <ReceiptText size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest leading-none mb-0.5">
              Bills Overview
            </p>
            <p className="text-white text-xs font-medium">All time</p>
          </div>
        </div>
      </div>

      {/* ── Body: main figures ── */}
      <div className="flex-1 flex items-center px-6 py-2 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <div>
            <p className="text-blue-200 text-xs mb-1">Total Bills</p>
            <p className="text-2xl font-extrabold text-white">{total}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">Total Billed</p>
            <p className="text-lg font-bold text-white">₱{fmt(totalAmount)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-1">Outstanding</p>
            <p className="text-lg font-bold text-red-300">₱{fmt(totalBal)}</p>
          </div>
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div
        className="grid grid-cols-3 divide-x divide-white/10 relative"
        style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {[
          { label: 'Paid',    value: paid,    color: '#6ee7b7' },
          { label: 'Partial', value: partial, color: '#fcd34d' },
          { label: 'Unpaid',  value: unpaid,  color: '#fca5a5' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-2.5 text-center">
            <p className="text-white/50 text-[10px] font-medium mb-0.5">{label}</p>
            <p className="font-bold text-sm" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cash Overview Card ────────────────────────────────────────────────────────

function CashOverviewCard({ cashIn, cashOut }) {
  const inCount  = parseInt(cashIn?.total_count  ?? 0);
  const outCount = parseInt(cashOut?.total_count ?? 0);

  const inAmount = parseFloat(cashIn?.total_amount ?? 0);
  const outAmount = parseFloat(cashOut?.total_amount ?? 0);
  const inOutstanding  = parseFloat(cashIn?.pending_amount  ?? 0);
  const outOutstanding = parseFloat(cashOut?.pending_amount ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* Cash In */}
      <div className="rounded-2xl overflow-hidden flex flex-col relative"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
          boxShadow: '0 8px 32px rgba(5,150,105,0.2)',
        }}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="px-6 pt-5 pb-4 flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <ArrowDownCircle size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest leading-none mb-0.5">Cash In</p>
            <p className="text-white text-xs font-medium">All time</p>
          </div>
        </div>

        <div className="flex-1 flex items-center px-6 py-2 relative">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <div>
              <p className="text-emerald-200 text-xs mb-1">Transactions</p>
              <p className="text-2xl font-extrabold text-white">{inCount}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs mb-1">Total Amount</p>
              <p className="text-lg font-bold text-white">₱{fmt(inAmount)}</p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs mb-1">Outstanding</p>
              <p className="text-lg font-bold" style={{ color: inOutstanding > 0 ? '#fcd34d' : '#6ee7b7' }}>
                ₱{fmt(inOutstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/10"
          style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label: 'Pending', value: cashIn?.pending_count ?? 0, color: '#fcd34d' },
            { label: 'Paid',    value: cashIn?.paid_count    ?? 0, color: '#93c5fd' },
            { label: 'Settled', value: cashIn?.settled_count ?? 0, color: '#6ee7b7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-3 py-2.5 text-center">
              <p className="text-white/50 text-[10px] font-medium mb-0.5">{label}</p>
              <p className="font-bold text-sm" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Out */}
      <div className="rounded-2xl overflow-hidden flex flex-col relative"
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
          boxShadow: '0 8px 32px rgba(220,38,38,0.2)',
        }}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="px-6 pt-5 pb-4 flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest leading-none mb-0.5">Cash Out</p>
            <p className="text-white text-xs font-medium">All time</p>
          </div>
        </div>

        <div className="flex-1 flex items-center px-6 py-2 relative">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <div>
              <p className="text-red-200 text-xs mb-1">Transactions</p>
              <p className="text-2xl font-extrabold text-white">{outCount}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs mb-1">Total Amount</p>
              <p className="text-lg font-bold text-white">₱{fmt(outAmount)}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs mb-1">Outstanding</p>
              <p className="text-lg font-bold" style={{ color: outOutstanding > 0 ? '#fcd34d' : '#6ee7b7' }}>
                ₱{fmt(outOutstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/10"
          style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label: 'Pending', value: cashOut?.pending_count ?? 0, color: '#fcd34d' },
            { label: 'Paid',    value: cashOut?.paid_count    ?? 0, color: '#93c5fd' },
            { label: 'Settled', value: cashOut?.settled_count ?? 0, color: '#6ee7b7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-3 py-2.5 text-center">
              <p className="text-white/50 text-[10px] font-medium mb-0.5">{label}</p>
              <p className="font-bold text-sm" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TuboCard({ month, onPrev, onNext, isCurrentMonth, tuboData, isLoading }) {
  const totals    = tuboData?.totals;
  const totalTubo = parseFloat(totals?.total_tubo  ?? 0);
  const billTubo  = parseFloat(totals?.bill_tubo   ?? 0);
  const cashTubo  = parseFloat(totals?.cash_tubo   ?? 0);
  const totalFee  = parseFloat(totals?.total_fee   ?? 0);
  const totalDed  = parseFloat(totals?.total_deduction ?? 0);
  const totalPay  = parseInt(totals?.total_payments ?? 0);
  const isPos     = totalTubo >= 0;

  // Use tier info from backend if available
  const tierInfo = totals?.tier_info;
  const TIERS = tierInfo?.tiers ?? [
    { label: 'Tier 1', target: 1000, color: '#fbbf24', glow: '#f59e0b' },
    { label: 'Tier 2', target: 2000, color: '#cbd5e1', glow: '#94a3b8' },
    { label: 'Tier 3', target: 3000, color: '#fde68a', glow: '#fcd34d' },
  ];
  
  const currentTier = tierInfo?.current_tier ?? 0;
  const tierProgress = tierInfo?.tier_progress ?? 0;
  const tierBase = tierInfo?.tier_base ?? 0;
  const tierCeiling = tierInfo?.tier_ceiling ?? 1000;

  const activeTier   = currentTier > 0 ? TIERS[currentTier - 1] : null;
  const nextTier     = currentTier < TIERS.length ? TIERS[currentTier] : null;

  const billShare  = (Math.abs(billTubo) + Math.abs(cashTubo)) > 0
    ? (Math.abs(billTubo) / (Math.abs(billTubo) + Math.abs(cashTubo))) * 100
    : 50;
  const cashShare  = 100 - billShare;

  const accentGood = '#6ee7b7';
  const accentWarn = '#fca5a5';
  const accentMain = isPos ? accentGood : accentWarn;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full relative"
      style={{
        background: isPos
          ? 'linear-gradient(160deg, #064e3b 0%, #065f46 45%, #059669 100%)'
          : 'linear-gradient(160deg, #7f1d1d 0%, #991b1b 45%, #dc2626 100%)',
        boxShadow: isPos
          ? '0 8px 32px rgba(5,150,105,0.25)'
          : '0 8px 32px rgba(220,38,38,0.25)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-6 bottom-24 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute right-10 bottom-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg leading-none">₱</span>
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest leading-none mb-0.5">
              Net Tubo
            </p>
            <p className="text-white text-xs font-medium">
              {month ? formatMonth(month) : 'All Time'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={onNext} disabled={isCurrentMonth}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white disabled:opacity-30 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col px-6 py-4 relative gap-4 justify-center">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-10 w-36 bg-white/20 rounded-xl animate-pulse" />
            <div className="h-3 w-full bg-white/10 rounded-full animate-pulse" />
            <div className="h-20 w-full bg-white/10 rounded-xl animate-pulse" />
            <div className="h-16 w-full bg-white/10 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Big number + tier badge */}
            <div className="flex items-end gap-3">
              <p className="text-4xl font-extrabold text-white tracking-tight leading-none">
                ₱{fmt(totalTubo)}
              </p>
              {activeTier ? (
                <span
                  className="mb-1 px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: activeTier.color }}
                >
                  {activeTier.label} reached!
                </span>
              ) : (
                <span
                  className="mb-1 px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fcd34d' }}
                >
                  {tierProgress.toFixed(1)}% to {nextTier?.label}
                </span>
              )}
            </div>

            {/* 3-tier goal track */}
            <div>
              {/* Tier markers */}
              <div className="flex justify-between text-[10px] font-semibold mb-1.5">
                {TIERS.map(t => (
                  <span key={t.label} style={{ color: totalTubo >= t.target ? t.color : 'rgba(255,255,255,0.3)' }}>
                    {t.label} ₱{(t.target / 1000).toFixed(0)}k
                  </span>
                ))}
              </div>
              {/* Segmented bar */}
              <div className="flex gap-1">
                {TIERS.map((t, i) => {
                  const segBase    = i === 0 ? 0 : TIERS[i - 1].target;
                  const segFill    = Math.min(Math.max(totalTubo - segBase, 0) / (t.target - segBase) * 100, 100);
                  return (
                    <div key={t.label} className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${segFill}%`, background: `linear-gradient(90deg, ${t.glow}, ${t.color})` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>₱0</span>
                <span>₱{fmt(totalTubo)} / ₱3,000</span>
              </div>
            </div>

            {/* 2×2 stat grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: <ReceiptText size={13} className="text-blue-200" />,   label: 'Bills Tubo',  value: `₱${fmt(billTubo)}`,  sub: `${totalPay} txns` },
                { icon: <ArrowDownCircle size={13} className="text-emerald-200" />, label: 'Cash Tubo', value: `₱${fmt(cashTubo)}`, sub: `${tuboData?.monthly?.reduce((s, m) => s + (m.cash_count ?? 0), 0) ?? 0} settled` },
                { icon: <TrendingUp size={13} className="text-white/60" />,    label: 'Total Fee',   value: `₱${fmt(totalFee)}`,  sub: null },
                { icon: <ArrowUpCircle size={13} className="text-white/60" />, label: 'Deductions',  value: `₱${fmt(totalDed)}`,  sub: null },
              ].map(({ icon, label, value, sub }) => (
                <div key={label} className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ background: 'rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
                  </div>
                  <p className="text-white font-bold text-sm">{value}</p>
                  {sub && <p className="text-white/40 text-[10px]">{sub}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom strip ── */}
      <div
        className="grid grid-cols-3 divide-x divide-white/10 relative"
        style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        {[
          { label: 'Net Tubo',   value: `₱${fmt(totalTubo)}`,                                    color: accentMain },
          { label: 'Goal',       value: activeTier ? activeTier.label : `${tierProgress.toFixed(0)}%`, color: activeTier ? activeTier.color : '#fcd34d' },
          { label: 'Total Txns', value: totalPay,                                                 color: 'white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-3 text-center">
            <p className="text-white/50 text-[10px] font-medium mb-0.5">{label}</p>
            <p className="font-bold text-sm" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tubo History ──────────────────────────────────────────────────────────────

function TuboHistory({ monthlyData, isLoading }) {
  const monthly = monthlyData ?? [];
  const rows = monthly;

  const maxTubo = Math.max(...rows.map((r) => Math.abs(r.total_tubo)), 1);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}
    >
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid #f1f5ff' }}>
        <div>
          <h2 className="font-semibold text-slate-800">Tubo History</h2>
          <p className="text-xs text-slate-400 mt-0.5">Monthly breakdown — bills + settled cash</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: '#f0fdf4', color: '#059669' }}>
          Last 12 months
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <TrendingUp size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No tubo data yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f8faff' }}>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Month</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Bills Tubo</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Tubo</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Bar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPos = row.total_tubo >= 0;
              const barPct = Math.round((Math.abs(row.total_tubo) / maxTubo) * 100);
              return (
                <tr key={row.month} className="border-t border-slate-50 hover:bg-blue-50/30">
                  <td className="px-6 py-3.5 font-medium text-slate-700 whitespace-nowrap">{row.month_label}</td>
                  <td className="px-6 py-3.5 text-right text-slate-500 whitespace-nowrap">
                    <span className="text-xs">₱{fmt(row.bill_tubo)}</span>
                    {row.bill_count > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">({row.bill_count})</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-500 whitespace-nowrap">
                    <span className="text-xs">₱{fmt(row.cash_tubo)}</span>
                    {row.cash_count > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">({row.cash_count})</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold whitespace-nowrap"
                    style={{ color: isPos ? '#059669' : '#dc2626' }}>
                    ₱{fmt(row.total_tubo)}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          background: isPos
                            ? 'linear-gradient(90deg, #059669, #10b981)'
                            : 'linear-gradient(90deg, #dc2626, #ef4444)',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr style={{ background: '#f8faff', borderTop: '2px solid #e0e7ff' }}>
              <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</td>
              <td className="px-6 py-3 text-right font-bold text-slate-700">
                ₱{fmt(rows.reduce((s, r) => s + r.bill_tubo, 0))}
              </td>
              <td className="px-6 py-3 text-right font-bold text-slate-700">
                ₱{fmt(rows.reduce((s, r) => s + r.cash_tubo, 0))}
              </td>
              <td className="px-6 py-3 text-right font-extrabold"
                style={{ color: rows.reduce((s, r) => s + r.total_tubo, 0) >= 0 ? '#059669' : '#dc2626' }}>
                ₱{fmt(rows.reduce((s, r) => s + r.total_tubo, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(toYearMonth(today));
  const isCurrentMonth = selectedMonth === toYearMonth(today);

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    setSelectedMonth(toYearMonth(new Date(y, m - 2)));
  };
  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    setSelectedMonth(toYearMonth(new Date(y, m)));
  };

  // OPTIMIZED: Single query for all dashboard data with caching
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', selectedMonth],
    queryFn: () => getDashboardSummary({ month: selectedMonth }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const billsData = data?.bills ?? {};
  const cashData = data?.cash ?? {};
  const tuboData = data?.tubo ?? {};

  const total       = billsData.total        ?? 0;
  const paid        = billsData.paid         ?? 0;
  const partial     = billsData.partial      ?? 0;
  const unpaid      = billsData.unpaid       ?? 0;
  const totalAmount = parseFloat(billsData.total_amount ?? 0);
  const totalPaid   = parseFloat(billsData.total_paid   ?? 0);
  const totalBal    = parseFloat(billsData.total_bal    ?? 0);
  const recent      = billsData.recent       ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Overview of your bills and payments</p>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 font-medium">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <>
          {/* ── Row 1: Overview (left) + Tubo (right, taller) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* Left column: Bills Overview + Cash In/Out */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <OverviewCard
                total={total} paid={paid} partial={partial} unpaid={unpaid}
                totalAmount={totalAmount} totalPaid={totalPaid} totalBal={totalBal}
              />
              <CashOverviewCard cashIn={cashData.cash_in} cashOut={cashData.cash_out} />
            </div>

            {/* Right column: Tubo Card stretches to match left column height */}
            <div className="lg:col-span-1 flex flex-col h-full">
              <TuboCard
                month={selectedMonth}
                onPrev={prevMonth}
                onNext={nextMonth}
                isCurrentMonth={isCurrentMonth}
                tuboData={tuboData}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* ── Row 3: Recent bills ── */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 2px 16px rgba(37,99,235,0.07)', border: '1px solid #e0e7ff' }}
          >
            {/* Table header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f1f5ff' }}
            >
              <div>
                <h2 className="font-semibold text-slate-800">Recent Bills</h2>
                <p className="text-xs text-slate-400 mt-0.5">Latest {recent.length} records</p>
              </div>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: '#eff6ff', color: '#2563eb' }}
              >
                {total} total
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8faff' }}>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((bill) => (
                    <tr key={bill.id} className="border-t border-slate-50 hover:bg-blue-50/40" style={{ transition: 'background 120ms' }}>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{bill.transaction_id}</span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        <CategoryDisplay name={bill.category?.name} logoUrl={bill.category?.logo_url} />
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                        ₱{parseFloat(bill.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap"><StatusBadge status={bill.status} /></td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-16 text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No bills yet</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-50">
              {recent.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No bills yet</p>
                </div>
              ) : recent.map((bill) => (
                <div key={bill.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{bill.transaction_id}</span>
                    <div className="mt-1"><CategoryDisplay name={bill.category?.name} logoUrl={bill.category?.logo_url} /></div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="font-bold text-slate-800 text-sm">₱{parseFloat(bill.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <StatusBadge status={bill.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 4: Tubo History ── */}
          <TuboHistory monthlyData={tuboData.monthly} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
