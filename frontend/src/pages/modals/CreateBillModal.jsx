import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Check, UserRound, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

import { createBill, getCategories, getBillerSuggestions } from '../../api/bills';
import Modal from '../../components/Modal';
import CategoryDisplay from '../../components/CategoryDisplay';

const fieldCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';

const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';

function getCategoryLogo(cat) {
  return cat?.logo_url || null;
}

// ── Custom category picker ────────────────────────────────────────────────────

function CategoryPicker({ categories, value, onChange, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const selected = categories.find((c) => String(c.id) === String(value));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3.5 py-2.5 text-sm bg-white text-left transition-all ${
          open ? 'border-blue-400 ring-2 ring-blue-300' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2.5 min-w-0">
            {getCategoryLogo(selected) ? (
              <img
                src={getCategoryLogo(selected)}
                alt={selected.name}
                className="h-5 w-auto max-w-[56px] object-contain flex-shrink-0"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <span className="font-medium text-slate-700">{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-400">Select category…</span>
        )}
        <ChevronDown
          size={15}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Hidden native input for form validation */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.12)' }}
        >
          <div className="max-h-56 overflow-y-auto py-1.5">
            {categories.map((cat) => {
              const logo     = getCategoryLogo(cat);
              const isActive = String(cat.id) === String(value);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { onChange(cat.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Logo or dot */}
                  <span className="w-10 flex items-center justify-center flex-shrink-0">
                    {logo ? (
                      <img src={logo} alt={cat.name} className="h-5 w-auto max-w-[40px] object-contain" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                    )}
                  </span>

                  <span className={`flex-1 font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                    {cat.name}
                  </span>

                  {isActive && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
            {categories.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No categories yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Autocomplete input ────────────────────────────────────────────────────────

function AutocompleteInput({ icon: Icon, value, onChange, suggestions, placeholder, fieldCls }) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef();

  // Filter suggestions by what's typed
  const filtered = value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : [];

  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Icon size={14} />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`${fieldCls} pl-9`}
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div
          className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}
        >
          <ul className="max-h-40 overflow-y-auto py-1">
            {filtered.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => { onChange(item); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left hover:bg-blue-50 transition-colors"
                >
                  <Icon size={13} className="text-blue-400 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



export default function CreateBillModal({ onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    bill_category_id: '',
    biller_name: '',
    account_number: '',
    total_amount: '',
    due_date: '',
    notes: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Fetch biller/account suggestions when category is selected
  const { data: suggestions } = useQuery({
    queryKey: ['bill-suggestions', form.bill_category_id],
    queryFn: () => getBillerSuggestions(form.bill_category_id),
    enabled: !!form.bill_category_id,
  });

  const billerSuggestions  = suggestions?.billers  ?? [];
  const accountSuggestions = suggestions?.accounts ?? [];

  const mutation = useMutation({
    mutationFn: createBill,
    onSuccess: (bill) => {
      toast.success(`Bill created! ID: ${bill.transaction_id}`);
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['bill-stats'] });
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Failed to create bill.';
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.bill_category_id) { toast.error('Please select a category.'); return; }
    mutation.mutate(form);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Modal title="New Bill Record" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Category */}
        <div>
          <label className={labelCls}>
            Category <span className="text-red-400 normal-case tracking-normal">*</span>
          </label>
          <CategoryPicker
            categories={categories}
            value={form.bill_category_id}
            onChange={(id) => setForm((f) => ({ ...f, bill_category_id: id }))}
            required
          />
        </div>

        {/* Biller + Account */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Biller Name</label>
            <AutocompleteInput
              icon={UserRound}
              value={form.biller_name}
              onChange={(v) => setForm((f) => ({ ...f, biller_name: v }))}
              suggestions={billerSuggestions}
              placeholder="e.g. Juan dela Cruz"
              fieldCls={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Account Number</label>
            <AutocompleteInput
              icon={Hash}
              value={form.account_number}
              onChange={(v) => setForm((f) => ({ ...f, account_number: v }))}
              suggestions={accountSuggestions}
              placeholder="e.g. 1234-5678"
              fieldCls={fieldCls}
            />
          </div>
        </div>

        {/* Amount + Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Total Amount (₱) <span className="text-red-400 normal-case tracking-normal">*</span>
            </label>
            <input type="number" required min="0.01" step="0.01" placeholder="0.00"
              value={form.total_amount} onChange={set('total_amount')} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={form.due_date} onChange={set('due_date')} className={fieldCls} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea rows={3} placeholder="Optional notes or remarks…"
            value={form.notes} onChange={set('notes')} className={`${fieldCls} resize-none`} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
            {mutation.isPending ? 'Creating…' : 'Create Bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
