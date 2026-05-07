import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Eye, Filter, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBills, deleteBill, getCategories } from '../api/bills';
import StatusBadge from '../components/StatusBadge';
import CategoryDisplay from '../components/CategoryDisplay';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import CreateBillModal from './modals/CreateBillModal';
import BillDetailModal from './modals/BillDetailModal';

const inputCls =
  'border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';

export default function BillsPage() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { billId } = useParams(); // undefined | 'new' | '<id>'

  const showCreate = billId === 'new';
  const detailId   = billId && billId !== 'new' ? billId : null;

  const openCreate = ()      => navigate('/bills/new');
  const openDetail = (bill)  => navigate(`/bills/${bill.id}`);
  const closeModal = ()      => navigate('/bills');

  const [search, setSearch]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus]         = useState('');
  const [month, setMonth]           = useState('');
  const [page, setPage]             = useState(1);
  const [confirmBill, setConfirmBill] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', { search, categoryId, status, month, page }],
    queryFn: () => getBills({ search, category_id: categoryId, status, month, page, per_page: 15 }),
    keepPreviousData: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBill,
    onSuccess: () => {
      toast.success('Bill deleted.');
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['bill-stats'] });
    },
    onError: () => toast.error('Failed to delete bill.'),
  });

  const handleDelete = (e, bill) => {
    e.stopPropagation();
    setConfirmBill(bill);
  };

  const bills = data?.data ?? [];
  const meta  = data;

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bills Records</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage and track all your bill payments</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-blue-200 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}
        >
          <Plus size={16} />
          New Bill
        </button>
      </div>

      {/* ── Filters ── */}
      <div
        className="bg-white rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 8px rgba(37,99,235,0.05)' }}
      >
        <Filter size={15} className="text-blue-400 flex-shrink-0" />

        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by transaction ID, biller, account, category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputCls} w-full pl-9`}
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className={`${inputCls} w-full sm:w-auto`}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={`${inputCls} w-full sm:w-auto`}
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>

        {/* Month filter */}
        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className={`${inputCls} w-full sm:w-auto`}
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
            return <option key={val} value={val}>{label}</option>;
          })}
        </select>

        {(search || categoryId || status || month) && (
          <button
            onClick={() => { setSearch(''); setCategoryId(''); setStatus(''); setMonth(''); setPage(1); }}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}
      >
        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No bills found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new bill</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8faff' }}>
                    <th className="px-5 py-3.5 text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Transaction ID</th>
                    <th className="px-5 py-3.5 text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="px-5 py-3.5 text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Biller</th>
                    <th className="px-5 py-3.5 text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Account No.</th>
                    <th className="px-5 py-3.5 text-right  text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total</th>
                    <th className="px-5 py-3.5 text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="border-t border-slate-50 hover:bg-blue-50/30 cursor-pointer"
                      onClick={() => openDetail(bill)}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {bill.transaction_id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-700"><CategoryDisplay name={bill.category?.name} logoUrl={bill.category?.logo_url} /></span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{bill.biller_name || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">{bill.account_number || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                        ₱{parseFloat(bill.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={bill.status} /></td>
                      <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openDetail(bill)} title="View / Pay"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700">
                            <Eye size={15} />
                          </button>
                          <button onClick={(e) => handleDelete(e, bill)} title="Delete"
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
              {bills.map((bill) => (
                <div key={bill.id} className="p-4 hover:bg-blue-50/30 cursor-pointer" onClick={() => openDetail(bill)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                          {bill.transaction_id}
                        </span>
                        <StatusBadge status={bill.status} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CategoryDisplay name={bill.category?.name} logoUrl={bill.category?.logo_url} />
                      </div>
                      {bill.biller_name && (
                        <p className="text-xs text-slate-500 truncate">{bill.biller_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="font-bold text-slate-800 text-sm">
                        ₱{parseFloat(bill.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(bill)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50">
                          <Eye size={15} />
                        </button>
                        <button onClick={(e) => handleDelete(e, bill)}
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

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-sm">
            <span className="text-slate-400 text-xs">
              Showing <span className="font-semibold text-slate-600">{meta.from}–{meta.to}</span> of <span className="font-semibold text-slate-600">{meta.total}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
              >
                ← Prev
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateBillModal onClose={closeModal} />}
      {detailId && (
        <BillDetailModal billId={detailId} onClose={closeModal} />
      )}
      {confirmBill && (
        <ConfirmModal
          title="Delete Bill"
          message={`Delete ${confirmBill.transaction_id}? This will remove all payments and cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { deleteMutation.mutate(confirmBill.id); setConfirmBill(null); }}
          onCancel={() => setConfirmBill(null)}
        />
      )}
    </div>
  );
}
