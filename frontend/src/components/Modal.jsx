import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, size = 'md' }) {
  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white w-full ${widths[size]} flex flex-col
          rounded-t-2xl sm:rounded-2xl
          max-h-[92vh] sm:max-h-[92vh]`}
        style={{ boxShadow: '0 25px 60px rgba(37,99,235,0.18), 0 8px 24px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-t-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }}
        >
          <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
