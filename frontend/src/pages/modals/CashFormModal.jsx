import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X, ArrowDownCircle, ArrowUpCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

import { createCashTransaction } from '../../api/cash';
import Modal from '../../components/Modal';
import { playSuccessSound } from '../../utils/sounds';

const fieldCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';
const PRESETS  = [5, 10, 20, 30];

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
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}>
          ₱{a}
        </button>
      ))}
      {showOther ? (
        <input type="number" min="0" step="0.01" placeholder="0.00" autoFocus
          value={isOther ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 border border-blue-400 ring-1 ring-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none flex-shrink-0" />
      ) : (
        <button type="button"
          onClick={() => { setShowOther(true); onChange(''); }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap flex-shrink-0 bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600">
          Others
        </button>
      )}
    </div>
  );
}

function FileUploadArea({ label, icon: Icon, files, setFiles, maxFiles = 5, accentColor = '#2563eb' }) {
  const ref       = useRef();
  const remaining = maxFiles - files.length;

  const addFiles = (newFiles) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles).slice(0, remaining)]);
  };
  const remove = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#f8faff', border: '1px solid #e0e7ff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: accentColor }} />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs text-slate-400">{files.length}/{maxFiles}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative group flex-shrink-0">
            {f.type.startsWith('image/') ? (
              <img src={URL.createObjectURL(f)} alt=""
                className="w-14 h-14 object-cover rounded-xl border-2 border-white shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 border-white shadow-sm bg-blue-50 flex flex-col items-center justify-center gap-0.5">
                <span className="text-xs font-bold text-blue-600">PDF</span>
                <span className="text-xs text-slate-400 text-center leading-tight px-1 truncate w-full text-center">{f.name.split('.')[0].slice(0,6)}</span>
              </div>
            )}
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={9} />
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button type="button" onClick={() => ref.current?.click()}
            className="w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0"
            style={{ borderColor: accentColor + '40', color: accentColor }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = accentColor + '40'}>
            <ImagePlus size={14} />
            <span className="text-xs font-medium">{remaining}</span>
          </button>
        )}
      </div>

      <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden"
        onChange={(e) => addFiles(e.target.files)} />
    </div>
  );
}

export default function CashFormModal({ type, onClose }) {
  const qc       = useQueryClient();
  const isCashIn = type === 'cash_in';

  const [form, setForm] = useState({
    person_name: '', amount: '', fee_amount: '', deduction_amount: '', remarks: '',
  });
  const [proofs,   setProofs]   = useState([]);

  const mutation = useMutation({
    mutationFn: (data) => createCashTransaction(data),
    retry: false,
    onSuccess: (txn) => {
      // Play different sounds for cash in vs cash out
      playSuccessSound(isCashIn ? 'cash-in' : 'cash-out');
      toast.success(`${isCashIn ? 'Cash In' : 'Cash Out'} recorded! ${txn.transaction_code}`);
      qc.invalidateQueries({ queryKey: ['cash'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to save.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting cash transaction:', { ...form, type, proofs });
    console.log('Proofs array details:', proofs.map(f => ({ name: f.name, size: f.size, type: f.type })));
    mutation.mutate({ ...form, type, proofs });
  };

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const fee   = parseFloat(form.fee_amount)       || 0;
  const ded   = parseFloat(form.deduction_amount) || 0;
  const tubo  = fee - ded;
  const Icon  = isCashIn ? ArrowDownCircle : ArrowUpCircle;
  const color = isCashIn ? '#059669' : '#dc2626';
  const grad  = isCashIn
    ? 'linear-gradient(135deg, #059669, #10b981)'
    : 'linear-gradient(135deg, #dc2626, #ef4444)';

  return (
    <Modal title={isCashIn ? 'New Cash In' : 'New Cash Out'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: isCashIn ? '#ecfdf5' : '#fef2f2', border: `1px solid ${isCashIn ? '#a7f3d0' : '#fecaca'}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: grad }}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color }}>
              {isCashIn ? 'Cash In' : 'Cash Out'}
            </p>
            <p className="text-xs" style={{ color: color + 'aa' }}>
              {isCashIn ? 'Recording incoming money' : 'Recording outgoing money'}
            </p>
          </div>
        </div>

        {/* Person + Amount side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Person Name <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input type="text" required placeholder="Sender / Receiver"
              value={form.person_name} onChange={set('person_name')} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Amount (₱) <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input type="number" required min="0.01" step="0.01" placeholder="0.00"
              value={form.amount} onChange={set('amount')} className={fieldCls} />
          </div>
        </div>

        {/* Tubo tracking */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tubo Tracking</p>

          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Fee Charged (₱)</label>
              <AmountPicker value={form.fee_amount} onChange={(v) => setForm((p) => ({ ...p, fee_amount: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Deduction / Cost (₱)</label>
              <AmountPicker value={form.deduction_amount} onChange={(v) => setForm((p) => ({ ...p, deduction_amount: v }))} />
            </div>
          </div>

          {(fee > 0 || ded > 0) && (
            <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
              <span className="text-xs font-semibold text-slate-500">Net Tubo</span>
              <span className="text-sm font-extrabold px-3 py-1 rounded-xl"
                style={{ background: tubo >= 0 ? '#dcfce7' : '#fee2e2', color: tubo >= 0 ? '#15803d' : '#dc2626' }}>
                ₱{tubo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className={labelCls}>Remarks</label>
          <textarea rows={2} placeholder="Optional notes…"
            value={form.remarks} onChange={set('remarks')} className={`${fieldCls} resize-none`} />
        </div>

        {/* File upload — Proof of Transaction only during creation */}
        <FileUploadArea
          label="Proof of Transaction"
          icon={Camera}
          files={proofs}
          setFiles={setProofs}
          maxFiles={5}
          accentColor="#7c3aed"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
            style={{ background: grad, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {mutation.isPending ? 'Saving…' : `Save ${isCashIn ? 'Cash In' : 'Cash Out'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
