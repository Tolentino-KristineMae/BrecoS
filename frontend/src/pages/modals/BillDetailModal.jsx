import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, PlusCircle, Receipt, Hash, User, CreditCard, Calendar, FileText, CheckCircle2, AlertTriangle, Clock, ImagePlus, X as XIcon, ExternalLink, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

import { getBill, addPayment, updatePayment, deletePayment, getChannels } from '../../api/bills';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import CategoryDisplay from '../../components/CategoryDisplay';
import ConfirmModal from '../../components/ConfirmModal';

const fieldCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';

const PRESET_AMOUNTS = [5, 10, 20, 30];

/**
 * Quick-select amount picker: preset buttons + Others inline input.
 */
function AmountPicker({ value, onChange }) {
  const isOther   = value !== '' && !PRESET_AMOUNTS.includes(Number(value));
  const [showOther, setShowOther] = useState(isOther);

  const selectPreset = (amt) => {
    setShowOther(false);
    onChange(String(amt));
  };

  const selectOther = () => {
    setShowOther(true);
    if (!isOther) onChange('');
  };

  return (
    <div className="flex items-center gap-1 flex-nowrap">
      {PRESET_AMOUNTS.map((amt) => (
        <button
          key={amt}
          type="button"
          onClick={() => selectPreset(amt)}
          className={`px-2 py-1 rounded-lg text-xs font-bold border whitespace-nowrap transition-all flex-shrink-0 ${
            !showOther && Number(value) === amt
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          ₱{amt}
        </button>
      ))}
      {showOther ? (
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={isOther ? value : ''}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          className="w-20 border border-blue-400 ring-1 ring-blue-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none flex-shrink-0"
        />
      ) : (
        <button
          type="button"
          onClick={selectOther}
          className="px-2 py-1 rounded-lg text-xs font-bold border whitespace-nowrap transition-all flex-shrink-0 bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
        >
          Others
        </button>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={13} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

/**
 * Returns a pill showing whether the bill was paid before/after due,
 * or how many days remain / overdue if not yet fully paid.
 */
function DueDateStatus({ bill }) {
  if (!bill.due_date) return null;

  const due      = new Date(bill.due_date);
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / 86400000); // positive = future

  // ── Bill is fully paid ────────────────────────────────────────────────────
  if (bill.status === 'paid' && bill.payments?.length) {
    // Use the date of the last payment as the "paid on" date
    const lastPayment = [...bill.payments].sort(
      (a, b) => new Date(b.date_paid) - new Date(a.date_paid)
    )[0];
    const paidOn  = new Date(lastPayment.date_paid);
    paidOn.setHours(0, 0, 0, 0);
    const daysDiff = Math.round((due - paidOn) / 86400000);

    if (daysDiff > 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-700">
            Paid {daysDiff} day{daysDiff !== 1 ? 's' : ''} before due date
          </span>
        </div>
      );
    } else if (daysDiff === 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-700">Paid on the due date</span>
        </div>
      );
    } else {
      const late = Math.abs(daysDiff);
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-orange-700">
            Paid {late} day{late !== 1 ? 's' : ''} after due date
          </span>
        </div>
      );
    }
  }

  // ── Bill not yet fully paid ───────────────────────────────────────────────
  if (diffDays > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <Clock size={14} className="text-blue-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-blue-700">
          Due in {diffDays} day{diffDays !== 1 ? 's' : ''}
        </span>
      </div>
    );
  } else if (diffDays === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
        <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-orange-700">Due today!</span>
      </div>
    );
  } else {
    const overdue = Math.abs(diffDays);
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
        <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-red-700">
          Overdue by {overdue} day{overdue !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }
}

export default function BillDetailModal({ billId, onClose }) {
  const qc = useQueryClient();

  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_channel_id: '',
    amount: '',
    remarks: '',
    fee_amount: '',
    deduction_amount: '',
  });
  const [receipt, setReceipt]         = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const receiptRef = useRef();

  // ── Edit payment state ────────────────────────────────────────────────────
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editReceipt, setEditReceipt]         = useState(null);
  const [editReceiptPreview, setEditReceiptPreview] = useState(null);
  const editReceiptRef = useRef();

  const startEdit = (p) => {
    setEditId(p.id);
    setEditForm({
      payment_channel_id: p.payment_channel_id,
      amount:             p.amount,
      remarks:            p.remarks ?? '',
      fee_amount:         p.fee_amount ?? '',
      deduction_amount:   p.deduction_amount ?? '',
    });
    setEditReceipt(null);
    setEditReceiptPreview(p.receipt_url ?? null);
  };
  const cancelEdit = () => { setEditId(null); setEditForm({}); setEditReceipt(null); setEditReceiptPreview(null); };

  // ── Receipt viewer ────────────────────────────────────────────────────────
  const [viewReceipt, setViewReceipt] = useState(null); // { url, isPdf }
  const [confirmPaymentId, setConfirmPaymentId] = useState(null);

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => getBill(billId),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const addMutation = useMutation({
    mutationFn: (data) => addPayment(billId, data),
    onSuccess: () => {
      toast.success('Payment recorded!');
      qc.invalidateQueries({ queryKey: ['bill', billId] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      setShowPayForm(false);
      setPayForm({ payment_channel_id: '', amount: '', remarks: '', fee_amount: '', deduction_amount: '' });
      setReceipt(null); setReceiptPreview(null);
      if (receiptRef.current) receiptRef.current.value = '';
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to add payment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId) => deletePayment(billId, paymentId),
    onSuccess: () => {
      toast.success('Payment removed.');
      qc.invalidateQueries({ queryKey: ['bill', billId] });
      qc.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: () => toast.error('Failed to delete payment.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ paymentId, data }) => updatePayment(billId, paymentId, data),
    onSuccess: () => {
      toast.success('Payment updated.');
      qc.invalidateQueries({ queryKey: ['bill', billId] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      cancelEdit();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to update payment.'),
  });

  const set = (field) => (e) => setPayForm((f) => ({ ...f, [field]: e.target.value }));

  if (isLoading) {
    return (
      <Modal title="Bill Details" onClose={onClose}>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Modal>
    );
  }

  const balance = parseFloat(bill.total_amount) - parseFloat(bill.amount_paid);
  const pct     = Math.min(100, (parseFloat(bill.amount_paid) / parseFloat(bill.total_amount)) * 100);
  const fmt     = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  const fmtDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
    <Modal title={`Bill — ${bill.transaction_id}`} onClose={onClose} size="lg">
      <div className="space-y-5">

        {/* ── Amount hero ── */}
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
        >
          {/* Decorations */}
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-1">Transaction ID</p>
                <p className="font-mono font-bold text-white text-sm bg-white/15 px-3 py-1 rounded-lg inline-block">
                  {bill.transaction_id}
                </p>
              </div>
              <StatusBadge status={bill.status} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-blue-200 text-xs mb-1">Total Amount</p>
                <p className="text-xl font-bold text-white">₱{fmt(bill.total_amount)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Amount Paid</p>
                <p className="text-xl font-bold text-emerald-300">₱{fmt(bill.amount_paid)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Balance</p>
                <p className="text-xl font-bold text-red-300">₱{fmt(balance)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #34d399, #10b981)',
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
              <p className="text-xs text-blue-200 mt-1.5 text-right">{pct.toFixed(1)}% paid</p>
            </div>
          </div>
        </div>

        {/* ── Bill info ── */}
        <div
          className="rounded-2xl px-4 py-1"
          style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}
        >
          <InfoRow icon={Receipt}  label="Category"       value={<CategoryDisplay name={bill.category?.name} logoUrl={bill.category?.logo_url} />} />
          <InfoRow icon={User}     label="Biller Name"    value={bill.biller_name} />
          <InfoRow icon={Hash}     label="Account Number" value={bill.account_number} mono />
          <InfoRow icon={Calendar} label="Due Date"       value={fmtDate(bill.due_date)} />
          {bill.notes && (
            <InfoRow icon={FileText} label="Notes" value={bill.notes} />
          )}
        </div>

        {/* ── Due date status pill ── */}
        <DueDateStatus bill={bill} />

        {/* ── Payment History ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Payment History</h3>
            {bill.status !== 'paid' && (
              <button
                onClick={() => setShowPayForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={
                  showPayForm
                    ? { background: '#fee2e2', color: '#dc2626' }
                    : { background: '#eff6ff', color: '#2563eb' }
                }
              >
                <PlusCircle size={13} />
                {showPayForm ? 'Cancel' : 'Add Payment'}
              </button>
            )}
          </div>

          {/* Add Payment Form */}
          {showPayForm && (
            <form
              onSubmit={(e) => { e.preventDefault(); addMutation.mutate({ ...payForm, receipt }); }}
              className="rounded-2xl p-4 mb-3 space-y-3"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
            >
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Record Payment</p>

              {/* Channel + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Payment Channel <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={payForm.payment_channel_id}
                    onChange={set('payment_channel_id')}
                    className={fieldCls}
                  >
                    <option value="">Where did you pay?</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Amount (₱) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number" required min="0.01" step="0.01" max={balance}
                      placeholder="0.00"
                      value={payForm.amount} onChange={set('amount')} className={fieldCls}
                    />
                    <button
                      type="button"
                      onClick={() => setPayForm((f) => ({ ...f, amount: balance.toFixed(2) }))}
                      className="flex-shrink-0 px-3 py-2 text-xs font-bold rounded-xl border-2 border-blue-400 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                      title={`Fill remaining balance ₱${balance.toFixed(2)}`}
                    >
                      Max
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Remaining balance: <span className="font-semibold text-slate-600">₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>

              {/* Fee + Deduction + live tubo preview */}
              <div
                className="rounded-xl p-3 space-y-2.5"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
              >
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Tubo Tracking</p>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Fee Charged (₱)</label>
                    <AmountPicker
                      value={payForm.fee_amount}
                      onChange={(v) => setPayForm((f) => ({ ...f, fee_amount: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Deduction / Cost (₱)</label>
                    <AmountPicker
                      value={payForm.deduction_amount}
                      onChange={(v) => setPayForm((f) => ({ ...f, deduction_amount: v }))}
                    />
                  </div>
                </div>

                {/* Live tubo */}
                {(() => {
                  const fee = parseFloat(payForm.fee_amount) || 0;
                  const ded = parseFloat(payForm.deduction_amount) || 0;
                  const tubo = fee - ded;
                  if (fee === 0 && ded === 0) return null;
                  return (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                      <span className="text-xs font-semibold text-slate-500">Net Tubo</span>
                      <span
                        className="text-sm font-bold px-3 py-0.5 rounded-lg"
                        style={{
                          background: tubo >= 0 ? '#dcfce7' : '#fee2e2',
                          color: tubo >= 0 ? '#15803d' : '#dc2626',
                        }}
                      >
                        ₱{tubo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
                <input
                  type="text" placeholder="Optional remarks…"
                  value={payForm.remarks} onChange={set('remarks')} className={fieldCls}
                />
              </div>

              {/* Receipt upload */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Receipt / Proof of Payment</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => receiptRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-xl border border-blue-200 hover:bg-blue-50"
                  >
                    <ImagePlus size={13} />
                    {receipt ? 'Change receipt' : 'Upload receipt'}
                  </button>
                  {receiptPreview && (
                    <div className="flex items-center gap-2">
                      <img src={receiptPreview} alt="receipt" className="h-10 w-auto rounded-lg object-cover border border-slate-200" />
                      <button type="button" onClick={() => { setReceipt(null); setReceiptPreview(null); if (receiptRef.current) receiptRef.current.value = ''; }}
                        className="text-slate-400 hover:text-red-500">
                        <XIcon size={13} />
                      </button>
                    </div>
                  )}
                  {receipt && !receiptPreview && (
                    <span className="text-xs text-slate-500">{receipt.name}</span>
                  )}
                </div>
                <input
                  ref={receiptRef} type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setReceipt(file);
                    if (file.type.startsWith('image/')) {
                      setReceiptPreview(URL.createObjectURL(file));
                    } else {
                      setReceiptPreview(null); // PDF — no preview
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button" onClick={() => setShowPayForm(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={addMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}
                >
                  {addMutation.isPending ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Payments list */}
          {!bill.payments?.length ? (
            <div className="text-center py-8 text-slate-400">
              <CreditCard size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payments recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {bill.payments.map((p, i) => {
                  const tubo   = parseFloat(p.tubo ?? 0);
                  const fee    = parseFloat(p.fee_amount ?? 0);
                  const ded    = parseFloat(p.deduction_amount ?? 0);
                  const hasFee = fee > 0 || ded > 0;
                  const isEditing = editId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="rounded-xl px-4 py-3 group"
                      style={{ background: isEditing ? '#eff6ff' : '#f8faff', border: `1px solid ${isEditing ? '#bfdbfe' : '#e0e7ff'}` }}
                    >
                      {isEditing ? (
                        /* ── Inline edit form ── */
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Edit Payment #{i + 1}</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Channel</label>
                              <select
                                value={editForm.payment_channel_id}
                                onChange={(e) => setEditForm((f) => ({ ...f, payment_channel_id: e.target.value }))}
                                className={fieldCls}
                              >
                                {channels.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₱)</label>
                              <input
                                type="number" min="0.01" step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                                className={fieldCls}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Fee (₱)</label>
                              <AmountPicker
                                value={editForm.fee_amount}
                                onChange={(v) => setEditForm((f) => ({ ...f, fee_amount: v }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Deduction (₱)</label>
                              <AmountPicker
                                value={editForm.deduction_amount}
                                onChange={(v) => setEditForm((f) => ({ ...f, deduction_amount: v }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Remarks</label>
                            <input type="text" placeholder="Optional…"
                              value={editForm.remarks}
                              onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                              className={fieldCls} />
                          </div>

                          {/* Receipt */}
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => editReceiptRef.current?.click()}
                              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50">
                              <ImagePlus size={12} />
                              {editReceipt ? 'Change receipt' : 'Replace receipt'}
                            </button>
                            {editReceiptPreview && (
                              <button type="button"
                                onClick={() => setViewReceipt({ url: editReceiptPreview, isPdf: editReceiptPreview.endsWith('.pdf') })}
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                <ExternalLink size={11} /> View current
                              </button>
                            )}
                            <input ref={editReceiptRef} type="file" accept="image/*,application/pdf" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setEditReceipt(file);
                                setEditReceiptPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
                              }} />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={cancelEdit}
                              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-white">
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ paymentId: p.id, data: { ...editForm, receipt: editReceipt } })}
                              className="px-3 py-1.5 text-xs font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}
                            >
                              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── View mode ── */
                        <>
                          {/* ── Top bar: number + amount + channel + actions ── */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              {/* Step badge */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
                              >
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-base font-extrabold text-slate-800 leading-none">
                                  ₱{fmt(p.amount)}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                  via <span className="text-slate-600">{p.payment_channel?.name ?? '—'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {hasFee && (
                                <span
                                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                                  style={{
                                    background: tubo >= 0 ? '#dcfce7' : '#fee2e2',
                                    color: tubo >= 0 ? '#15803d' : '#dc2626',
                                  }}
                                >
                                  Tubo ₱{fmt(tubo)}
                                </span>
                              )}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(p)} title="Edit"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-500">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setConfirmPaymentId(p.id)} title="Delete"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ── Detail pills row ── */}
                          <div
                            className="flex flex-wrap gap-2 pt-2.5"
                            style={{ borderTop: '1px solid #f1f5ff' }}
                          >
                            {/* Date Paid */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#f8faff' }}>
                              <Calendar size={11} className="text-blue-400 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-400 leading-none mb-0.5">Date Paid</p>
                                <p className="text-xs font-semibold text-slate-700">{fmtDate(p.date_paid)}</p>
                              </div>
                            </div>

                            {/* Remarks */}
                            {p.remarks && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#f8faff' }}>
                                <FileText size={11} className="text-blue-400 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-slate-400 leading-none mb-0.5">Remarks</p>
                                  <p className="text-xs font-semibold text-slate-700">{p.remarks}</p>
                                </div>
                              </div>
                            )}

                            {/* Fee */}
                            {hasFee && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#f0fdf4' }}>
                                <Receipt size={11} className="text-emerald-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-emerald-600 leading-none mb-0.5">Fee</p>
                                  <p className="text-xs font-semibold text-emerald-700">₱{fmt(fee)}</p>
                                </div>
                              </div>
                            )}

                            {/* Deduction */}
                            {hasFee && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#fef2f2' }}>
                                <Hash size={11} className="text-red-400 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-red-400 leading-none mb-0.5">Deduction</p>
                                  <p className="text-xs font-semibold text-red-600">₱{fmt(ded)}</p>
                                </div>
                              </div>
                            )}

                            {/* Receipt */}
                            {p.receipt_url && (
                              <button
                                type="button"
                                onClick={() => setViewReceipt({ url: p.receipt_url, isPdf: p.receipt_url.endsWith('.pdf') })}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
                                style={{ background: '#eff6ff' }}
                              >
                                <ExternalLink size={11} className="text-blue-500 flex-shrink-0" />
                                <div className="text-left">
                                  <p className="text-xs text-blue-400 leading-none mb-0.5">Receipt</p>
                                  <p className="text-xs font-semibold text-blue-600">View</p>
                                </div>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total tubo summary */}
              {(() => {
                const t = bill.payment_totals;
                if (!t || (t.total_fee === 0 && t.total_deduction === 0)) return null;
                const totalTubo = t.total_tubo;
                return (
                  <div
                    className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: totalTubo >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${totalTubo >= 0 ? '#bbf7d0' : '#fecaca'}` }}
                  >
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Total Fee Charged: <span className="font-semibold text-slate-700">₱{fmt(t.total_fee)}</span></p>
                      <p>Total Deductions: <span className="font-semibold text-slate-700">₱{fmt(t.total_deduction)}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400 mb-0.5">Total Tubo</p>
                      <p className="text-lg font-bold" style={{ color: totalTubo >= 0 ? '#15803d' : '#dc2626' }}>
                        ₱{fmt(totalTubo)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </Modal>

    {/* ── Receipt Lightbox ── */}
    {viewReceipt && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={() => setViewReceipt(null)}
      >
        <div
          className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            <p className="text-sm font-semibold text-white">Receipt</p>
            <button
              onClick={() => setViewReceipt(null)}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
            >
              <XIcon size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50">
            {viewReceipt.isPdf ? (
              <iframe src={viewReceipt.url} title="Receipt" className="w-full rounded-lg border" style={{ height: '70vh' }} />
            ) : (
              <img src={viewReceipt.url} alt="Receipt" className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-lg" />
            )}
          </div>
          <div className="px-5 py-3 border-t flex justify-end">
            <a href={viewReceipt.url} download target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">
              <ExternalLink size={12} /> Open in new tab
            </a>
          </div>
        </div>
      </div>
    )}
    {confirmPaymentId && (
      <ConfirmModal
        title="Remove Payment"
        message="This will permanently remove this payment record. This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => { deleteMutation.mutate(confirmPaymentId); setConfirmPaymentId(null); }}
        onCancel={() => setConfirmPaymentId(null)}
      />
    )}
    </>
  );
}
