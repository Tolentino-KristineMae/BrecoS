import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X, Tag, CreditCard, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getChannels, createChannel, updateChannel, deleteChannel,
} from '../api/bills';
import ConfirmModal from '../components/ConfirmModal';

const inputCls =
  'flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-slate-400';

// ── Category list with logo support ──────────────────────────────────────────

function CategoryList({ items = [], onCreate, onUpdate, onDelete }) {
  const [newName, setNewName]     = useState('');
  const [newLogo, setNewLogo]     = useState(null);
  const [preview, setPreview]     = useState(null);
  const [editId, setEditId]       = useState(null);
  const [editName, setEditName]   = useState('');
  const [editLogo, setEditLogo]   = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const fileRef  = useRef();
  const editRef  = useRef();

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate({ name: newName.trim(), logo: newLogo });
    setNewName(''); setNewLogo(null); setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditLogo(null);
    setEditPreview(item.logo_url ?? null);
  };
  const cancelEdit = () => { setEditId(null); setEditName(''); setEditLogo(null); setEditPreview(null); };
  const saveEdit = (id) => {
    if (!editName.trim()) return;
    onUpdate(id, { name: editName.trim(), logo: editLogo });
    cancelEdit();
  };

  const onFileChange = (e, setter, previewSetter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setter(file);
    previewSetter(URL.createObjectURL(file));
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}
    >
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #f1f5ff' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#2563eb18' }}>
          <Tag size={18} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Bill Categories</h2>
          <p className="text-xs text-slate-400 mt-0.5">Types of bills you track</p>
        </div>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#2563eb15', color: '#2563eb' }}>
          {items.length}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Add form */}
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Category name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inputCls}
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2563eb, #2563ebcc)', boxShadow: '0 3px 10px #2563eb40' }}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Logo upload row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              <ImagePlus size={13} />
              {newLogo ? 'Change logo' : 'Upload logo (optional)'}
            </button>
            {preview && (
              <div className="flex items-center gap-2">
                <img src={preview} alt="preview" className="h-7 w-auto rounded object-contain border border-slate-200" />
                <button type="button" onClick={() => { setNewLogo(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-slate-400 hover:text-red-500">
                  <X size={13} />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,.svg" className="hidden"
              onChange={(e) => onFileChange(e, setNewLogo, setPreview)} />
          </div>
        </form>

        {/* List */}
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group" style={{ background: '#f8faff' }}>
              {editId === item.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
                      className="flex-1 border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    <button onClick={() => saveEdit(item.id)} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                  {/* Edit logo */}
                  <div className="flex items-center gap-2 pl-1">
                    <button type="button" onClick={() => editRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                      <ImagePlus size={12} /> {editLogo ? 'Change' : 'Replace logo'}
                    </button>
                    {editPreview && (
                      <img src={editPreview} alt="logo" className="h-6 w-auto rounded object-contain border border-slate-200" />
                    )}
                    <input ref={editRef} type="file" accept="image/*,.svg" className="hidden"
                      onChange={(e) => onFileChange(e, setEditLogo, setEditPreview)} />
                  </div>
                </div>
              ) : (
                <>
                  {/* Logo or dot */}
                  {item.logo_url ? (
                    <img src={item.logo_url} alt={item.name} className="h-6 w-auto max-w-[60px] object-contain flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2563eb' }} />
                  )}
                  <span className="flex-1 text-sm text-slate-700 font-medium">{item.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => startEdit(item)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-slate-400 text-center py-6">No categories yet. Add one above.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ── Simple list (channels — no logo) ─────────────────────────────────────────

function SimpleList({ title, subtitle, icon: Icon, accentColor, items = [], onCreate, onUpdate, onDelete }) {
  const [newName, setNewName]   = useState('');
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };
  const saveEdit = (id) => {
    if (!editName.trim()) return;
    onUpdate(id, editName.trim());
    cancelEdit();
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e0e7ff', boxShadow: '0 2px 12px rgba(37,99,235,0.07)' }}>
      <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #f1f5ff' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accentColor + '18' }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: accentColor + '15', color: accentColor }}>
          {items.length}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <input type="text" placeholder={`Add new ${title.toLowerCase()}…`} value={newName}
            onChange={(e) => setNewName(e.target.value)} className={inputCls} />
          <button type="submit"
            className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 3px 10px ${accentColor}40` }}>
            <Plus size={14} /> Add
          </button>
        </form>

        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group" style={{ background: '#f8faff' }}>
              {editId === item.id ? (
                <>
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
                    className="flex-1 border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  <button onClick={() => saveEdit(item.id)} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center flex-shrink-0"><Check size={14} /></button>
                  <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center flex-shrink-0"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                  <span className="flex-1 text-sm text-slate-700 font-medium">{item.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => startEdit(item)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"><Trash2 size={13} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-slate-400 text-center py-6">No items yet. Add one above.</li>}
        </ul>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null); // { type: 'category'|'channel', id, label }

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: channels = [] }   = useQuery({ queryKey: ['channels'],   queryFn: getChannels });

  const createCatMut = useMutation({
    mutationFn: ({ name, logo }) => createCategory({ name, ...(logo ? { logo } : {}) }),
    onSuccess: () => { toast.success('Category added.'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const updateCatMut = useMutation({
    mutationFn: ({ id, name, logo }) => updateCategory(id, { name, ...(logo ? { logo } : {}) }),
    onSuccess: () => { toast.success('Category updated.'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const deleteCatMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { toast.success('Category deleted.'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Cannot delete — may be in use.'),
  });

  const createChMut = useMutation({
    mutationFn: (name) => createChannel({ name }),
    onSuccess: () => { toast.success('Channel added.'); qc.invalidateQueries({ queryKey: ['channels'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const updateChMut = useMutation({
    mutationFn: ({ id, name }) => updateChannel(id, { name }),
    onSuccess: () => { toast.success('Channel updated.'); qc.invalidateQueries({ queryKey: ['channels'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  });
  const deleteChMut = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => { toast.success('Channel deleted.'); qc.invalidateQueries({ queryKey: ['channels'] }); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Cannot delete — may be in use.'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage bill categories and payment channels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CategoryList
          items={categories}
          onCreate={({ name, logo }) => createCatMut.mutate({ name, logo })}
          onUpdate={(id, { name, logo }) => updateCatMut.mutate({ id, name, logo })}
          onDelete={(id) => setConfirm({ type: 'category', id, label: 'this category' })}
        />
        <SimpleList
          title="Payment Channels"
          subtitle="Where you pay your bills"
          icon={CreditCard}
          accentColor="#7c3aed"
          items={channels}
          onCreate={(name) => createChMut.mutate(name)}
          onUpdate={(id, name) => updateChMut.mutate({ id, name })}
          onDelete={(id) => setConfirm({ type: 'channel', id, label: 'this channel' })}
        />
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'category' ? 'Delete Category' : 'Delete Channel'}
          message={`Delete ${confirm.label}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            if (confirm.type === 'category') deleteCatMut.mutate(confirm.id);
            else deleteChMut.mutate(confirm.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
