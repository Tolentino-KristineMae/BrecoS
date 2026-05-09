import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Reusable confirmation modal.
 *
 * Props:
 *   title       – heading text
 *   message     – body text
 *   confirmLabel – label for the confirm button (default "Delete")
 *   danger      – if true, confirm button is red (default true)
 *   icon        – optional icon component to display in the modal header
 *   onConfirm   – called when user clicks confirm
 *   onCancel    – called when user clicks cancel or backdrop
 */
export default function ConfirmModal({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  icon: Icon,
  onConfirm,
  onCancel,
}) {
  const HeaderIcon = Icon || (danger ? Trash2 : AlertTriangle);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: danger ? '#fef2f2' : '#fff7ed' }}>
            <HeaderIcon size={20} style={{ color: danger ? '#dc2626' : '#d97706' }} />
          </div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>

        {message && (
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl active:scale-95"
            style={{
              background: danger
                ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                : 'linear-gradient(135deg, #d97706, #f59e0b)',
              boxShadow: danger
                ? '0 4px 12px rgba(220,38,38,0.3)'
                : '0 4px 12px rgba(217,119,6,0.3)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
