import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Eye, Filter, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { getCashTransactions, deleteCashTransaction } from '../api/cash';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import CashFormModal from './modals/CashFormModal';
import CashDetailModal from './modals/CashDetailModal';

const inputCls =
  'border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';

const TYPE_STYLES = {
  cash_in:  { label: 'Cash In',  bg: '#ecfdf5', color: '#065f46', icon: ArrowDownCircle, dot: '#10b981' },
  cash_out: { label: 'Cash Out', bg: '#fef2f2', color: '#991b1b', icon: ArrowUpCircle,   dot: '#ef4444' },
};

const STATUS_STYLES = {
  pending:  { bg: '#fff7ed', color: '#92400e', label: 'Pending'  },
  paid:     { bg: '#eff6ff', color: '#1d4ed8', label: 'Paid'     },
  settled:  { bg: '#ecfdf5', color: '#065f46', label: 'Settled'  },
};

function TypeBadge({ type }) {
  const s = TYPE_STYLES[type];
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={11} />
      {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { bg: '#f1f5f9', color: '#475569', label: status };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export default function CashPage() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { cashId } = useParams();

  const showNew    = cashId === 'new-in' || cashId === 'new-out';
  const newType    = cashId === 'new-in' ? 'cash_in' : cashId === 'new-out' ? 'cash_out' : null;
  const detailId   = cashId && !showNew ? cashId : null;

  const closeModal = () => navigate('/cash');

  const [search, setSearch] = useState('');
  const [type, setType]     = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth]   = useState('');
  const [page, setPage]     = useState(1);
  const [confirmId, setConfirmId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cash', { search, type, status, month, page }],
    queryFn: () => getCashTransactions({ search, type, status, month, page, per_page: 15 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    retry: false,
    onSuccess: () => {
      toast.success('Transaction deleted.');
      qc.resetQueries({ queryKey: ['cash'] });
      qc.removeQueries({ queryKey: ['cash-txn'] });
      if (detailId) closeModal();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to delete transaction.'),
  });

  const txns = data?.data ?? [];
  const meta = data;
  const fmt     = (n) => parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  const fmtDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash Transactions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track cash in and cash out with tubo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/cash/new-in')}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <ArrowDownCircle size={15} /> Cash In
          </button>
          <button onClick={() => navigate('/cash/new-out')}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
            <ArrowUpCircle size={15} /> Cash Out
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 8px rgba(37,99,235,0.05)' }}>
        <Filter size={15} className="text-blue-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search name, code, remarks…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Types</option>
          <option value="cash_in">Cash In</option>
          <option value="cash_out">Cash Out</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="settled">Settled</option>
        </select>
        <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return <option key={val} value={val}>{d.toLocaleString('en-PH', { month: 'long', year: 'numeric' })}</option>;
          })}
        </select>
        {(search || type || status || month) && (
          <button onClick={() => { setSearch(''); setType(''); setStatus(''); setMonth(''); setPage(1); }}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}>
        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <ArrowDownCircle size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No transactions found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8faff' }}>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Code</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Person</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Tubo</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((txn) => (
                    <tr key={txn.id} className="border-t border-slate-50 hover:bg-blue-50/30 cursor-pointer"
                      onClick={() => navigate(`/cash/${txn.id}`)}>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {txn.transaction_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap"><TypeBadge type={txn.type} /></td>
                      <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">{txn.person_name}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">₱{fmt(txn.amount)}</td>
                      <td className="px-5 py-3.5 text-right font-bold whitespace-nowrap"
                        style={{ color: parseFloat(txn.tubo) >= 0 ? '#059669' : '#dc2626' }}>
                        ₱{fmt(txn.tubo)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(txn.transaction_date)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={txn.status} /></td>
                      <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/cash/${txn.id}`)} title="View"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700">
                            <Eye size={15} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmId(txn.id); }} title="Delete"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-50">
              {txns.map((txn) => (
                <div key={txn.id} className="p-4 hover:bg-blue-50/30 cursor-pointer"
                  onClick={() => navigate(`/cash/${txn.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                          {txn.transaction_code}
                        </span>
                        <TypeBadge type={txn.type} />
                        <StatusBadge status={txn.status} />
                      </div>
                      <p className="font-medium text-slate-700 text-sm truncate">{txn.person_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(txn.transaction_date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="font-bold text-slate-800 text-sm">₱{fmt(txn.amount)}</p>
                      <p className="text-xs font-bold" style={{ color: parseFloat(txn.tubo) >= 0 ? '#059669' : '#dc2626' }}>
                        Tubo: ₱{fmt(txn.tubo)}
                      </p>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/cash/${txn.id}`)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50">
                          <Eye size={15} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmId(txn.id); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-sm">
            <span className="text-slate-400 text-xs">
              Showing <span className="font-semibold text-slate-600">{meta.from}–{meta.to}</span> of <span className="font-semibold text-slate-600">{meta.total}</span>
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600">← Prev</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showNew && <CashFormModal type={newType} onClose={closeModal} />}
      {detailId && <CashDetailModal txnId={detailId} onClose={closeModal} />}
      {confirmId && (
        <ConfirmModal
          title="Delete Transaction"
          message="This will permanently delete the transaction and all its files. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => { deleteMutation.mutate(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
