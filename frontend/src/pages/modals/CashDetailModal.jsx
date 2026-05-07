import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, ImagePlus, X, ArrowDownCircle, ArrowUpCircle,
  CheckCircle2, Clock, ExternalLink, Receipt, Camera,
  ShieldCheck, Pencil, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getCashTransaction, updateCashTransaction, deleteCashFile } from '../../api/cash';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const fieldCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';
const PRESETS = [5, 10, 20, 30];
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

// ── Amount picker (same as form) ──────────────────────────────────────────────
function AmountPicker({ value, onChange }) {
  const isOther    = value !== '' && !PRESETS.includes(Number(value));
  const [showOther, setShowOther] = useState(isOther);
  return (
    <div className="flex items-center gap-1 flex-nowrap">
      {PRESETS.map((a) => (
        <button key={a} type="button"
          onClick={() => { setShowOther(false); onChange(String(a)); }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap flex-shrink-0 transition-all ${
            !showOther && Number(value) === a
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}>₱{a}</button>
      ))}
      {showOther ? (
        <input type="number" min="0" step="0.01" placeholder="0.00" autoFocus
          value={isOther ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 border border-blue-400 ring-1 ring-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none flex-shrink-0" />
      ) : (
        <button type="button" onClick={() => { setShowOther(true); onChange(''); }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap flex-shrink-0 bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600">
          Others
        </button>
      )}
    </div>
  );
}

// ── File thumbnail ────────────────────────────────────────────────────────────
function FileThumb({ f, onDelete, onView }) {
  const isImg = f.file_url?.match(/\.(jpg|jpeg|png|webp)$/i);
  const uploadDate = f.created_at
    ? new Date(f.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return (
    <div className="relative group flex-shrink-0 flex flex-col items-center gap-1">
      {isImg ? (
        <img src={f.file_url} alt={f.original_name} onClick={() => onView(f.file_url)}
          className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow cursor-pointer hover:opacity-80 transition-opacity" />
      ) : (
        <button onClick={() => onView(f.file_url)}
          className="w-16 h-16 rounded-xl border-2 border-white shadow bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors">
          PDF
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(f.id)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={9} />
        </button>
      )}
      {uploadDate && (
        <span className="text-[10px] text-slate-400 leading-tight text-center w-16 truncate">{uploadDate}</span>
      )}
    </div>
  );
}

// ── File section ──────────────────────────────────────────────────────────────
function FileSection({ title, icon: Icon, accentColor, files, onDelete, onView, canAdd, maxFiles, pendingFiles, setPendingFiles, readOnly }) {
  const ref       = useRef();
  const total     = (files?.length ?? 0) + (pendingFiles?.length ?? 0);
  const remaining = maxFiles - total;

  return (
    <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: accentColor }} />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-xs text-slate-400">{total}/{maxFiles}</span>
      </div>

      {!files?.length && !pendingFiles?.length ? (
        <p className="text-xs text-slate-400 italic">No files yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {files?.map((f) => (
            <FileThumb key={f.id} f={f} onDelete={!readOnly ? onDelete : null} onView={onView} />
          ))}
          {pendingFiles?.map((f, i) => (
            <div key={i} className="relative group flex-shrink-0 flex flex-col items-center gap-1">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-xl border-2 border-blue-300 shadow opacity-70" />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-blue-300 bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-500 shadow opacity-70">PDF</div>
              )}
              <button onClick={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={9} />
              </button>
              <span className="text-[10px] text-blue-400 leading-tight text-center w-16 truncate italic">Pending…</span>
            </div>
          ))}
          {canAdd && remaining > 0 && (
            <button type="button" onClick={() => ref.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-colors"
              style={{ borderColor: accentColor + '50', color: accentColor }}>
              <ImagePlus size={14} />
              <span className="text-xs font-medium">{remaining}</span>
            </button>
          )}
        </div>
      )}

      {canAdd && !files?.length && !pendingFiles?.length && remaining > 0 && (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: accentColor + '50', color: accentColor, background: accentColor + '08' }}>
          <ImagePlus size={12} /> Add files ({remaining} remaining)
        </button>
      )}

      {canAdd && (
        <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden"
          onChange={(e) => {
            const arr = Array.from(e.target.files).slice(0, remaining);
            setPendingFiles((p) => [...p, ...arr]);
          }} />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CashDetailModal({ txnId, onClose }) {
  const qc = useQueryClient();

  const [viewFile,        setViewFile]        = useState(null);
  const [newProofOfPay,   setNewProofOfPay]   = useState([]);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editForm,        setEditForm]        = useState({});

  const { data: txn, isLoading } = useQuery({
    queryKey: ['cash-txn', txnId],
    queryFn: () => getCashTransaction(txnId),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateCashTransaction(txnId, data),
    retry: false,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['cash-txn', txnId] });
      qc.invalidateQueries({ queryKey: ['cash'] });
      setNewProofOfPay([]);
      setIsEditing(false);
      if (variables?.status === 'settled') {
        toast.success('Transaction settled!');
        onClose();
      } else {
        toast.success('Updated!');
      }
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => deleteCashFile(txnId, fileId),
    retry: false,
    onSuccess: () => { toast.success('File removed.'); qc.invalidateQueries({ queryKey: ['cash-txn', txnId] }); },
  });

  if (isLoading) return (
    <Modal title="Transaction Details" onClose={onClose}>
      <div className="flex justify-center py-12"><Spinner /></div>
    </Modal>
  );

  const isSettled = txn.status === 'settled';
  const isCashIn = txn.type === 'cash_in';
  const Icon     = isCashIn ? ArrowDownCircle : ArrowUpCircle;
  const tubo     = parseFloat(txn.tubo);

  const startEdit = () => {
    setEditForm({
      person_name:      txn.person_name,
      amount:           txn.amount,
      fee_amount:       txn.fee_amount ?? '',
      deduction_amount: txn.deduction_amount ?? '',
      remarks:          txn.remarks ?? '',
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateMutation.mutate(editForm);
  };

  const saveProofOfPayment = () => {
    if (!newProofOfPay.length) return;
    updateMutation.mutate({
      new_proof_of_payments: newProofOfPay,
      // auto-advance to paid when proof of settlement is uploaded
      ...(txn.status === 'pending' ? { status: 'paid' } : {}),
    });
  };

  const markDone = () => {
    updateMutation.mutate({
      status: 'settled',
      ...(newProofOfPay.length ? { new_proof_of_payments: newProofOfPay } : {}),
    });
  };

  const editFee  = parseFloat(editForm.fee_amount)       || 0;
  const editDed  = parseFloat(editForm.deduction_amount) || 0;
  const editTubo = editFee - editDed;

  return (
    <>
    <Modal title={`${isCashIn ? 'Cash In' : 'Cash Out'} — ${txn.transaction_code}`} onClose={onClose} size="lg">
      <div className="space-y-4">

        {/* ── Hero ── */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: isCashIn
              ? 'linear-gradient(135deg, #064e3b 0%, #059669 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">
                  {isCashIn ? 'Cash In' : 'Cash Out'}
                </p>
                <p className="text-4xl font-extrabold text-white leading-none">₱{fmt(txn.amount)}</p>
                <p className="text-white/75 text-sm mt-1 font-medium">{txn.person_name}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{
                  background: txn.status === 'settled'
                    ? 'rgba(16,185,129,0.3)'
                    : txn.status === 'paid'
                    ? 'rgba(99,102,241,0.35)'
                    : 'rgba(255,255,255,0.15)',
                  color: '#fff',
                }}>
                {txn.status === 'settled' && <CheckCircle2 size={12} />}
                {txn.status === 'paid'    && <ShieldCheck size={12} />}
                {txn.status === 'pending' && <Clock size={12} />}
                {txn.status === 'settled' ? 'Settled' : txn.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
              <p className="text-white/50 text-xs mt-2">{fmtDate(txn.transaction_date)}</p>
            </div>
          </div>
        </div>

        {/* ── Edit form OR details ── */}
        {isEditing ? (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Edit Transaction</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Person Name</label>
                <input type="text" value={editForm.person_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, person_name: e.target.value }))}
                  className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount (₱)</label>
                <input type="number" min="0.01" step="0.01" value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  className={fieldCls} />
              </div>
            </div>
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Tubo Tracking</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Fee Charged (₱)</label>
                  <AmountPicker value={editForm.fee_amount} onChange={(v) => setEditForm((f) => ({ ...f, fee_amount: v }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Deduction / Cost (₱)</label>
                  <AmountPicker value={editForm.deduction_amount} onChange={(v) => setEditForm((f) => ({ ...f, deduction_amount: v }))} />
                </div>
              </div>
              {(editFee > 0 || editDed > 0) && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                  <span className="text-xs font-semibold text-slate-500">Net Tubo</span>
                  <span className="text-sm font-extrabold px-3 py-1 rounded-xl"
                    style={{ background: editTubo >= 0 ? '#dcfce7' : '#fee2e2', color: editTubo >= 0 ? '#15803d' : '#dc2626' }}>
                    ₱{editTubo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
              <textarea rows={2} placeholder="Optional notes…" value={editForm.remarks}
                onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                className={`${fieldCls} resize-none`} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-1" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
              {[
                { label: 'Code',             value: txn.transaction_code, mono: true },
                { label: 'Transaction Date', value: fmtDate(txn.transaction_date) },
                txn.remarks ? { label: 'Remarks', value: txn.remarks } : null,
                txn.proofs?.length
                  ? { label: 'Proof of Transaction', value: new Date(txn.proofs[0].created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
                  : { label: 'Proof of Transaction', value: '—', dim: true },
                txn.proof_of_payments?.length
                  ? { label: 'Proof of Settlement', value: new Date(txn.proof_of_payments[0].created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
                  : { label: 'Proof of Settlement', value: '—', dim: true },
              ].filter(Boolean).map(({ label, value, mono, dim }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                  <span className={`text-sm font-semibold ${dim ? 'text-slate-300' : 'text-slate-700'} ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl px-4 py-1" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              {[
                { label: 'Fee Charged', value: `₱${fmt(txn.fee_amount)}`,       color: '#1e293b' },
                { label: 'Deduction',   value: `₱${fmt(txn.deduction_amount)}`, color: '#dc2626' },
                { label: 'Net Tubo',    value: `₱${fmt(tubo)}`,                 color: tubo >= 0 ? '#059669' : '#dc2626', bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-emerald-50 last:border-0">
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                  <span className={`text-sm ${bold ? 'font-extrabold' : 'font-semibold'}`} style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Files ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Proof of Transaction — read-only, uploaded during creation */}
          <FileSection
            title="Proof of Transaction" icon={Camera} accentColor="#7c3aed"
            files={txn.proofs} maxFiles={5}
            onDelete={null}
            onView={setViewFile}
            canAdd={false}
            readOnly={true}
            pendingFiles={[]} setPendingFiles={() => {}}
          />

          {/* Proof of Settlement — locked when settled */}
          <FileSection
            title="Proof of Settlement" icon={ShieldCheck} accentColor="#059669"
            files={txn.proof_of_payments} maxFiles={5}
            onDelete={isSettled ? null : (id) => deleteFileMutation.mutate(id)}
            onView={setViewFile}
            canAdd={!isSettled}
            pendingFiles={newProofOfPay} setPendingFiles={setNewProofOfPay}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-1">
          {/* Edit button — hidden when settled */}
          {!isEditing && !isSettled && (
            <button onClick={startEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300">
              <Pencil size={14} /> Edit
            </button>
          )}

          {isSettled && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 px-3 py-2 rounded-xl"
              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <CheckCircle2 size={13} /> Transaction settled — no further changes allowed
            </span>
          )}

          <div className="flex gap-3 ml-auto">
            {!isSettled && newProofOfPay.length > 0 && (
              <button onClick={saveProofOfPayment} disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}>
                {updateMutation.isPending ? 'Uploading…' : 'Upload Proof'}
              </button>
            )}
            {(txn.status === 'pending' || txn.status === 'paid') && !isEditing && (
              <button onClick={markDone} disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}>
                <Check size={14} /> Mark as Settled
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* ── File lightbox ── */}
    {viewFile && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
        onClick={() => setViewFile(null)}>
        <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            <p className="text-sm font-semibold text-white">File Preview</p>
            <button onClick={() => setViewFile(null)}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50">
            {viewFile.endsWith('.pdf') ? (
              <iframe src={viewFile} title="File" className="w-full rounded-lg border" style={{ height: '70vh' }} />
            ) : (
              <img src={viewFile} alt="File" className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-lg" />
            )}
          </div>
          <div className="px-5 py-3 border-t flex justify-end">
            <a href={viewFile} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">
              <ExternalLink size={12} /> Open in new tab
            </a>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
